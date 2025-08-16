from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Deployable Knowledge")

# Static mounts
app.mount('/static/app', StaticFiles(directory='src/knowledge_web/static/app'), name='app_static')
app.mount('/static/ui', StaticFiles(directory='submodules/deployable-ui/src/ui'), name='ui_static')

# Templates
templates = Jinja2Templates(directory='src/knowledge_web/templates')

@app.get('/', response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})
