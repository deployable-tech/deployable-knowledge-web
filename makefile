# === Config (override with: make VAR=...) ===
VENV_NAME ?= venv
PYTHON    ?= python3
PIP       := $(VENV_NAME)/bin/pip
PY        := $(VENV_NAME)/bin/python
UVICORN   := $(VENV_NAME)/bin/uvicorn
APP_MODULE = demo.main:app

# Build the venv only if it doesn't exist
$(VENV_NAME)/bin/activate:
	$(PYTHON) -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip setuptools wheel

venv: $(VENV_NAME)/bin/activate

install: venv requirements.txt
	$(PIP) install -r requirements.txt

# Serve the demo
dev: install
	$(UVICORN) $(APP_MODULE) --host 127.0.0.1 --port 8002 --reload

# Basic template/static link check
smoke:
	@curl -sf http://127.0.0.1:8002/healthz >/dev/null && echo "health: OK" || (echo "health: FAIL"; exit 1)

# UI vendor helper (expects submodule + sparse already done)

.PHONY: venv install dev smoke
