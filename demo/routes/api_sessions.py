
from fastapi import APIRouter
from ._state import SESSIONS, _uuid

router = APIRouter()

@router.get("/sessions", summary="List Sessions")
def list_sessions():
    return [{"session_id": sid, "exchanges": len(pairs)} for sid, pairs in SESSIONS.items()]

@router.get("/sessions/{session_id}", summary="Get Session Data")
def get_session_data(session_id: str):
    pairs = SESSIONS.get(session_id, [])
    return pairs  # [[user, assistant], ...]

@router.get("/session", summary="Get Or Create Session")
def get_or_create_session():
    sid = next(iter(SESSIONS.keys()), None) or _uuid()
    SESSIONS.setdefault(sid, [])
    return {"session_id": sid}

@router.post("/session", summary="Create Session")
def create_session():
    sid = _uuid()
    SESSIONS[sid] = []
    return {"session_id": sid}
