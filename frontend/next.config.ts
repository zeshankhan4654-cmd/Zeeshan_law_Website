/**
 * The website is built with Webpack, not Turbopack — see the `--webpack`
 * flag on the build script in package.json.
 *
 * Next 16 builds with Turbopack by default, and Turbopack needs the native
 * SWC binding. The shared host this site is deployed to has an older glibc
 * than that binding requires (it asks for GLIBC_2.29 and does not find it),
 * so Next falls back to the WebAssembly build — which Turbopack refuses to
 * run on, stopping the deployment outright.
 *
 * Webpack is slower and produces the same site. Do not remove the flag
 * without checking that the deployment host can load the native binding;
 * it builds fine on a developer machine either way, and the failure only
 * appears on the server.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Build the pages in this process, rather than farming them out.
   *
   * Next generates static pages across a pool of child processes, one per
   * CPU. Shared hosting caps how many processes an account may run at once,
   * and the cap is well below the core count the machine reports — so the
   * build compiled successfully, finished type-checking, and then died on
   * `spawn ... EAGAIN`, which is the kernel refusing a new process, not an
   * error in the site.
   *
   * One worker and no worker threads keeps the whole build inside the
   * process already running. It is slower, and it is the difference between
   * a site that deploys and one that does not.
   */
  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  async headers() {
    return [
      {
        /**
         * Apple reads this file to decide whether this site may hand its
         * links to the app, and it refuses anything not served as JSON.
         * The file has no extension — Apple requires that exact name — so
         * Next guesses `application/octet-stream` and iOS silently ignores
         * it. The link then opens in the browser and nothing says why.
         */
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
