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

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/env.js'):
            # Parse .env if it exists
            env_vars = {}
            if os.path.exists('.env'):
                try:
                    with open('.env', 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                k, v = line.split('=', 1)
                                env_vars[k.strip()] = v.strip().strip('"\'')
                except Exception as e:
                    print(f"⚠️ Error reading .env: {e}")

            import json
            js_content = f"window.ENV = Object.assign(window.ENV || {{}}, {json.dumps(env_vars)});\n"
            data = js_content.encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(data)
            return

        super().do_GET()

    def end_headers(self):
        # Enable caching-free development
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try finding an open port starting from 8080
    port = PORT
    server = None
    for p in range(port, port + 20):
        try:
            server = socketserver.TCPServer(("", p), Handler)
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
