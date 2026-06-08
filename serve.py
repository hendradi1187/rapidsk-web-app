#!/usr/bin/env python3
"""Static SPA server untuk rapidsk FE (folder ./dist).

- Bind 0.0.0.0:8282 (semua interface) → akses via IP server.
- SPA fallback: route non-file (mis. /datasets, /contracts) → index.html.
- Tanpa dependensi (pakai stdlib). Override port: PORT=xxxx python3 serve.py
"""
import os
import http.server
import socketserver

PORT = int(os.environ.get("PORT", "8282"))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        rel = self.path.split("?", 1)[0].lstrip("/")
        target = os.path.join(ROOT, rel)
        if not rel or not os.path.isfile(target):
            self.path = "/index.html"  # SPA fallback
        return super().do_GET()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    if not os.path.isdir(ROOT):
        raise SystemExit(f"folder dist/ tidak ditemukan di {ROOT} — pastikan ekstrak benar")
    with Server(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"rapidsk FE serving {ROOT} on http://0.0.0.0:{PORT}")
        httpd.serve_forever()
