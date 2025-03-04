import { AuthTeam } from "../connector/websocketIncoming";
import { Agents, WeaponsAndAbilities } from "../util/valorantInternalTranslator";
import { ToolsData } from "./ToolsData";

export interface IFormattedScoreboard {
  name: string;
  tagline: string;
  playerId: string;
  startTeam: number;
  agentInternal: keyof typeof Agents;
  isAlive: boolean;
  initialArmor: number;
  scoreboardWeaponInternal: keyof typeof WeaponsAndAbilities;
  currUltPoints: number;
  maxUltPoints: number;
  hasSpike: boolean;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface IFormattedKillfeed {
  attacker: string;
  victim: string;
  weaponKillfeedInternal: keyof typeof WeaponsAndAbilities;
  headshotKill: boolean;
  assists: string[];
  isTeamkill: boolean;
}

export interface IFormattedRoster {
  name: string;
  tagline: string;
  startTeam: number;
  agentInternal: keyof typeof Agents;
  playerId: string;
  position: number;
  locked: boolean;
  rank: number;
}

export interface IFormattedRoundInfo {
  roundPhase: string;
  roundNumber: number;
}

export interface IFormattedScore {
  team_0: number;
  team_1: number;
}

export interface IFormattedAuxiliary {
  type:
    | DataTypes.AUX_SCOREBOARD
    | DataTypes.AUX_ABILITIES
    | DataTypes.AUX_HEALTH
    | DataTypes.AUX_ASTRA_TARGETING;
  playerId: string;
  groupCode: string;
  data: IFormattedScoreboard | IFormattedAbilities | number | boolean;
}

export interface IAuthedData {
  obsName: string;
  groupCode: string;
  type: string;
  timestamp: number;
  data:
    | IFormattedScoreboard
    | IFormattedKillfeed
    | IFormattedRoster
    | IFormattedRoundInfo
    | IFormattedScore
    | IFormattedAuxiliary
    | boolean
    | string
    | number;
}

export interface IAuthedAuxData {
  playerId: string;
  groupCode: string;
  type: string;
  timestamp: number;
  data: IFormattedAuxiliary | number;
}

export interface IFormattedAbilities {
  grenade: number;
  ability_1: number;
  ability_2: number;
}

export interface IFormattedData {
  type: string;
  data:
    | IFormattedScoreboard
    | IFormattedKillfeed
    | IFormattedRoster
    | IFormattedRoundInfo
    | IFormattedScore
    | IFormattedAbilities
    | boolean;
}

export interface IAuthenticationData {
  type: DataTypes.AUTH;
  clientVersion: string;
  obsName: string;
  key: string;
  groupCode: string;
  leftTeam: AuthTeam;
  rightTeam: AuthTeam;
  toolsData: ToolsData;
  // organizationId added later, not in client
  organizationId?: string;
}

export interface IAuxAuthenticationData {
  type: DataTypes.AUX_AUTH;
  clientVersion: string;
  name: string;
  matchId: string;
  playerId: string;
}

export enum DataTypes {
  SCOREBOARD = "scoreboard",
  KILLFEED = "killfeed",
  ROSTER = "roster",
  MATCH_START = "match_start",
  ROUND_INFO = "round_info",
  TEAM_IS_ATTACKER = "team_is_attacker",
  SCORE = "score",
  GAME_MODE = "game_mode",
  MAP = "map",
  OBSERVING = "observing",
  SPIKE_PLANTED = "spike_planted",
  SPIKE_DETONATED = "spike_detonated",
  SPIKE_DEFUSED = "spike_defused",
  AUTH = "authenticate",
  AUX_AUTH = "aux_authenticate",
  AUX_ABILITIES = "aux_abilities",
  AUX_HEALTH = "aux_health",
  AUX_SCOREBOARD = "aux_scoreboard",
  AUX_ASTRA_TARGETING = "aux_astra_targeting",
}

export function isAuthedData(data: object): data is IAuthedData | IAuthedAuxData {
  if (
    ("obsName" in data || "playerId" in data) &&
    "groupCode" in data &&
    "type" in data &&
    "data" in data
  ) {
    return true;
  }
  return false;
}
