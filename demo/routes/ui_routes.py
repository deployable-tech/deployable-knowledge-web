from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
import time, uuid
from ._state import USER_ID

router = APIRouter()

@router.get("/healthz", summary="Healthz")
def healthz():
    return {"ok": True, "ts": time.time()}

@router.get("/", summary="Front Door", response_class=HTMLResponse)
def front_door(request: Request, q: str = ""):
    # pull the shared Jinja2Templates off app.state (no import-from-main)
    templates = request.app.state.templates
    return templates.TemplateResponse("index.html", {"request": request, "q": q})

@router.get("/begin", summary="Begin")
def begin():
    return {"session_id": str(uuid.uuid4()), "csrf_token": str(uuid.uuid4())}

@router.get("/logout", summary="Logout")
def logout():
    return {"ok": True}

@router.get("/documents", summary="List Documents Json")
def list_documents_json():
    from ._state import DOCS
    return list(DOCS.values())

@router.get("/user", summary="Get User")
def get_user():
    return {"user_id": USER_ID}
