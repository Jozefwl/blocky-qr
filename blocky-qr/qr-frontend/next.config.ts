import type { NextConfig } from "next";

const apiOrigin =
  process.env.BLOCKY_API_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/blocky-api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
