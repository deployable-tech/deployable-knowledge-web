# server.py — Demo/dev server that mimics the real API surface
from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import json, os, secrets, base64, hmac, hashlib
from fastapi.responses import JSONResponse




from fastapi import FastAPI, APIRouter, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response as BaseResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.templating import Jinja2Templates

# --- add near the top, after existing imports/paths ---
APP_ROOT      = Path(__file__).resolve().parents[1]
REAL_TEMPLATES= APP_ROOT / "src" / "templates"
REAL_STATIC   = APP_ROOT / "src" / "static"
APP_SRC       = APP_ROOT / "src"

# Prefer vendored UI assets but fall back to submodule when available.
_UI_SUBMODULE = APP_ROOT / "submodules" / "deployable-ui" / "src" / "ui"
_UI_VENDOR    = APP_ROOT / "src" / "ui"
UI_ROOT       = _UI_SUBMODULE if (_UI_SUBMODULE / "js").exists() else _UI_VENDOR

app = FastAPI(title="Deployable Web Demo (Fake API)")


# --- mounts (keep demo mounts if you care, but these are the real ones) ---
# serve your app’s static
if REAL_STATIC.exists():
    app.mount("/static", StaticFiles(directory=REAL_STATIC), name="static")

# serve your ES modules (boot.js, sdk.js, compat layer, etc)
app.mount("/src", StaticFiles(directory=APP_SRC), name="src")

# serve the UI submodule assets
if (UI_ROOT / "js").exists():
    app.mount("/ui/js", StaticFiles(directory=UI_ROOT / "js"), name="ui_js")
if (UI_ROOT / "css").exists():
    app.mount("/ui/css", StaticFiles(directory=UI_ROOT / "css"), name="ui_css")
if (UI_ROOT / "assets").exists():
    app.mount("/ui/assets", StaticFiles(directory=UI_ROOT / "assets"), name="ui_assets")

# point Jinja at the real templates dir
templates = Jinja2Templates(directory=str(REAL_TEMPLATES))

# ---------- Minimal user-session auth & CSRF (mirrors old behavior) ----------
UTC = timezone.utc
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}

class Settings:
    idle_timeout_minutes = 15
    absolute_ttl_hours = 8
    refresh_on_activity = True
    cookie_name = "session_id"         # becomes __Host-session_id on HTTPS (not in this demo)
    csrf_cookie_name = "csrf_token"
    samesite = "Strict"
    secure_cookies = False             # demo server on http
    dev_allow_insecure_on_localhost = True
    bind_user_agent = True
    bind_ip_prefix_cidr = None

    allow_paths = {"/", "/begin", "/logout", "/docs", "/openapi.json", "/health", "/healthz", "/favicon.ico", "/documents"}
    allow_path_prefixes = {"/static", "/js", "/src", "/ui"}
    session_dir = str(APP_ROOT  / "demo_sessions")
    refresh_on_activity = False
    
def _now() -> datetime: return datetime.now(UTC)
def _b64(n=32) -> str: return base64.urlsafe_b64encode(secrets.token_bytes(n)).decode().rstrip("=")
def _hash(s: str) -> str: return hashlib.sha256((s or "").encode()).hexdigest()

def _ip_prefix(remote: Optional[str], cidr: Optional[int]) -> Optional[str]:
    if not remote or not cidr: return None
    parts = remote.split(".")
    if len(parts) != 4: return None
    keep = cidr // 8
    rest = 4 - keep
    prefix = ".".join(parts[:keep]) + (".0" * rest)
    return f"{prefix}/{cidr}"

@dataclass
class UserSession:
    session_id: str
    user_id: str
    issued_at: datetime
    expires_at: datetime
    last_seen: datetime
    ua_hash: Optional[str] = None
    ip_net: Optional[str] = None
    attrs: Dict[str, Any] = field(default_factory=dict)


