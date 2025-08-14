
# routes/_state.py — shared in-memory state + helpers for the dummy API
from typing import Dict, Any, List, Tuple, Optional
import uuid, random, time

DOCS: Dict[str, Dict[str, Any]] = {}            # source -> {source, size, uploaded_ts}
SEGS: Dict[str, Dict[str, Any]] = {}            # seg_id -> segment
SESSIONS: Dict[str, List[Tuple[str, str]]] = {} # session_id -> [(user, assistant)]
USER_ID: str = "guest-dummy"
PROMPTS = {
    "rag_chat": {"id": "rag_chat", "name": "RAG Chat", "system": "You are helpful."},
    "summary": {"id": "summary", "name": "Summarize", "system": "Summarize crisply."},
}
USER_SETTINGS: Dict[str, Dict[str, Any]] = {}
PRIORITIES = ["low", "medium", "high"]

def _uuid() -> str:
    return str(uuid.uuid4())

def _preview(txt: str, n: int = 120) -> str:
    return (txt[:n] + "…") if len(txt) > n else txt

# Seed a few documents + segments for realism
def _seed():
    if DOCS or SEGS:
        return
    for i in range(3):
        src = f"Ara_net_Riding_Birds_{i}.txt"
        DOCS[src] = {"source": src, "size": random.randint(800, 5000), "uploaded_ts": time.time()}
        for j in range(4):
            seg_id = _uuid()
            text = f"Sample segment {j} from {src}. Veyr’aani are large, flightless avian mounts used by the Ara’net. #{i}-{j}"
            SEGS[seg_id] = {
                "id": seg_id,
                "uuid": seg_id,
                "source": src,
                "segment_index": j,
                "start_char": j*200,
                "end_char": j*200 + len(text),
                "priority": random.choice(PRIORITIES),
                "metadata_tags": "uploaded",
                "text": text,
                "preview": _preview(text),
            }

_seed()
