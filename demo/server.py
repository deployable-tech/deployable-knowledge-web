"""FastAPI demo server for Deployable Knowledge Web.

Serves:
  /             -> src/knowledge_web/templates/pages/index.html (Jinja2)
  /index.html   -> same as /
  /static/*     -> src/knowledge_web/static/**
"""

from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# ---------- Paths ----------
REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_KW_DIR = REPO_ROOT / "src" / "knowledge_web"

STATIC_DIR = SRC_KW_DIR / "static"
TEMPLATES_DIR = SRC_KW_DIR / "templates"
INDEX_TEMPLATE = "pages/index.html"

app = FastAPI(title="Deployable Knowledge Web Demo")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# ---------- Schemas (extracted from your examples) ----------
class SegmentListItem(BaseModel):
    id: str
    source: str
    preview: str
    priority: str = "medium"

class SegmentDetail(BaseModel):
    id: str
    text: str
    end_char: int
    uuid: str
    segment_index: int
    metadata_tags: Optional[str] = None
    start_char: int
    source: str
    priority: str = "medium"
    page: Optional[int] = None

class DocumentItem(BaseModel):
    title: str
    id: str
    segments: int

class SessionSummary(BaseModel):
    session_id: str
    title: str
    created_at: str  # ISO8601

class SessionDetail(BaseModel):
    session_id: str
    created_at: str
    summary: str
    title: str
    history: List[List[str]]

class SessionId(BaseModel):
    session_id: str

class UserInfo(BaseModel):
    user: str

# ---------- Demo Data ----------
# documents
_DOCS: List[DocumentItem] = [
    DocumentItem(title="Ara_net_Riding_Birds___Veyr_aani.txt",
                 id="Ara_net_Riding_Birds___Veyr_aani.txt",
                 segments=4),
    DocumentItem(title="Quickstart.md", id="Quickstart.md", segments=3),
]

# segments (list view)
_SEGMENT_LIST: List[SegmentListItem] = [
    SegmentListItem(
        id="8513c56c-7ffb-4497-b704-fb4ee0a2b5ad",
        source="Ara_net_Riding_Birds___Veyr_aani.txt",
        preview="Ara'net Riding Birds – Veyr’aani 🐦 GENERAL OVERVIEW...",
        priority="medium",
    ),
    SegmentListItem(
        id="c1c1a111-22b2-4333-8444-5555eeddd000",
        source="Quickstart.md",
        preview="Getting started: install, ingest, query…",
        priority="medium",
    ),
]

# segments (detail map)
_SEGMENT_DETAIL = {
    "8513c56c-7ffb-4497-b704-fb4ee0a2b5ad": SegmentDetail(
        id="8513c56c-7ffb-4497-b704-fb4ee0a2b5ad",
        text="Ara'net Riding Birds – Veyr’aani\n\n🐦 GENERAL OVERVIEW\n\nVeyr’aani are large, flightless avian mounts used exclusively by the Ara’net elves.",
        end_char=137,
        uuid="8513c56c-7ffb-4497-b704-fb4ee0a2b5ad",
        segment_index=0,
        metadata_tags="uploaded",
        start_char=0,
        source="Ara_net_Riding_Birds___Veyr_aani.txt",
        priority="medium",
        page=1,
    )
}

# sessions
_SESSIONS: List[SessionSummary] = [
    SessionSummary(
        session_id="55652660-f988-4953-ba55-5dce60ce3b4b",
        title="Here are a few options:\n\n1. \"Unmasking Valtara: Insights into the City of Masks\"",
        created_at="2025-08-11T20:07:00.357270",
    ),
    SessionSummary(
        session_id="871d7782-7b88-4a3f-b4c9-a94c9304762e",
        title="\"Uncovering Valtara: A City Guide\"",
        created_at="2025-08-11T21:18:56.233764",
    ),
]

_SESSION_DETAIL = {
    "55652660-f988-4953-ba55-5dce60ce3b4b": SessionDetail(
        session_id="55652660-f988-4953-ba55-5dce60ce3b4b",
        created_at="2025-08-11T20:07:00.357270",
        summary=(
            "Here is the updated summary:\n\n"
            "* City-state Veltara features onion-skin spiral layout, markets, masks, and Pinnacle of Trade.\n"
            "* Ilinsar high elves have a slender and refined physical appearance with long ears, varying skin tones, intricate tattoos, and elongated limbs.\n"
            "* Welcoming Ara'net elves prioritize social-emotional connections and oral-instinctive magical practices."
        ),
        title="Here are a few options:\n\n1. \"Unmasking Valtara: Insights into the City of Masks\"",
        history=[
            [
                "What can you tell me about the city of Veltara?",
                "I'd be happy to help! Based on the provided context, I can tell you that Valtara is a free and independent city-state..."
            ],
            [
                "Is there any notable aspect of the city that you could mention?",
                "According to the City Guide: Valtara — The Jewel of the West ..."
            ],
        ],
    )
}

# ---------- Web Routes ----------
@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    index_path = TEMPLATES_DIR / INDEX_TEMPLATE
    if not index_path.exists():
        return HTMLResponse(
            f"<h1>Index not found</h1><p>Expected: {index_path}</p>", status_code=500
        )
    return templates.TemplateResponse(INDEX_TEMPLATE, {"request": request})

@app.get("/index.html", response_class=HTMLResponse)
def index_alias(request: Request):
    return root(request)

@app.get("/demo")
def to_root():
    return RedirectResponse(url="/")

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "static_dir": str(STATIC_DIR),
        "templates_dir": str(TEMPLATES_DIR),
        "index_template": INDEX_TEMPLATE,
        "index_exists": (TEMPLATES_DIR / INDEX_TEMPLATE).exists(),
    }

@app.get("/healthz")
def healthz():
    return PlainTextResponse("ok")

# ---------- Demo API ----------
# /documents
@app.get("/documents", response_model=List[DocumentItem])
def list_documents():
    return _DOCS

# /segments (list)
@app.get("/segments", response_model=List[SegmentListItem])
def list_segments(source: Optional[str] = None):
    if not source:
        return _SEGMENT_LIST
    return [s for s in _SEGMENT_LIST if s.source == source]

# /segments/{id} (detail)
@app.get("/segments/{seg_id}", response_model=SegmentDetail)
def get_segment(seg_id: str):
    seg = _SEGMENT_DETAIL.get(seg_id)
    if not seg:
        raise HTTPException(status_code=404, detail="segment not found")
    return seg

# /sessions
@app.get("/sessions", response_model=List[SessionSummary])
def list_sessions():
    # Return sorted by created_at desc (cheap ISO sort)
    return sorted(_SESSIONS, key=lambda s: s.created_at, reverse=True)

# /sessions/{id}
@app.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_data(session_id: str):
    detail = _SESSION_DETAIL.get(session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail

# /session (GET: fixed demo id)
@app.get("/session", response_model=SessionId)
def get_or_create_session():
    # Return a stable demo ID each time
    return SessionId(session_id="c2b667a3-cfee-407d-9e44-ba4107618de8")

# /session (POST: mint a throwaway)
@app.post("/session", response_model=SessionId)
def create_session():
    # Fake mint: embed timestamp to look alive
    sid = f"demo-{int(datetime.utcnow().timestamp())}"
    return SessionId(session_id=sid)

# /user
@app.get("/user", response_model=UserInfo)
def get_user():
    return UserInfo(user="local-user")

# ---------- Run ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=True)
