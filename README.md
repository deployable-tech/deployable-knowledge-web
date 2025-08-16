# deployable-knowledge-web

## LLM Services & Models

The web UI includes a manager for Large Language Model services and models. Open it from
**Menu ▾ → LLM Settings** or press the registered shortcut (Ctrl+M if supported).

From the manager you can:

- Create, edit, or delete LLM services and models.
- Enable/disable services.
- Choose the active service/model pair via the selector in the top-right.

The current selection is stored in `localStorage` under `llm.selection`. A lightweight
mock adapter (enabled by default) persists services and models in `localStorage` as
`llm.services` and `llm.models`. To disable the mock layer set `localStorage['llm.mock'] = 'false'` and reload.

Chat requests automatically include the active `service_id` and `model_id`.
