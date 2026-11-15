# terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
# designed, reviewed and tested by the terra.pura team.
"""terra.pura local server: serves the site's files. Python standard library only, nothing to install.

Usage:  python serve.py [port] [--host 127.0.0.1 | 0.0.0.0]
        python serve.py              -> http://localhost:5173 (this computer only)
        python serve.py 5173 --host 0.0.0.0   -> also reachable from other devices on your network

Everything a farmer enters is stored in their own browser (localStorage); this server only sends files.
"""
import http.server, sys, functools, os, socket, threading

ROOT = os.path.dirname(os.path.abspath(__file__))
# never serve local tooling or version-control folders
_PRIVATE = [os.path.normcase(os.path.realpath(os.path.join(ROOT, p))) for p in ('.claude', '.git')]


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def blocked(self):
        # resolve the real path (handles %-encoding and case-insensitive file systems)
        real = os.path.normcase(os.path.realpath(self.translate_path(self.path)))
        return any(real == p or real.startswith(p + os.sep) for p in _PRIVATE)

    def do_GET(self):
        if self.blocked(): return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if self.blocked(): return self.send_error(404)
        return super().do_HEAD()

    def log_message(self, fmt, *args):
        if '--quiet' not in sys.argv: super().log_message(fmt, *args)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('192.0.2.1', 80))  # no packets are sent
        ip = s.getsockname()[0]; s.close(); return ip
    except OSError:
        return None


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--quiet']
    host = '127.0.0.1'
    if '--host' in args:
        i = args.index('--host'); host = args[i + 1]; del args[i:i + 2]
    port = int(args[0]) if args else 5173
    handler = functools.partial(Handler, directory=ROOT)
    server = http.server.ThreadingHTTPServer((host, port), handler)
    # also answer on the IPv6 loopback, so http://localhost works wherever localhost resolves to ::1 first
    if host in ('127.0.0.1', '0.0.0.0') and socket.has_ipv6:
        class V6(http.server.ThreadingHTTPServer): address_family = socket.AF_INET6
        try:
            v6 = V6(('::1', port), handler)
            threading.Thread(target=v6.serve_forever, daemon=True).start()
        except OSError:
            pass
    print(f'terra.pura is running at http://localhost:{port}')
    if host in ('0.0.0.0', '::'):
        ip = lan_ip()
        if ip: print(f'On your network: http://{ip}:{port}')
    print('Press Ctrl+C to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
