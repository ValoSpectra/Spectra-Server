import { Agents, WeaponsAndAbilities, ranks } from "../util/valorantInternalTranslator";
import { IFormattedKillfeed, IFormattedRoster, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
const Log = logging("Player");

type ValueOf<T> = T[keyof T];

export class Player {
    public name: string;
    public tagline: string;
    public playerId: string;
    
    private position: number;
    private locked: boolean = false;
    private agentInternal: string = "";
    private agentProper: ValueOf<Agents> = "";
    private rankName: string;

    private isAlive: boolean = true;

    private kills: number = 0;
    private deaths: number = 0;
    private assists: number = 0;
    private kdRatio: number = 0;

    private currUltPoints: number = 0;
    private maxUltPoints: number = 999;
    private ultReady: boolean = false;
    
    private initialShield: number = 0;
    private money: number = 0;
    private highestWeapon: ValueOf<WeaponsAndAbilities> = WeaponsAndAbilities["knife"];

    // Data extrapolated from Killfeed
    private teamkills: number = 0;
    private headshotkills: number = 0;
    private headshotRatio: number = 0;

    private killsByWeaponsAndAbilities: Record<string, number> = {};
    private killsOnEnemyPlayer: Record<string, number> = {};
    private killsOnTeammatePlayer: Record<string, number> = {};
    private assistsFromTeammate: Record<string, number> = {};

    constructor (data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.playerId = data.playerId;
        this.position = data.position;
        this.rankName = ranks[data.rank];
    }

    public onRosterUpdate(data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.locked = data.locked;
    }

    public updateFromScoreboard(data: IFormattedScoreboard) {
        this.kills = data.kills;
        this.deaths = data.deaths;
        this.assists = data.assists;
        this.kdRatio = this.kills / this.deaths;

        this.currUltPoints = data.currUltPoints;
        this.maxUltPoints = data.maxUltPoints;
        this.ultReady = this.currUltPoints >= this.maxUltPoints;

        this.money = data.money;
        this.initialShield = data.initialShield * 25;
        this.highestWeapon = WeaponsAndAbilities[data.scoreboardWeaponInternal]

        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.isAlive = data.isAlive;
    }

    public extractKillfeedInfo(data: IFormattedKillfeed) {

        // Store kills by weapon/ability
        let existing: number = this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal];
        if (existing) {
            this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal] = existing++;
        } else {
            this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal] = 1;
        }

        // Store headshot data
        if (data.headshotKill == true) {
            this.headshotkills++;
            this.headshotRatio = this.headshotkills / this.kills;
        }

        // Store teamkill data
        if (data.isTeamkill == true) {
            this.teamkills++;
            let existing: number = this.killsOnTeammatePlayer[data.victim];
            if (existing) {
                this.killsOnTeammatePlayer[data.victim] = existing++;
            } else {
                this.killsOnTeammatePlayer[data.victim] = 1;
            }
        }

        // Store how often we killed which enemy
        if (data.isTeamkill == false) {
            let existing: number = this.killsOnEnemyPlayer[data.victim];
            if (existing) {
                this.killsOnEnemyPlayer[data.victim] = existing++;
            } else {
                this.killsOnEnemyPlayer[data.victim] = 1;
            }
        }

        // Store how often we got assisted by which teammate
        if (data.assists.length > 0) {
            for (const assister of data.assists) {
                let existing: number = this.assistsFromTeammate[assister];
                if (existing) {
                    this.assistsFromTeammate[assister] = existing++;
                } else {
                    this.assistsFromTeammate[assister] = 1;
                }
            }
        }

    }
}