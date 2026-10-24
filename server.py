import http.server
import socketserver
import webbrowser

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

print(f"🚀 게임 서버가 http://localhost:{PORT} 에서 시작됩니다.")
# 코드가 실행되면 자동으로 웹 브라우저를 열어줍니다.
webbrowser.open(f"http://localhost:{PORT}")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 서버가 종료되었습니다.")
