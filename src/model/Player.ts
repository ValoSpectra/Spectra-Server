import { Agents, WeaponsAndAbilities, ranks } from "../util/valorantInternalTranslator";
import { IFormattedKillfeed, IFormattedRoster, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
const Log = logging("Player");

type ValueOf<T> = T[keyof T];

export class Player {
    public name: string;
    public tagline: string;
    public playerId: string;
    public searchName: string;
    
    private position: number;
    private locked: boolean = false;
    private agentInternal: string = "";
    private agentProper: ValueOf<Agents> = "";
    private rankName: string;

    public isAlive: boolean = true;
    private hasSpike: boolean = false;
    public isObserved: boolean = false;

    private kills: number = 0;
    private deaths: number = 0;
    private assists: number = 0;
    private kdRatio: number = 0;
    public killsThisRound: number = 0;

    private currUltPoints: number = 0;
    private maxUltPoints: number = 10;
    private ultReady: boolean = false;
    
    public money: number = 0;
    public moneySpent: number = 0;
    public spentMoneyThisRound: boolean = false;
    public loadoutValue: number = 0;

    private initialShield: number = 0;
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
        this.searchName = `${data.name} #${data.tagline}`;
        this.position = data.position;
        this.rankName = ranks[data.rank];
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.locked = data.locked;
    }

    public onRosterUpdate(data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.locked = data.locked;
    }

    public updateFromScoreboard(data: IFormattedScoreboard) {
        if (data.kills > this.kills) {
            this.killsThisRound++;
        }
        this.kills = data.kills;

        this.deaths = data.deaths;
        this.assists = data.assists;
        this.kdRatio = this.kills / this.deaths;

        this.currUltPoints = data.currUltPoints;
        this.maxUltPoints = data.maxUltPoints;
        this.ultReady = this.currUltPoints >= this.maxUltPoints;

        if (!this.spentMoneyThisRound && data.money < this.money) {
            this.spentMoneyThisRound = true;
        }
        if (this.spentMoneyThisRound && data.money != this.money) {
            this.moneySpent += this.money - data.money;
        }
        this.money = data.money;

        this.initialShield = Math.min(Math.max(data.initialShield * 25, 0), 50);
        this.highestWeapon = WeaponsAndAbilities[data.scoreboardWeaponInternal]

        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];

        if (!data.isAlive) {
            this.loadoutValue = 0;
        }
        this.isAlive = data.isAlive;
        this.hasSpike = data.hasSpike;
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

    public processObservedEvent(observedName: string) {
        if (this.searchName === observedName) {
            this.isObserved = true;
        } else {
            this.isObserved = false;
        }
    }
}