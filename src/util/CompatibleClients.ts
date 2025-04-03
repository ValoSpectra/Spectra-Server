import semver from "semver";

export function isCompatibleVersion(version: string): boolean {
  return semver.satisfies(version, `>=0.2.23 <0.3.0`);
}
