# AGENTS

This document explains the agents, their responsibilities, and how they connect from the UI down to the API and state in this repository.
The current `/demo` app is a **self-contained demo** using in-memory state; swap the internals for production backends (vector DB, file store, and real LLM provider).

## Architecture (Layers)

- **UI Windows**: `src/knowledge_web/static/app/js/windows/` → windows present: chat, docs, llm, persona, prompt, search, segments, sessions.
- **SDK**: `src/knowledge_web/static/app/js/sdk.js` centralizes fetch calls.
- **FastAPI Routers**: `demo/routes/*.py` for chat/search/ingest/segments/sessions/settings/ui.
- **In-Memory State**: `demo/routes/_state.py` seeds docs/segments/sessions/prompts.
- **Static UI Framework**: `submodules/deployable-ui` provides components and layout.
- **Templates**: `src/knowledge_web/templates/index.html` renders the app shell.

### Text Diagram

```mermaid
flowchart LR
  subgraph Browser
    W1[windows/chat.js]
    W2[windows/search.js]
    W3[windows/segments.js]
    W4[windows/sessions.js]
    W5[windows/llm.js]
    W6[windows/prompt.js]
    SDK[/app/js/sdk.js/]
  end

  subgraph FastAPI
    R1[api_chat_search.py\nGET /search\nPOST /chat, /chat-stream]
    R2[api_file_ingest.py\nPOST /upload /ingest /remove /clear_db]
    R3[api_segments.py\nGET /segments /segments/{id}]
    R4[api_sessions.py\nGET /sessions /session\nPOST /session]
    R5[api_settings.py\nGET/PUT /api/prompt-templates/*\nGET /api/settings/{user_id}]
    R6[ui_routes.py\nGET / /healthz /begin /logout /documents /user]
    STATE[State: _state.py]
  end

  W1-->|SDK|R1
  W2-->|SDK|R1
  W3-->|SDK|R2
  W3-->|SDK|R3
  W4-->|SDK|R4
  W5-->|SDK|R5
  W6-->|SDK|R5

  R1-->STATE
  R2-->STATE
  R3-->STATE
  R4-->STATE
  R5-->STATE
  R6-->STATE

  subgraph Backends (replace in prod)
    VDB[(Vector DB)]
    LLM[(LLM Provider)]
    FIL[(Blob/File Store)]
  end

  STATE-.to be swapped .->VDB
  STATE-.to be swapped .->LLM
  STATE-.to be swapped .->FIL
```

## Agent Catalog

### Chat Agent

**Purpose:** LLM-backed conversation with optional retrieval; handles /chat and /chat-stream. Stores exchanges in in-memory sessions.

**UI:** `static/app/js/windows/chat.js`
**Endpoints:** `GET /search`, `POST /chat`, `POST /chat-stream`
**Inputs:**
  - message (string)
  - session_id (string)
  - persona (string, optional)
  - template_id (string; prompt template id)
  - top_k (int; for retrieval)
  - inactive (csv of source ids to exclude)
**Outputs:**
  - reply (string)
  - stream (bool)
  - session transcript updated
**Limitations (demo):**
  - Dummy replies in demo; integrate real LLM and RAG backends in production

### Search Agent

**Purpose:** Queries the segment index for relevant chunks using simple scoring; meant to be swapped with vector search.

**UI:** `static/app/js/windows/search.js`
**Endpoints:** `GET /search`, `POST /chat`, `POST /chat-stream`
**Inputs:**
  - q (string)
  - top_k (int)
  - inactive (csv of source ids)
**Outputs:**
  - hits: [{id, source, score, preview}]
**Limitations (demo):**
  - Heuristic scoring in demo; replace with embedding/vector db in production

### Document Ingest Agent

**Purpose:** Handles uploads, ingestion queueing, and clearing the demo database.

**UI:** `static/app/js/windows/docs.js`, `static/app/js/windows/segments.js`
**Endpoints:** `POST /upload`, `POST /remove`, `POST /ingest`, `POST /clear_db`
**Inputs:**
  - files[] (multipart)
  - source (string) for remove
**Outputs:**
  - created segments (demo)
  - ingest queue ack
  - removal counts
**Limitations (demo):**
  - Segments are faked in demo; swap with real parser/chunker + embedder

