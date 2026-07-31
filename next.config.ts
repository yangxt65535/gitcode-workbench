import type { NextConfig } from "next";

/** Set `GITHUB_PAGES=true` in CI so assets resolve under /gitcode-workbench/. */
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "gitcode-workbench";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(isGitHubPages
    ? {
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
      }
    : {}),
};

export default nextConfig;
