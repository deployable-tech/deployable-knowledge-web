
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
import time, random

from ._state import DOCS, SEGS, PRIORITIES, _uuid, _preview

router = APIRouter()

@router.post("/upload", summary="Upload Files")
async def upload_files(files: List[UploadFile] = File(...)):
    out = []
    for f in files:
        content = (await f.read()).decode(errors="ignore")
        DOCS[f.filename] = {"source": f.filename, "size": len(content), "uploaded_ts": time.time()}
        # create 1-3 segments
        created = 0
        for j in range(random.randint(1,3)):
            seg_id = _uuid()
            start = j*200
            txt = content[start:start+300] or f"{f.filename} placeholder content {j}"
            SEGS[seg_id] = {
                "id": seg_id,
                "uuid": seg_id,
                "source": f.filename,
                "segment_index": j,
                "start_char": start,
                "end_char": start + len(txt),
                "priority": random.choice(PRIORITIES),
                "metadata_tags": "uploaded",
                "text": txt,
                "preview": _preview(txt),
            }
            created += 1
        out.append({"file": f.filename, "status": "ok", "segments_created": created})
    return out

@router.post("/remove", summary="Remove Document")
async def remove_document(source: str = Form(...)):
    removed = 0
    DOCS.pop(source, None)
    for k in list(SEGS.keys()):
        if SEGS[k]["source"] == source:
            del SEGS[k]
            removed += 1
    return {"removed_source": source, "segments_removed": removed}

@router.post("/ingest", summary="Ingest Documents")
def ingest_documents():
    count = len([s for s in DOCS if s.lower().endswith(".pdf")])
    return {"queued": True, "count": count}

@router.post("/clear_db", summary="Clear Db")
def clear_db():
    SEGS.clear()
    return {"ok": True}
