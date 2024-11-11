import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  optimizePackageImports: ["@chakra-ui/react"],
  devtool: 'source-map'
};

export default nextConfig;
