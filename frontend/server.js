/**
 * Starts the website.
 *
 * `next start` is the normal way and is what a machine with a shell uses.
 * A hosting panel's Node application manager does not run commands: it is
 * given one file and runs it, so this is that file. It does nothing the
 * command would not do.
 *
 * The panel also chooses the port and passes it in the environment. Taking
 * it from there rather than fixing one means the panel's reverse proxy and
 * this process agree without being told about each other twice.
 */
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log(`Website listening on ${hostname}:${port}`);
    });
  })
  .catch((err) => {
    // Without this the panel shows a process that exited with no reason.
    console.error("The website failed to start:", err);
    process.exit(1);
  });
