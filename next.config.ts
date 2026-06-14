import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  allowedDevOrigins: ["192.168.31.94", "192.168.31.*"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
