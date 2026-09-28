import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/gRPC packages stay out of the server bundle.
  serverExternalPackages: ["sharp", "@google-cloud/vision", "@prisma/client"],
  poweredByHeader: false,
  images: { unoptimized: true, remotePatterns: [{ protocol: "https", hostname: "images.pokemontcg.io" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
