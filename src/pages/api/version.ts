import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as systemService from "@/lib/services/system.service";
import packageJson from "../../../package.json";

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  name: string;
}

interface VersionResponse {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  releaseName: string | null;
  isDeploymentAdmin: boolean;
}

// Cache the GitHub response for 1 hour to avoid rate limiting
let cachedRelease: GitHubRelease | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function getLatestRelease(): Promise<GitHubRelease | null> {
  // SubastaYa fork: upstream version checks disabled (Auktiva releases don't apply here)
  void cachedRelease;
  void cacheTimestamp;
  void CACHE_DURATION;
  return null;
}

function compareVersions(current: string, latest: string): boolean {
  // Remove 'v' prefix if present
  const cleanCurrent = current.replace(/^v/, "");
  const cleanLatest = latest.replace(/^v/, "");

  const currentParts = cleanCurrent.split(".").map(Number);
  const latestParts = cleanLatest.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Don't show update notifications on Vercel or hosted deployments
  const isVercel = !!process.env.VERCEL;
  const isHosted = process.env.HOSTED === "true";
  if (isVercel || isHosted) {
    return res.status(200).json({
      currentVersion: packageJson.version,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      releaseName: null,
      isDeploymentAdmin: false,
    });
  }

  // Check if current user is deployment admin
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email;
  const isDeploymentAdmin = userEmail
    ? await systemService.isDeploymentAdmin(userEmail)
    : false;

  const currentVersion = packageJson.version;
  const release = await getLatestRelease();

  if (!release) {
    return res.status(200).json({
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      releaseName: null,
      isDeploymentAdmin,
    });
  }

  const latestVersion = release.tag_name;
  const updateAvailable = compareVersions(currentVersion, latestVersion);

  return res.status(200).json({
    currentVersion,
    latestVersion: latestVersion.replace(/^v/, ""),
    updateAvailable,
    releaseUrl: release.html_url,
    releaseName: release.name,
    isDeploymentAdmin,
  });
}