### Segment Management Agent

**Purpose:** Lists, fetches, and deletes segments.

**UI:** `static/app/js/windows/segments.js`, `static/app/js/windows/search.js`
**Endpoints:** `GET /segments`, `GET /segments/{seg_id}`, `DELETE /segments/{seg_id}`
**Inputs:**
  - source (string) filter
  - seg_id
**Outputs:**
  - segments list
  - segment detail
  - delete ack
**Limitations (demo):**
  - In-memory store in demo

### Session Agent

**Purpose:** Creates and lists chat sessions; returns session transcripts.

**UI:** `static/app/js/windows/sessions.js`, `static/app/js/windows/chat.js`
**Endpoints:** `GET /sessions`, `GET /sessions/{session_id}`, `GET /session`, `POST /session`
**Inputs:**
  - session_id (string)
**Outputs:**
  - session list
  - session transcript
  - created session id
**Limitations (demo):**
  - In-memory store in demo

### Settings & Prompt Agent

**Purpose:** Persists per-user LLM provider/model, generation params, and prompt templates.

**UI:** `static/app/js/windows/llm.js`, `static/app/js/windows/persona.js`, `static/app/js/windows/prompt.js`
**Endpoints:** `GET /api/settings/{user_id}`, `GET /api/prompt-templates`, `GET /api/prompt-templates/{tid}`, `PUT /api/prompt-templates/{tid}`
**Inputs:**
  - user_id (string)
  - settings payload (json)
  - prompt template payload (json)
**Outputs:**
  - current settings
  - templates list
  - upsert ack
**Limitations (demo):**
  - In-memory store in demo

### UI Router

**Purpose:** Serves HTML templates and basic health/user/docs endpoints.

**UI:** `static/app/js/windows/index.html (shell).js`
**Endpoints:** `GET /healthz`, `GET /`, `GET /begin`, `GET /logout`, `GET /documents`, `GET /user`
**Inputs:**

**Outputs:**
  - page render
  - csrf+session id (demo)
**Limitations (demo):**
  - Ties templates via app.state.templates

## Configuration & Environment

- In demo: settings are in-memory via `/api/settings/{user_id}`.
- LLM model/provider are set via the **LLM Settings** window (stored in memory).
- Prompt templates are listed/edited via `/api/prompt-templates` endpoints.
- Production: persist settings in a DB; wire LLM keys via env or secrets.


## Code Placement & Conventions

Use these repo-native locations when adding or modifying an agent. Keep the boundaries clean so UI ⇄ SDK ⇄ API ⇄ State/Backends stay swappable.

### 1) UI (Windows)
- **Put window code here:** `src/knowledge_web/static/app/js/windows/<agent>.js`
- **Purpose:** Render controls, collect input, call SDK functions, render results.
- **Do NOT:** Call fetch directly from windows; go through the SDK.
- **Pattern:**

```js
// src/knowledge_web/static/app/js/windows/myagent.js
import { sdk } from "../sdk.js";

export function createMyAgentWindow() {
  spawnWindow({
    id: "win_myagent",
    window_type: "window_generic",
    title: "My Agent",
    unique: true,
    resizable: true,
    Elements: [
      { type: "input", id: "q", label: "Query" },
      { type: "button", label: "Run", action: "run" },
      { type: "pre", id: "out" }
    ],
    onAction: async (id, ctx) => {
      if (id !== "run") return;
      const q = ctx.getValue("q");
      const res = await sdk.myagent.run({ q });
      ctx.setText("out", JSON.stringify(res, null, 2));
    }
  });
}
```

### 2) SDK (Browser fetch layer)
- **Put endpoint helpers here:** `src/knowledge_web/static/app/js/sdk.js`
- **Purpose:** Small, composable functions for each backend route; centralizes headers, error handling, CSRF.
- **Naming:** `sdk.<agent>.<verb>` (e.g., `sdk.search.query`, `sdk.chat.stream`).
- **Pattern:**

```js
// in sdk.js
export const sdk = {
  myagent: {
    async run(payload) {
      const r = await fetch("/api/myagent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error("myagent/run failed");
      return r.json();
    }
  }
};
```