class FileStore:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    def _path(self, sid: str) -> Path:
        safe = "".join(c if c.isalnum() or c in "_-" else "_" for c in sid)
        return Path(self.base_dir) / f"{safe}.json"

    def get(self, sid: str) -> Optional[UserSession]:
        p = self._path(sid)
        if not p.exists():
            return None
        data = json.loads(p.read_text())
        for k in ("issued_at", "expires_at", "last_seen"):
            data[k] = datetime.fromisoformat(data[k])
        return UserSession(**data)

    def put(self, sess: UserSession) -> None:
        p = self._path(sess.session_id)
        p.parent.mkdir(parents=True, exist_ok=True)
        data = sess.__dict__.copy()
        for k in ("issued_at", "expires_at", "last_seen"):
            data[k] = data[k].isoformat()

        # unique tmp per write to avoid races
        tmp = p.parent / f".{p.stem}.{secrets.token_hex(6)}.tmp"
        try:
            tmp.write_text(json.dumps(data))
            os.replace(tmp, p)  # atomic rename on same filesystem
        finally:
            # if another thread already replaced, tmp may not exist; ignore
            try:
                if tmp.exists():
                    tmp.unlink()
            except OSError:
                pass

class SessionManager:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.store = FileStore(settings.session_dir)

    def _cookie_name(self, request: Request) -> str:
        # In prod HTTPS you’d prefix with __Host-, demo sticks to plain name.
        return self.settings.cookie_name

    def _cookie_kwargs(self, request: Request, http_only=True) -> Dict[str, Any]:
        return {"httponly": http_only, "secure": False, "samesite": self.settings.samesite, "path": "/"}

    def issue(self, resp: Response, request: Request, user_id="local-user") -> UserSession:
        now = _now()
        sess = UserSession(
            session_id=_b64(32), user_id=user_id,
            issued_at=now, last_seen=now, expires_at=now + timedelta(hours=self.settings.absolute_ttl_hours),
            ua_hash=_hash(request.headers.get("user-agent")) if self.settings.bind_user_agent else None,
            ip_net=_ip_prefix(request.client.host if request.client else None, self.settings.bind_ip_prefix_cidr),
            attrs={"csrf": _b64(32)},
        )
        self.store.put(sess)
        resp.set_cookie(self._cookie_name(request), sess.session_id, **self._cookie_kwargs(request, True))
        resp.set_cookie(self.settings.csrf_cookie_name, sess.attrs["csrf"], **self._cookie_kwargs(request, False))
        return sess

    def fetch_valid(self, request: Request, require_csrf: bool) -> UserSession:
        sid = request.cookies.get(self._cookie_name(request))
        if not sid: raise HTTPException(status_code=401, detail="Missing session cookie.")
        sess = self.store.get(sid)
        if not sess: raise HTTPException(status_code=401, detail="Invalid session.")
        now = _now()
        if now >= sess.expires_at: 
            self.store.delete(sess.session_id)
            raise HTTPException(status_code=401, detail="Session expired.")
        idle = timedelta(minutes=self.settings.idle_timeout_minutes)
        if now - sess.last_seen > idle:
            self.store.delete(sess.session_id)
            raise HTTPException(status_code=401, detail="Session idle timeout.")
        if self.settings.bind_user_agent and sess.ua_hash:
            if not hmac.compare_digest(sess.ua_hash, _hash(request.headers.get("user-agent"))):
                raise HTTPException(status_code=401, detail="Session client binding mismatch.")
        if require_csrf and request.method not in SAFE_METHODS:
            header = request.headers.get("X-CSRF-Token")
            cookie = request.cookies.get(self.settings.csrf_cookie_name)
            expected = sess.attrs.get("csrf")
            supplied = header or cookie
            if not supplied or not expected or not hmac.compare_digest(str(supplied), str(expected)):
                raise HTTPException(status_code=403, detail="CSRF token invalid or missing.")
        if self.settings.refresh_on_activity:
            sess.last_seen = now
            self.store.put(sess)
        return sess

class SessionValidationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, manager: SessionManager, settings: Settings):
        super().__init__(app); self.manager = manager; self.settings = settings
    def _is_allowed(self, path: str) -> bool:
        return path in self.settings.allow_paths or any(path.startswith(p) for p in self.settings.allow_path_prefixes)
    async def dispatch(self, request: Request, call_next):
        if self._is_allowed(request.url.path):
            return await call_next(request)
        try:
            sess = self.manager.fetch_valid(request, require_csrf=True)
            request.state.user_id = sess.user_id
            request.state.session = sess
        except HTTPException as e:
            return JSONResponse({"detail": e.detail}, status_code=e.status_code)
        return await call_next(request)

