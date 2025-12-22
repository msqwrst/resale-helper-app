import axios from "axios";
import semver from "semver";

const POLICY_URL = "https://YOUR_DOMAIN_OR_GITHUB_RAW/policy.json";

export async function fetchUpdatePolicy() {
  const { data } = await axios.get(POLICY_URL, { timeout: 8000 });
  return data;
}

export function isForcedUpdateNeeded(currentVersion, policy) {
  if (!policy?.minVersion) return false;
  return semver.lt(currentVersion, policy.minVersion);
}
