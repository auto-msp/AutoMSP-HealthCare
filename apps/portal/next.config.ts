import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@automsp/core", "@automsp/gateway"],
  poweredByHeader: false,
};

export default config;