settings = Settings()
manager  = SessionManager(settings)
app.add_middleware(SessionValidationMiddleware, manager=manager, settings=settings)
app.state.session_manager = manager
app.state.session_settings = settings

# ---------- Fake data model: sessions / documents / segments ----------
CHAT_COOKIE = "chat_session_id"  # matches old app
@dataclass
class ChatExchange: user: str; assistant: str
@dataclass
class ChatSession:
    session_id: str
    title: str = "Untitled"
    summary: str = ""
    history: List[ChatExchange] = field(default_factory=list)

class ChatStore:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir); self.base_dir.mkdir(parents=True, exist_ok=True)
    def _p(self, sid: str) -> Path: return self.base_dir / f"{sid}.json"
    def exists(self, sid: str) -> bool: return self._p(sid).exists()
    def save(self, sess: ChatSession) -> None:
        data = {"session_id": sess.session_id, "title": sess.title, "summary": sess.summary,
                "history": [[h.user, h.assistant] for h in sess.history]}
        tmp = self._p(sess.session_id).with_suffix(".tmp"); tmp.write_text(json.dumps(data)); tmp.replace(self._p(sess.session_id))
    def load(self, sid: str) -> Optional[ChatSession]:
        p = self._p(sid)
        if not p.exists(): return None
        d = json.loads(p.read_text())
        hist = [ChatExchange(u, a) for (u, a) in d.get("history", [])]
        return ChatSession(session_id=d["session_id"], title=d.get("title","Untitled"), summary=d.get("summary",""), history=hist)
    def list_sessions(self) -> List[Dict[str, Any]]:
        return [{"id": p.stem, "modified": p.stat().st_mtime} for p in self.base_dir.glob("*.json")]
    def prune_empty(self):
        for p in self.base_dir.glob("*.json"):
            try:
                d = json.loads(p.read_text())
                if not d.get("history"):
                    p.unlink()
            except Exception:
                pass
    def save(self, sess: ChatSession) -> None:
        data = {
            "session_id": sess.session_id,
            "title": sess.title,
            "summary": sess.summary,
            "history": [[h.user, h.assistant] for h in sess.history],
        }
        p = self._p(sess.session_id)
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.parent / f".{p.stem}.{secrets.token_hex(6)}.tmp"
        try:
            tmp.write_text(json.dumps(data))
            os.replace(tmp, p)
        finally:
            try:
                if tmp.exists():
                    tmp.unlink()
            except OSError:
                pass
chat_store = ChatStore(APP_ROOT  / "demo_chats")

# seed some content for docs/segments
class FakeDB:
    def __init__(self):
        self.docs: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {}  # source -> list of (text, meta)
        self.id_to_item: Dict[str, Tuple[str, str, Dict[str, Any]]] = {}  # seg_id -> (source, text, meta)
        self._seed()

    def _seed(self):
        sources = {
            "Solremel Field Manual.pdf": [
                ("Establish line-of-sight on mast…", {"source":"Solremel Field Manual.pdf", "priority":"high"}),
                ("Power-on self-test completed…", {"source":"Solremel Field Manual.pdf", "priority":"medium"}),
            ],
            "TDX-Deploy Quickstart.md": [
                ("Run diagnostics: tdx doctor …", {"source":"TDX-Deploy Quickstart.md", "priority":"low"}),
                ("Credentials are stored in …", {"source":"TDX-Deploy Quickstart.md", "priority":"medium"}),
                ("Reset the radio via …", {"source":"TDX-Deploy Quickstart.md", "priority":"medium"}),
            ],
        }
        i = 1
        for src, items in sources.items():
            for text, meta in items:
                seg_id = f"seg_{i:04d}"; i += 1
                self.id_to_item[seg_id] = (src, text, meta)
                self.docs.setdefault(src, []).append((text, meta))

    # Shapes mimic chroma .get(include=["documents","metadatas"])
    def get_all(self) -> Dict[str, Any]:
        docs, metas, ids = [], [], []
        for seg_id, (src, text, meta) in self.id_to_item.items():
            ids.append(seg_id); docs.append(text); metas.append(meta)
        return {"ids": ids, "documents": docs, "metadatas": metas}

    def get_where_source(self, source: str) -> Dict[str, Any]:
        docs, metas, ids = [], [], []
        for seg_id, (src, text, meta) in self.id_to_item.items():
            if src == source:
                ids.append(seg_id); docs.append(text); metas.append(meta)
        return {"ids": ids, "documents": docs, "metadatas": metas}

    def get_by_id(self, seg_id: str) -> Dict[str, Any]:
        if seg_id not in self.id_to_item: return {"ids": [], "documents": [], "metadatas": []}
        src, text, meta = self.id_to_item[seg_id]
        return {"ids": [seg_id], "documents": [text], "metadatas": [meta | {"source": src}]}

    def delete_id(self, seg_id: str):
        if seg_id not in self.id_to_item: raise KeyError("segment not found")
        src, text, meta = self.id_to_item.pop(seg_id)
        # also remove from docs list
        if src in self.docs:
            self.docs[src] = [(t,m) for (t,m) in self.docs[src] if t != text]

