import { Agents, Armor, WeaponsAndAbilities } from "../util/ValorantInternalTranslator";
import {
  IFormattedAuxScoreboardTeam,
  IFormattedKillfeed,
  IFormattedRoster,
  IFormattedScoreboard,
} from "./eventData";
import logging from "../util/Logging";
import { IconNameSuffixes } from "../util/AgentProperties";

const Log = logging("Player").level(1);

type ValueOf<T> = T[keyof T];

export class AvailableAbilities {
  grenade: number = 0;
  ability1: number = 0;
  ability2: number = 0;
}

class AvailableAuxiliary {
  health: boolean = false;
  abilities: boolean = false;
  scoreboard: boolean = false;
}

export class Player {
  private name: string;
  private tagline: string;
  private riotId: string;
  private searchName: string;

  private position: number;
  private locked: boolean = false;
  private agentInternal: string = "";
  private agentProper: ValueOf<Agents> = "";

  private isAlive: boolean = true;
  private hasSpike: boolean = false;
  private isObserved: boolean = false;

  private health: number = 100;
  private abilities: AvailableAbilities = new AvailableAbilities();

  private kills: number = 0;
  private deaths: number = 0;
  private assists: number = 0;
  private kdRatio: number = 0;
  private killsThisRound: number = 0;

  private currUltPoints: number = 0;
  private maxUltPoints: number = 0;
  private ultReady: boolean = false;

  private money: number = 0;
  private moneySpent: number = 0;
  private spentMoneyThisRound: boolean = false;

  private armorName: (typeof Armor)[number] = Armor[0];
  private highestWeapon: ValueOf<WeaponsAndAbilities> = WeaponsAndAbilities["unknown"];

  // Data extrapolated from Killfeed
  private teamKills: number = 0;
  private headshotKills: number = 0;
  private headshotRatio: number = 0;

  private killsByWeaponsAndAbilities: Record<string, number> = {};
  private killsOnEnemyPlayer: Record<string, number> = {};
  private killsOnTeammatePlayer: Record<string, number> = {};
  private assistsFromTeammate: Record<string, number> = {};

  private scoreboardAvailable: boolean = false;
  private auxiliaryAvailable: AvailableAuxiliary = new AvailableAuxiliary();
  private iconNameSuffix: string = "";

  constructor(data: IFormattedRoster) {
    this.name = data.name;
    this.tagline = data.tagline;
    this.riotId = data.playerId;
    this.searchName = `${data.name} #${data.tagline}`;
    this.position = data.position;
    this.agentInternal = data.agentInternal;
    this.agentProper = Agents[data.agentInternal] || data.agentInternal;
    this.locked = data.locked;
  }

  public onRosterUpdate(data: IFormattedRoster) {
    this.name = data.name;
    this.tagline = data.tagline;
    this.agentInternal = data.agentInternal;
    this.agentProper = Agents[data.agentInternal] || data.agentInternal;
    this.locked = data.locked;
  }

  public updateFromScoreboard(data: IFormattedScoreboard) {
    this._updateSharedScoreboardData(data);

    this.scoreboardAvailable = true;
  }

  // Only take partial data from aux scoreboard, still get rest from observer
  public updateFromAuxiliaryScoreboard(data: IFormattedScoreboard | IFormattedAuxScoreboardTeam) {
    if (this.scoreboardAvailable) return;

    this._updateSharedScoreboardData(data);

    this.auxiliaryAvailable.scoreboard = true;
  }

