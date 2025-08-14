
from fastapi import APIRouter, Form
from typing import Optional, List, Dict, Any
import random

from ._state import SEGS, SESSIONS

router = APIRouter()

@router.get("/search", summary="Search")
def search(q: str, top_k: int = 5, inactive: Optional[str] = None):
    # Lightweight plausible scoring
    hits: List[Dict[str, Any]] = []
    toks = set(q.lower().split())
    for seg in SEGS.values():
        text = (seg.get("text") or "") + " " + (seg.get("preview") or "")
        base = random.random()
        boost = 0.4 if any(t in text.lower() for t in toks) else 0.0
        hits.append({
            "id": seg["id"],
            "source": seg["source"],
            "preview": seg["preview"],
            "priority": seg["priority"],
            "score": round(min(1.0, base + boost), 4),
        })
    hits.sort(key=lambda x: x["score"], reverse=True)
    return {"q": q, "results": hits[:max(1, min(20, top_k))]}

@router.post("/chat", summary="Chat")
async def chat(
    message: str = Form(...),
    session_id: str = Form(...),
    persona: str = Form(""),
    inactive: Optional[str] = Form(None),
    template_id: str = Form("rag_chat"),
    top_k: int = Form(8),
    stream: bool = False,
):
    reply = f"[{template_id}] You said: {message[:140]}. TopK={top_k}. Persona={persona or 'default'}."
    log = SESSIONS.setdefault(session_id, [])
    log.append((message, reply))
    return {"session_id": session_id, "message": message, "reply": reply}

@router.post("/chat-stream", summary="Chat Stream")
async def chat_stream(
    message: str = Form(...),
    session_id: str = Form(...),
    persona: str = Form(""),
    inactive: Optional[str] = Form(None),
    template_id: str = Form("rag_chat"),
    top_k: int = Form(8),
):
    reply = f"[stream:{template_id}] {message[:100]} …done."
    SESSIONS.setdefault(session_id, []).append((message, reply))
    return {"reply": reply, "stream": False}