fake_db = FakeDB()

# ---------- UI routes (/ , /begin, /logout) ----------
@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    # ensure user session exists so the page can hit APIs immediately
    try:
        app.state.session_manager.fetch_valid(request, require_csrf=False)
    except HTTPException:
        resp = templates.TemplateResponse("pages/index.html", {"request": request})
        app.state.session_manager.issue(resp, request, user_id="local-user")
        return resp

    return templates.TemplateResponse("pages/index.html", {"request": request})

@app.get("/begin")
def begin(request: Request):
    resp = RedirectResponse(url="/", status_code=303)
    manager.issue(resp, request, user_id="local-user")
    return resp  # sets session_id + csrf_token cookies :contentReference[oaicite:5]{index=5}

@app.get("/logout")
def logout(request: Request):
    resp = RedirectResponse("/", status_code=303)
    # delete user-session cookies + csrf + chat-session
    for name in ("__Host-session_id", "session_id", "csrf_token", CHAT_COOKIE):
        resp.delete_cookie(name, path="/")
    return resp  # :contentReference[oaicite:6]{index=6}

@app.get("/favicon.ico")
def favicon(): return BaseResponse(status_code=204)

@app.get("/health")
def health():
    ui_js_dir = UI_ROOT / "js"
    ui_css_dir = UI_ROOT / "css"
    ui_assets_dir = UI_ROOT / "assets"
    return {
        "status": "ok",
        "templates": str(REAL_TEMPLATES),
        "static": str(REAL_STATIC),
        "ui_js_dir": str(ui_js_dir),
        "ui_css_dir": str(ui_css_dir),
        "ui_assets_dir": str(ui_assets_dir),
        "ui_js_present": ui_js_dir.exists(),
        "ui_css_present": ui_css_dir.exists(),
    }

@app.get("/healthz")
def healthz():  # matches old health route include
    return PlainTextResponse("ok")

# ---------- Documents (GET /documents) ----------

@app.get("/documents")
def list_documents():
    try:
        docs_map = getattr(fake_db, "docs", {}) or {}
        out = []
        for src, items in docs_map.items():
            try:
                count = len(items or [])
            except Exception:
                count = 0
            out.append({"title": src, "id": src, "segments": count})
        # Fallback seed so the UI never 500s during dev
        if not out:
            out = [
                {"title": "Sample Manual.pdf", "id": "Sample Manual.pdf", "segments": 2},
                {"title": "Quickstart.md", "id": "Quickstart.md", "segments": 3},
            ]
        return out
    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse({"error": f"/documents failed: {e!s}"}, status_code=500)

# ---------- Segments (/segments...) ----------
segments_router = APIRouter()