  private _updateSharedScoreboardData(data: IFormattedScoreboard | IFormattedAuxScoreboardTeam) {
    if (data.kills > this.kills) {
      this.killsThisRound++;
    }
    this.agentInternal = data.agentInternal;
    this.agentProper = Agents[data.agentInternal] || data.agentInternal;

    this.runAgentSpecificScoreboardChecks(data);

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

    this.armorName = Armor[data.initialArmor];
    this.highestWeapon = WeaponsAndAbilities[data.scoreboardWeaponInternal];

    // Player dies
    if (!data.isAlive && this.isAlive) {
      this.runAgentSpecificDeathChecks();
      this.health = 0;
    }
    // Player revives
    if (data.isAlive && !this.isAlive) {
      this.health = 100;
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
      this.headshotKills++;
      this.headshotRatio = this.headshotKills / this.kills;
    }

    // Store teamkill data
    if (data.isTeamkill == true) {
      this.teamKills++;
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
  }

  public fallbackKillfeedExtraction(data: IFormattedKillfeed, victim: boolean = false) {
    if (this.scoreboardAvailable || this.auxiliaryAvailable.scoreboard) return;

    if (victim) {
      this.isAlive = false;
      this.health = 0;
      this.deaths++;
    } else {
      // The teamkill field is unreliable at the moment, so we're not using it for fallbacks
      this.runAgentSpecificScoreboardChecks({ kills: this.kills + 1 });
      this.kills++;
      this.killsThisRound++;
    }
  }

  public fallbackAssistIncrement() {
    if (this.scoreboardAvailable || this.auxiliaryAvailable.scoreboard) return;
    this.runAgentSpecificScoreboardChecks({ assists: this.assists + 1 });
    this.assists++;
  }

  public processObservedEvent(observedName: string) {
    if (this.searchName == observedName) {
      this.isObserved = true;
    } else {
      this.isObserved = false;
    }
  }

  public updateAbilities(data: AvailableAbilities) {
    this.abilities = data;
    this.auxiliaryAvailable.abilities = true;
  }

  public setHeatlh(health: number) {
    this.health = health;
    this.auxiliaryAvailable.health = true;
  }

  public resetRoundSpecificValues(isSideSwitch: boolean) {
    this.resetKillsThisRound();
    this.resetMoneyThisRound();

    if (isSideSwitch) {
      this.money = 800;
    }

    this.scoreboardAvailable = false;
    this.auxiliaryAvailable.scoreboard = false;
    this.isAlive = true;
    this.health = 100;
  }

  public getName(): string {
    return this.name;
  }

  public getSearchName(): string {
    return this.searchName;
  }

  public getPlayerId(): string {
    return this.riotId;
  }

  public getAgentInternal(): string {
    return this.agentInternal;
  }

  public checkIsAlive(): boolean {
    return this.isAlive;
  }

  public getMoneySpent(): number {
    return this.moneySpent;
  }

  public getKillsThisRound(): number {
    return this.killsThisRound;
  }

  public resetKillsThisRound(): void {
    this.killsThisRound = 0;
  }

  public resetMoneyThisRound(): void {
    this.moneySpent = 0;
    this.spentMoneyThisRound = false;
  }

  public setAuxDisconnected() {
    this.auxiliaryAvailable = new AvailableAuxiliary();
    Log.info(`Auxiliary data for ${this.name} has been disconnected`);
  }

  //#region Agent Specific Code
  private setIconNameSuffix(suffix: string) {
    this.iconNameSuffix = suffix;
  }

  private resetIconNameSuffix() {
    this.iconNameSuffix = "";
  }

  private runAgentSpecificScoreboardChecks(
    data: Partial<IFormattedScoreboard | IFormattedAuxScoreboardTeam>,
  ) {
    switch (this.agentProper) {
      case Agents.Smonk:
        this.cloveSpecificChecks(data);
        break;
      default:
        break;
    }
  }

  private runAgentSpecificDeathChecks() {
    switch (this.agentProper) {
      case Agents.Rift:
      case Agents.Smonk:
        this.resetIconNameSuffix();
        break;
      default:
        break;
    }
  }

  private cloveSpecificChecks(data: Partial<IFormattedScoreboard | IFormattedAuxScoreboardTeam>) {
    // Clove using up all their ult points revives them with a timer on kills, set suffix for representative icon
    if (data.currUltPoints == 0 && this.ultReady) {
      this.setIconNameSuffix(IconNameSuffixes.CLOVE_ULTIMATE);
    }

    // If Clove gets a kill, reset the icon name suffix (since they might be in Ult)
    if (data.kills && data.kills > this.kills) {
      this.resetIconNameSuffix();
    }

    // If Clove gets a damaging assist, reset the icon name suffix
    // Yes we don't know if the assist was damaging, but we're assuming it is since it's very very likely
    if (data.assists && data.assists > this.assists) {
      this.resetIconNameSuffix();
    }
  }

  public setAstraTargeting(data: boolean) {
    if (this.agentProper === Agents.Rift) {
      if (data) {
        this.setIconNameSuffix(IconNameSuffixes.ASTRA_TARGETING);
      } else {
        this.resetIconNameSuffix();
      }
    }
  }

  public setCypherCam(data: boolean) {
    if (this.agentProper === Agents.Gumshoe) {
      if (data) {
        this.setIconNameSuffix(IconNameSuffixes.CYPHER_CAM);
      } else {
        this.resetIconNameSuffix();
      }
    }
  }
  //#endregion
}
