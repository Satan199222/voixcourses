import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