@segments_router.get("/segments")
def list_segments(source: Optional[str] = None):
    data = fake_db.get_where_source(source) if source else fake_db.get_all()
    docs = data.get("documents", []) or []
    metas = data.get("metadatas", []) or []
    ids   = data.get("ids", []) or []
    segments = []
    for doc, meta, seg_id in zip(docs, metas, ids):
        src = (meta or {}).get("source") or meta.get("source","unknown") if meta else "unknown"
        segments.append({"id": seg_id, "source": src, "preview": (doc or "")[:80], "priority": (meta or {}).get("priority","medium")})
    return JSONResponse(content=segments)  # :contentReference[oaicite:8]{index=8}

@segments_router.get("/segments/{seg_id}")
def get_segment(seg_id: str):
    data = fake_db.get_by_id(seg_id)
    docs = data.get("documents") or []
    metas = data.get("metadatas") or []
    if not docs:
        raise HTTPException(status_code=404, detail="segment not found")
    doc = docs[0]; meta = metas[0] if metas else {}
    return {"id": seg_id, "text": doc, **meta}  # :contentReference[oaicite:9]{index=9}

@segments_router.delete("/segments/{seg_id}")
def delete_segment(seg_id: str, request: Request):
    # CSRF enforced by middleware on non‑safe methods
    try:
        fake_db.delete_id(seg_id)
        return {"status": "ok"}
    except KeyError:
        raise HTTPException(status_code=404, detail="segment not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
app.include_router(segments_router)

# ---------- Sessions (/sessions, /session, /user) ----------
sessions_router = APIRouter()

def _validate_session_id(s: Optional[str]) -> Optional[str]:
    if not s: return None
    if not isinstance(s, str): return None
    if len(s) > 128: return None
    return s

@sessions_router.get("/sessions")
def list_sessions():
    # skip empty histories (match old listing behavior) :contentReference[oaicite:10]{index=10}
    chat_store.prune_empty()
    summaries = []
    for entry in chat_store.list_sessions():
        sess = chat_store.load(entry["id"])
        if not sess or not sess.history: continue
        summaries.append({
            "session_id": entry["id"],
            "title": sess.title,
            "created_at": datetime.fromtimestamp(entry["modified"]).isoformat(),
        })
    return JSONResponse(content=summaries)

@sessions_router.get("/sessions/{session_id}")
def get_session_data(session_id: str):
    session_id = _validate_session_id(session_id) or ""
    sess = chat_store.load(session_id)
    if not sess: raise HTTPException(status_code=404, detail="Session not found")
    path = chat_store._p(session_id)
    created_at = datetime.fromtimestamp(path.stat().st_mtime).isoformat() if path.exists() else None
    history_pairs = [[ex.user, ex.assistant] for ex in sess.history]
    return JSONResponse(content={
        "session_id": sess.session_id,
        "created_at": created_at,
        "summary": sess.summary,
        "title": sess.title,
        "history": history_pairs,
    })  # :contentReference[oaicite:11]{index=11}

@sessions_router.get("/session")
def get_or_create_session(request: Request):
    chat_store.prune_empty()
    sid = _validate_session_id(request.cookies.get(CHAT_COOKIE))
    sess = chat_store.load(sid) if (sid and chat_store.exists(sid)) else None
    if not sess or not sess.history:
        # Always ensure a valid chat session exists (like old code) :contentReference[oaicite:12]{index=12}
        sess = ChatSession(session_id=_b64(12))
        chat_store.save(sess)
    resp = JSONResponse({"session_id": sess.session_id})
    resp.set_cookie(key=CHAT_COOKIE, value=sess.session_id, httponly=True)
    return resp

@sessions_router.post("/session")
def create_session():
    sess = ChatSession(session_id=_b64(12))
    chat_store.save(sess)
    resp = JSONResponse({"session_id": sess.session_id})
    resp.set_cookie(key=CHAT_COOKIE, value=sess.session_id, httponly=True)
    return resp  # :contentReference[oaicite:13]{index=13}

@sessions_router.get("/user")
def get_user(request: Request):
    return {"user": getattr(request.state, "user_id", "user")}  # :contentReference[oaicite:14]{index=14}

app.include_router(sessions_router)

# ---------- Run ----------
if __name__ == "__main__":
    import uvicorn
    # Port 8001 matches your demo Makefile behavior. :contentReference[oaicite:15]{index=15}
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=True)
