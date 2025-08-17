#!/usr/bin/env python3
import os, argparse
from urllib.parse import urlsplit, unquote
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

def _safe_join(root, rel):
    # prevent .. escapes
    rel = os.path.normpath(rel).lstrip(os.sep)
    path = os.path.join(root, rel)
    if not os.path.commonpath([os.path.abspath(path), os.path.abspath(root)]) == os.path.abspath(root):
        return root  # fallback to root on traversal attempt
    return path

class DualRootHandler(SimpleHTTPRequestHandler):
    HTML_ROOT = ""
    STATIC_ROOT = ""
    UI_ROOT = ""

    def translate_path(self, path):
        # normalize request path
        path = unquote(urlsplit(path).path)

        # default document
        if path in ("", "/"):
            return _safe_join(self.HTML_ROOT, "index.html")

        # Specific mount: /static/ui/*  -> UI_ROOT
        if path.startswith("/static/ui/"):
            rel = path[len("/static/ui/"):]
            return _safe_join(self.UI_ROOT, rel)

        # General static: /static/*     -> STATIC_ROOT
        if path.startswith("/static/"):
            rel = path[len("/static/"):]
            return _safe_join(self.STATIC_ROOT, rel)

        # Everything else                -> HTML_ROOT
        return _safe_join(self.HTML_ROOT, path.lstrip("/"))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", "-p", type=int, default=8000)
    ap.add_argument("--html", default="src/template")
    ap.add_argument("--static", default="src/static")
    ap.add_argument("--ui", default="submodules/deployable-ui/src/ui")
    args = ap.parse_args()

    DualRootHandler.HTML_ROOT = os.path.abspath(args.html)
    DualRootHandler.STATIC_ROOT = os.path.abspath(args.static)
    DualRootHandler.UI_ROOT = os.path.abspath(args.ui)

    srv = ThreadingHTTPServer(("0.0.0.0", args.port), DualRootHandler)
    print(f"Serving:\n  /            -> {DualRootHandler.HTML_ROOT}\n  /static/     -> {DualRootHandler.STATIC_ROOT}\n  /static/ui/  -> {DualRootHandler.UI_ROOT}\nOn port {args.port}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()

if __name__ == "__main__":
    main()
