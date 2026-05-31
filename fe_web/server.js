const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT ?? 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const rawUrl = decodeURIComponent(request.url.split("?")[0]);
  const urlPath = rawUrl === "/" ? "/fe_web/index.html" : rawUrl;
  let filePath = path.join(root, urlPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");

    fs.readFile(filePath, (readError, body) => {
      if (readError) {
        response.writeHead(500);
        response.end("Read error");
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
      });
      response.end(body);
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving http://127.0.0.1:${port}/fe_web/`);
});
