# deployable-knowledge-web

A barebones web application that uses the external `deployable-ui` framework. Static assets for the app live under `static/app` while the UI framework is mounted from the `deployable-ui` submodule at `static/ui`.

## Development

```bash
make dev
```

The development server runs at `http://127.0.0.1:8002/` and serves the main page from `templates/index.html`.
