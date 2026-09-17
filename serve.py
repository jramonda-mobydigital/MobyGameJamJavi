import functools, http.server, socketserver, os

ROOT = os.path.dirname(os.path.abspath(__file__))
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 4173), Handler) as httpd:
    print("serving", ROOT, "on http://127.0.0.1:4173")
    httpd.serve_forever()
