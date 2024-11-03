import semver from 'semver';
var pkginfo = require('pkginfo')(module, 'version');

export function isCompatibleVersion(version: string): boolean {
    return semver.satisfies(version, `>=0.2.3 <0.3.0`);
};