### 3) API Routers (FastAPI)
- **Put route files here:** `demo/routes/api_<agent>.py`
- **Register in:** `demo/main.py` via `app.include_router(router, prefix="")` (use a prefix if needed).
- **Purpose:** Validate inputs, orchestrate state/backends, shape responses.
- **Routing style:** Follow existing patterns (`/chat`, `/search`, `/segments`, `/api/prompt-templates`, `/api/settings/...`). For new surfaces, prefer `/api/<agent>/...`.
- **Pattern:**

```py
# demo/routes/api_myagent.py
from fastapi import APIRouter
from ._state import STATE

router = APIRouter()

@router.post("/api/myagent/run")
def myagent_run(payload: dict):
    q = payload.get("q","")
    # TODO: call real backend; demo returns echo
    return {"ok": True, "result": f"you sent: {q}"}
```

### 4) State / Backends
- **Demo-only state:** `demo/routes/_state.py` (seed data, in-memory dicts).
- **Production backends:** keep adapters in a small module folder (e.g., `src/knowledge_web/backends/`) and **call them from routers**, not from UI/SDK.
- **Guideline:** routers own orchestration; adapters own IO (LLM, vector DB, blob store).

### 5) Templates & Static
- **HTML shell:** `src/knowledge_web/templates/index.html`
- **Static app code:** `src/knowledge_web/static/app/...`
- **UI framework:** `submodules/deployable-ui` (don’t modify framework in-place; PR upstream or wrap).

### 6) Config & Secrets
- **Demo:** In-memory via `/api/settings/{user_id}`.
- **Prod:** Read from env or a secrets manager; do **not** hardcode in windows/SDK. Put config readers in Python (router layer) and pass only what’s needed to the UI.

### 7) Telemetry & Errors (recommended)
- Add a thin logger in routers; return structured errors `{ ok: false, code, message }`.
- In SDK, normalize failures to `{ ok:false, code, message }` so windows can render cleanly.

### 8) Naming & Files
- Files: `api_<agent>.py`, window `windows/<agent>.js`, SDK namespace `sdk.<agent>`.
- Endpoints: prefer `/api/<agent>/<verb>` for new agents; keep existing legacy routes as-is.
- IDs: use `session_id` (uuid v4) for chats; `source` for docs; `id` for segments.

### 9) Where *not* to put code
- Don’t talk to backends from windows; always via SDK → router.
- Don’t mutate app state in SDK; the server is source of truth.
- Don’t embed secrets in JS; read them server-side.
```


## Example Flows

### 1) Chat with Retrieval (demo)

- User types in **Assistant Chat** window.
- Frontend calls `POST /chat` (or `/chat-stream`) with `message`, `session_id`, `template_id`, and optional `top_k`.
- Backend fakes a reply and appends to `SESSIONS[session_id]`.
- UI renders streamed or full reply.

### 2) Upload → Segments → Search

- User uploads files in **Documents** window → `POST /upload`.
- Demo seeds 1–3 segments per file in `_state.py`.
- User opens **Semantic Search** → `GET /search?q=...&top_k=...`.
- Hits are displayed; clicking a hit can fetch details via `GET /segments/{id}`.

## Extending: Adding a New Agent

- Create a new UI window under `static/app/js/windows/<agent>.js` using `spawnWindow(...)`.
- Add SDK helpers in `static/app/js/sdk.js` for the new endpoints.
- Create a FastAPI router: `demo/routes/api_<agent>.py` with clear `@router.get/post/...` paths.
- Register router in `demo/main.py` using `app.include_router(...)`.
- Decide state story: short-term (in-memory `_state.py`) vs. production (DB/vector/LLM).
- Document the agent here (Purpose, Inputs, Outputs, Endpoints, Failure modes).

## Operational Notes

- `/healthz` returns `{ok:true}` for basic uptime checks.
- All demo data is ephemeral (process lifetime).
- For production, isolate components: (1) file ingest service, (2) embedding/indexer, (3) query/rerank, (4) chat orchestrator.

## Failure Modes & TODOs

- Replace heuristic search with embeddings + vector DB (e.g., Chroma/FAISS/PGVector).
- Swap demo chat with real LLM streaming; surface token/cost telemetry.
- Persist sessions and settings; add auth and per-user isolation.
- CSRF handling is stubby; finalize session + CSRF strategy for production.
- Backpressure/queueing on uploads and embeddings.
