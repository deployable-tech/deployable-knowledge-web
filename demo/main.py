from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from demo.routes.ui_routes import router as ui_router
from demo.routes.api_chat_search import router as chat_router
from demo.routes.api_file_ingest import router as ingest_router
from demo.routes.api_segments import router as segments_router
from demo.routes.api_sessions import router as sessions_router
from demo.routes.api_settings import router as settings_router

app = FastAPI(title="Dummy Deployable Knowledge API (modular)")

# Static mounts
app.mount("/static/app", StaticFiles(directory="src/knowledge_web/static/app"), name="app_static")
app.mount("/static/ui",  StaticFiles(directory="submodules/deployable-ui/src/ui"), name="ui_static")

# Templates
templates = Jinja2Templates(directory="src/knowledge_web/templates")
app.state.templates = templates  # <-- expose via app.state

# Routers
app.include_router(ui_router)
app.include_router(chat_router)
app.include_router(ingest_router)
app.include_router(segments_router)
app.include_router(sessions_router)
app.include_router(settings_router)
