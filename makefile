# === Config (override with: make VAR=...) ===
VENV_NAME ?= venv
PYTHON    ?= python3
PIP       := $(VENV_NAME)/bin/pip
PY        := $(VENV_NAME)/bin/python
UVICORN   := $(VENV_NAME)/bin/uvicorn
APP_MODULE = demo.server:app

# Build the venv only if it doesn't exist
$(VENV_NAME)/bin/activate:
	$(PYTHON) -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip setuptools wheel

venv: $(VENV_NAME)/bin/activate

install: venv requirements.txt
	$(PIP) install -r requirements.txt

# Serve the demo
dev: install
	$(UVICORN) $(APP_MODULE) --host 127.0.0.1 --port 8001 --reload

# Basic template/static link check
smoke:
	@curl -sf http://127.0.0.1:8001/health >/dev/null && echo "health: OK" || (echo "health: FAIL"; exit 1)

# UI vendor helper (expects submodule + sparse already done)
ui-vendor:
	@rm -rf src/knowledge_web/static/ui
	@mkdir -p src/knowledge_web/static/ui
	@rsync -a --delete submodules/deployable-ui/src/ui/ src/knowledge_web/static/ui/
	@echo "UI vendored to src/knowledge_web/static/ui"

.PHONY: venv install dev smoke ui-vendor
