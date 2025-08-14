
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from ._state import SEGS, _preview

router = APIRouter()

@router.get("/segments", summary="List Segments")
def list_segments(source: Optional[str] = None) -> List[Dict[str, Any]]:
    items = list(SEGS.values())
    if source:
        items = [s for s in items if s["source"] == source]
    return [
        {
            "id": s["id"],
            "source": s["source"],
            "preview": s.get("preview") or _preview(s.get("text","")),
            "priority": s["priority"],
        } for s in items
    ]

@router.get("/segments/{seg_id}", summary="Get Segment")
def get_segment(seg_id: str) -> Dict[str, Any]:
    seg = SEGS.get(seg_id)
    if not seg:
        raise HTTPException(404, "segment not found")
    return seg

@router.delete("/segments/{seg_id}", summary="Delete Segment")
def delete_segment(seg_id: str):
    found = SEGS.pop(seg_id, None)
    return {"ok": bool(found)}
