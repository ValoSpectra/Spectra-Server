import { Agents } from "../util/valorantInternalTranslator";

export interface IFormattedScoreboard {
    name: string,
    tagline: string,
    agentInternal: keyof typeof Agents,
    isAlive: boolean,
    initialShield: number,
    scoreboardWeaponInternal: string,
    currUltPoints: number,
    maxUltPoints: number,
    money: number,
    kills: number,
    deaths: number,
    assists: number
}

export interface IFormattedKillfeed {
    attacker: string,
    victim: string,
    weaponKillfeedInternal: string,
    headshotKill: boolean,
    assists: string[],
    isTeamkill: boolean
}

export interface IFormattedRoster {
    name: string,
    tagline: string,
    agentInternal: keyof typeof Agents,
    locked: boolean,
    rank: number,
}

export interface IAuthedData {
    playerName: string,
    teamName: string,
    groupCode: string,
    type: string,
    data: IFormattedScoreboard | IFormattedKillfeed | IFormattedRoster | boolean,
}

export enum DataTypes {
    SCOREBOARD = "scoreboard",
    KILLFEED = "killfeed",
    ROSTER = "roster",
    AUTH = "authenticate"
}

export function isAuthedData(data: object): data is IAuthedData {
    if ("playerName" in data && "teamName" in data && "groupCode" in data && "type" in data && "data" in data) {
        return true;
    }
    return false;
}