"""
Local server for the FishWise SG prototype.

    python serve.py            -> http://localhost:5173
    python serve.py 8080       -> http://localhost:8080

Same as `python -m http.server`, but tells the browser not to cache files,
so edits to the JavaScript modules show up on a normal refresh.
"""

import http.server
import os
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Keep-alive with Content-Length. With HTTP/1.0 the server closes each
    # socket straight after writing, and on Windows that can reset the
    # connection before the browser has read a large file (theme.css).
    protocol_version = "HTTP/1.1"

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # Browsers open many connections at once for ES modules; a deeper
    # backlog avoids "connection reset" on the first load.
    request_queue_size = 128
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"FishWise SG running at {url}  (Ctrl+C to stop)")
        if "--no-browser" not in sys.argv:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
