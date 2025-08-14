
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from ._state import USER_SETTINGS, PROMPTS

router = APIRouter()

class UserSettings(BaseModel):
    user_id: str
    llm_provider: str = Field("ollama", pattern="^(ollama|openai)$")
    llm_model: str = ""
    prompt_template_id: Optional[str] = None
    temperature: float = 0.2
    top_p: float = 0.95
    max_tokens: int = 512

@router.get("/api/settings/{user_id}", tags=["settings"], summary="Get Settings")
def get_settings(user_id: str):
    return USER_SETTINGS.setdefault(user_id, UserSettings(user_id=user_id).model_dump())

@router.patch("/api/settings/{user_id}", tags=["settings"], summary="Patch Settings")
async def patch_settings(user_id: str, patch: Dict[str, Any]):
    cur = USER_SETTINGS.setdefault(user_id, UserSettings(user_id=user_id).model_dump())
    cur.update(patch or {})
    if cur.get("llm_provider") not in ("ollama", "openai"):
        cur["llm_provider"] = "ollama"
    return cur

@router.get("/api/prompt-templates", tags=["settings"], summary="List Prompts")
def list_prompts():
    return list(PROMPTS.values())

@router.get("/api/prompt-templates/{tid}", tags=["settings"], summary="Get Prompt")
def get_prompt(tid: str):
    return PROMPTS.get(tid) or {"id": tid, "name": tid, "system": "Custom."}

@router.put("/api/prompt-templates/{tid}", tags=["settings"], summary="Put Prompt")
async def put_prompt(tid: str, payload: Dict[str, Any]):
    PROMPTS[tid] = {"id": tid, **payload}
    return {"ok": True, "id": tid}
