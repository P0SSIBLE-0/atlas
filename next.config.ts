import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy restcountries.com — no CORS headers on that domain
      {
        source: "/api/proxy/restcountries/:path*",
        destination: "https://restcountries.com/v3.1/:path*",
      },
      // Proxy Wikipedia REST v1 — 403 CORS from browser origin
      {
        source: "/api/proxy/wikipedia-rest/:path*",
        destination: "https://en.wikipedia.org/api/rest_v1/:path*",
      },
    ];
  },
};

export default nextConfig;
