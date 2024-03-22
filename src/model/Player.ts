import { Agents, WeaponsAndAbilities, ranks } from "../util/valorantInternalTranslator";
import { IFormattedKillfeed, IFormattedRoster, IFormattedScoreboard } from "./eventData";

type ValueOf<T> = T[keyof T];

export class Player {
    public name: string;
    public tagline: string;
    private agentInternal: string;
    public agentProper: ValueOf<Agents>;
    public rankName: string;

    public isAlive: boolean = true;

    public kills: number = 0;
    public deaths: number = 0;
    public assists: number = 0;
    public kdRatio: number = 0;

    public currUltPoints: number = 0;
    public maxUltPoints: number = 999;
    public ultReady: boolean = false;
    
    public initialShield: number = 0;
    public money: number = 0;
    public highestWeapon: ValueOf<WeaponsAndAbilities> = WeaponsAndAbilities["knife"];

    // Data extrapolated from Killfeed
    public teamkills: number = 0;
    public headshotkills: number = 0;
    public headshotRatio: number = 0;

    public killsByWeaponsAndAbilities: Record<string, number> = {};
    public killsOnEnemyPlayer: Record<string, number> = {};
    public killsOnTeammatePlayer: Record<string, number> = {};
    public assistsFromTeammate: Record<string, number> = {};

    constructor (data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.rankName = ranks[data.rank];
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