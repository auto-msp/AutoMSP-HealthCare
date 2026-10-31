import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@automsp/core"],
  poweredByHeader: false,
};

export default config;
