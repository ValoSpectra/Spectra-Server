import semver from "semver";

export function isCompatibleVersion(version: string): boolean {
  return semver.satisfies(version, `>=0.2.42 <0.2.50`);
}
