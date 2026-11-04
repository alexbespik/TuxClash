#!/usr/bin/env python3
"""
TUX: ROOT PURGE Launcher
Serves and automatically opens the game in your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

import json
import time
import uuid
import re
import urllib.parse
import urllib.request
import urllib.error

# --- Security ---------------------------------------------------------------------------------------------
# The Gemini key stays on this machine: the browser calls /api/gemini (same origin only) and this server adds
# the key. /env.js exposes only non-secret settings. Nothing in the folder whose name starts with '.' (such as
# .env or .git), and no Python source, is ever served as a file. The server listens on localhost only.
ALLOWED_HOSTS = {"localhost", "127.0.0.1"}
PUBLIC_ENV_KEYS = {"GEMINI_MODEL", "AI_DIRECTOR_PERSONA"}
MAX_BODY = 1_000_000
MODEL_RE = re.compile(r"^[a-z0-9][a-z0-9.\-]{1,63}$")


def read_env():
    env = {}
    if os.path.exists('.env'):
        try:
            with open('.env', 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env[k.strip()] = v.strip().strip('"\'')
        except Exception as e:
            print(f"⚠️ Error reading .env: {e}")
    return env


def gemini_key():
    key = os.environ.get("GEMINI_API_KEY") or read_env().get("GEMINI_API_KEY", "")
    return "" if not key or key == "your_gemini_api_key_here" else key

LATEST_TELEMETRY = {
    "state": {},
    "radar": {},
    "tactical": {},
    "timestamp": 0
}
PENDING_DIRECTIVES = []
DIRECTIVE_RESULTS = {}
DIRECTIVE_COUNTER = 0

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, data_dict, status_code=200):
        body = json.dumps(data_dict, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _host_ok(self):
        host = (self.headers.get('Host') or '').rsplit(':', 1)[0].strip('[]').lower()
        if host in ALLOWED_HOSTS:
            return True
        self.send_json({"error": "forbidden host"}, 403)
        return False

    def _same_origin(self):
        """Browsers send Origin on cross-site requests; only the game's own page may use the API."""
        origin = self.headers.get('Origin')
        if not origin:
            return True
        host = re.sub(r'^https?://', '', origin).rsplit(':', 1)[0].lower()
        return host in ALLOWED_HOSTS

    def _blocked_path(self):
        path = urllib.parse.unquote(self.path.split('?', 1)[0])
        parts = [p for p in path.split('/') if p]
        return any(p.startswith('.') for p in parts) or path.endswith(('.py', '.pyc'))

    def do_GET(self):
        global PENDING_DIRECTIVES, LATEST_TELEMETRY
        if not self._host_ok():
            return
        if self._blocked_path():
            self.send_error(404)
            return

        if self.path.startswith('/env.js'):
            env = read_env()
            # only harmless settings reach the browser; the key never does
            env_vars = {k: v for k, v in env.items() if k in PUBLIC_ENV_KEYS}
            env_vars["GEMINI_PROXY"] = bool(gemini_key())

            js_content = f"window.ENV = Object.assign(window.ENV || {{}}, {json.dumps(env_vars)});\n"
            data = js_content.encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path == '/api/state':
            self.send_json(LATEST_TELEMETRY.get('state', {}))
            return

        if self.path == '/api/radar':
            self.send_json(LATEST_TELEMETRY.get('radar', {}))
            return

        if self.path == '/api/tactical':
            self.send_json(LATEST_TELEMETRY.get('tactical', {}))
            return

        if self.path == '/api/directives/pending':
            items = list(PENDING_DIRECTIVES)
            PENDING_DIRECTIVES.clear()
            self.send_json({"directives": items})
            return

        super().do_GET()

    def do_POST(self):
        if not self._host_ok():
            return
        if not self._same_origin():
            self.send_json({"error": "cross-site requests are not allowed"}, 403)
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            length = 0
        if length > MAX_BODY:
            self.send_json({"error": "request too large"}, 413)
            return
        if self.path.startswith('/api/gemini'):
            self._proxy_gemini(length)
            return
        self._post_api()

    def _proxy_gemini(self, length):
        """Forwards a generateContent request to Google with the server's key, so the key never reaches the page."""
        key = gemini_key()
        if not key:
            self.send_json({"error": "No GEMINI_API_KEY in .env"}, 400)
            return
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        model = (query.get('model') or [''])[0]
        if not MODEL_RE.match(model):
            self.send_json({"error": "bad model name"}, 400)
            return
        body = self.rfile.read(length)
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=body, method='POST', headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data, status = r.read(), r.status
        except urllib.error.HTTPError as e:
            data, status = e.read(), e.code
        except Exception as e:
            self.send_json({"error": f"Gemini unreachable: {e}"}, 502)
            return
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _post_api(self):
        global PENDING_DIRECTIVES, DIRECTIVE_RESULTS, DIRECTIVE_COUNTER, LATEST_TELEMETRY

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        payload = {}
        if post_data:
            try:
                payload = json.loads(post_data.decode('utf-8'))
            except Exception:
                payload = {}

        if self.path == '/api/telemetry':
            LATEST_TELEMETRY['state'] = payload.get('state', {})
            LATEST_TELEMETRY['radar'] = payload.get('radar', {})
            LATEST_TELEMETRY['tactical'] = payload.get('tactical', {})
            LATEST_TELEMETRY['timestamp'] = payload.get('timestamp', time.time())
            self.send_json({"status": "ok"})
            return

        if self.path == '/api/directive':
            DIRECTIVE_COUNTER += 1
            dir_id = f"dir_{DIRECTIVE_COUNTER}_{int(time.time()*1000)}"
            directive = payload.get('directive', payload)
            PENDING_DIRECTIVES.append({"id": dir_id, "directive": directive})

            # Wait up to 1.8 seconds for browser response
            start_wait = time.time()
            res = None
            while time.time() - start_wait < 1.8:
                if dir_id in DIRECTIVE_RESULTS:
                    res = DIRECTIVE_RESULTS.pop(dir_id)
                    break
                time.sleep(0.05)

            if res:
                self.send_json({"id": dir_id, "status": "executed", "response": res})
            else:
                self.send_json({"id": dir_id, "status": "queued"})
            return

        if self.path == '/api/result':
            res_id = payload.get('id')
            if res_id:
                DIRECTIVE_RESULTS[res_id] = payload
            self.send_json({"status": "ok"})
            return

        self.send_json({"error": "Not Found"}, status_code=404)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try finding an open port starting from 8080
    port = PORT
    server = None
    for p in range(port, port + 20):
        try:
            class ThreadedServer(socketserver.ThreadingTCPServer):
                daemon_threads = True
                allow_reuse_address = True
            server = ThreadedServer(("127.0.0.1", p), Handler)  # localhost only
            port = p
            break
        except OSError:
            continue

    if not server:
        print("❌ Could not bind to any port between 8080 and 8100.")
        # Fallback to direct file URL
        file_path = os.path.abspath("index.html")
        print(f"Opening directly: file://{file_path}")
        webbrowser.open(f"file://{file_path}")
        return

    url = f"http://localhost:{port}/index.html"
    print("=" * 60)
    print(" 🔥 TUX: ROOT PURGE - THE OPEN SOURCE RECKONING 🔥")
    print("=" * 60)
    print(f"🎮 Game server running at: {url}")
    print("🚀 Opening in default browser... (Press Ctrl+C to stop)")
    print("=" * 60)

    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 System halted. May the Kernel be with you!")
        server.server_close()

if __name__ == '__main__':
    main()
