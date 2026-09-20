import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
