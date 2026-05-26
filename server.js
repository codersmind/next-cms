/**
 * Production Node server for Next-CMS.
 * Run: npm run build && npm start
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { ensureRuntimeDirs } = require("./lib/ensure-runtime-dirs");

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const { uploadDir, pluginsDir } = ensureRuntimeDirs();
console.log(`> Upload dir: ${uploadDir}`);
console.log(`> Plugins dir: ${pluginsDir}`);

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling", req.url, err);
        res.statusCode = 500;
        res.end("Internal server error");
      }
    }).listen(port, hostname, () => {
      console.log(
        `> Next-CMS ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port} (${dev ? "development" : "production"})`
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
