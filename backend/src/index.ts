import os from "node:os";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDirs } from "./lib/uploads.js";

ensureUploadDirs();

const app = createApp();

/** This machine's address on the local network, for testing from a handset. */
function lanAddress(): string | null {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return null;
}

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);

  // Express binds every interface, so a phone on the same wifi can reach the
  // API here — worth printing, because "localhost" is the one address that
  // will not work from a handset.
  const lan = lanAddress();
  if (lan && !env.isProduction) {
    console.log(`  from a phone on this network: http://${lan}:${env.port}`);
  }
});
