import { Player } from "./Player";
import {
  DataTypes,
  IAuthedAuxData,
  IAuthedData,
  IFormattedAbilities,
  IFormattedAuxiliary,
  IFormattedAuxScoreboardTeam,
  IFormattedKillfeed,
  IFormattedRoster,
  IFormattedScoreboard,
} from "./eventData";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
import { Agents } from "../util/ValorantInternalTranslator";
const Log = logging("Team").level(1);

type RecordType = "detonated" | "defused" | "kills" | "kills" | "timeout" | "lost" | "upcoming";

interface RecordEntry {
  type: RecordType;
  wasAttack: boolean;
  round: number;
}

export class Team {
  public teamName: string;
  public teamTricode: string;
  public teamUrl: string = "";
  public ingameTeamId: number = 0;
  public isAttacking: boolean = false;
  private hasHandledTeam: boolean = false;
  public roundsWon: number = 0;
  private spentThisRound: number = 0;
  private roundRecord: RecordEntry[] = [];

  private players: Player[] = [];
  private playerCount = 0;
  private hasDuplicateAgents = false;

  constructor(team: AuthTeam) {
    this.teamName = team.name;
    this.teamTricode = team.tricode;
    this.teamUrl = team.url;

    this.isAttacking = team.attackStart;
    this.ingameTeamId = team.attackStart ? 0 : 1;

    this.initRoundRecord();
  }

  initRoundRecord() {
    for (let i = 1; i < 11; i++) {
      this.roundRecord.push({ type: "upcoming", wasAttack: this.isAttacking, round: i });
    }
  }

  receiveTeamSpecificData(data: IAuthedData | IAuthedAuxData | IFormattedAuxiliary) {
    // Route data
    switch (data.type) {
      case DataTypes.ROSTER:
        this.processRosterData(data.data as IFormattedRoster);
        break;

      case DataTypes.SCOREBOARD:
        this.processScoreboardData(data.data as IFormattedScoreboard);
        break;

      case DataTypes.KILLFEED:
        this.processKillfeedData(data.data as IFormattedKillfeed);
        break;

      case DataTypes.AUX_SCOREBOARD:
        this.processAuxScoreboardData(data.data as IFormattedScoreboard);
        break;

      case DataTypes.AUX_ABILITIES:
        this.processAuxAbilityData(data as IFormattedAuxiliary);
        break;

      case DataTypes.AUX_HEALTH:
        this.processAuxHealthData(data as IFormattedAuxiliary);
        break;

      case DataTypes.AUX_ASTRA_TARGETING:
        this.processAuxAstraTargeting(data as IFormattedAuxiliary);
        break;

      case DataTypes.AUX_CYPHER_CAM:
        this.processAuxCypherCam(data as IFormattedAuxiliary);
        break;

      default:
        break;
    }
  }

  receiveAuxScoreboardTeamData(data: IFormattedAuxiliary) {
    // Check if data is for this team since we have to check that by player ID
    if (this.players.find((player) => player.getPlayerId() === data.playerId)) {
      const scoreboards = JSON.parse(data.data as string) as IFormattedAuxScoreboardTeam[];
      for (const playerScoreboard of scoreboards) {
        this.players
          .find((player) => player.getPlayerId() === playerScoreboard.playerId)
          ?.updateFromAuxiliaryScoreboard(playerScoreboard);
      }
    }
  }

  resetRoundSpecificValues(isSideSwitch: boolean) {
    for (const player of this.players) {
      player.resetRoundSpecificValues(isSideSwitch);
    }
  }

  getSpentThisRound(): number {
    let total = 0;
    for (const player of this.players) {
      total += player.getMoneySpent();
    }
    return total;
  }

  hasTeamMemberByName(playerName: string): boolean {
    return this.players.some((player) => player.getName() === playerName);
  }

  hasTeamMemberBySearchName(playerSearchName: string): boolean {
    return this.players.some((player) => player.getSearchName() === playerSearchName);
  }

  hasTeamMemberById(playerId: string): boolean {
    return this.players.some((player) => player.getPlayerId() === playerId);
  }

  getPlayerCount(): number {
    return this.playerCount;
  }

  findDuplicateAgents() {
    const seen: string[] = [];
    for (const player of this.players) {
      if (seen.includes(player.getAgentInternal())) {
        this.hasDuplicateAgents = true;
        break;
      }
      seen.push(player.getAgentInternal());
    }
  }

  switchSides() {
    this.isAttacking = !this.isAttacking;
  }

  setObservedPlayer(observedName: string) {
    for (const player of this.players) {
      player.processObservedEvent(observedName);
    }
  }

  private processRosterData(data: IFormattedRoster) {
    if (data.playerId == "" || data.name == "" || data.tagline == "") return;
    const correctPlayer = this.players.find((player) => player.getPlayerId() === data.playerId);

    if (correctPlayer) {
      correctPlayer.onRosterUpdate(data);
      return;
    } else if (this.playerCount < 5) {
      this.players.push(new Player(data));
      this.isAttacking = data.startTeam == 0 ? true : false;
      this.playerCount++;
    } else {
      Log.error(`Received roster data for ${data.name} but team ${this.teamName} is full!`);
    }
  }

  private processScoreboardData(data: IFormattedScoreboard) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    player.updateFromScoreboard(data);
    this.spentThisRound = this.getSpentThisRound();
  }

  private processKillfeedData(data: IFormattedKillfeed) {
    const attacker = this.players.find((player) => player.getName() === data.attacker);
    if (attacker) {
      attacker.extractKillfeedInfo(data);
      attacker.fallbackKillfeedExtraction(data);

      //cant map agent to player correctly if we have duplicate agents
      if (!this.hasDuplicateAgents) {
        for (const assistData of data.assists) {
          const assister = this.players.find(
            (player) => player.getAgentInternal() === Agents[assistData as keyof typeof Agents],
          );
          if (!assister) continue;
          assister.fallbackAssistIncrement();
        }
      }
    }

    const victim = this.players.find((player) => player.getName() === data.victim);
    if (!victim) return;
    victim.fallbackKillfeedExtraction(data, true);
  }

  private processAuxScoreboardData(data: IFormattedScoreboard) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    player.updateFromAuxiliaryScoreboard(data);
  }

  private processAuxAbilityData(data: IFormattedAuxiliary) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    const incoming = data.data as IFormattedAbilities;
    player.updateAbilities({
      grenade: incoming.grenade,
      ability1: incoming.ability_1,
      ability2: incoming.ability_2,
    });
  }

  private processAuxHealthData(data: IFormattedAuxiliary) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    if (typeof data.data != "number") return;
    player.setHeatlh(data.data);
  }

  private processAuxAstraTargeting(data: IFormattedAuxiliary) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    if (typeof data.data != "boolean") return;
    player.setAstraTargeting(data.data);
  }

  private processAuxCypherCam(data: IFormattedAuxiliary) {
    const player = this.players.find((player) => player.getPlayerId() === data.playerId);
    if (!player) return;
    if (typeof data.data != "boolean") return;
    player.setCypherCam(data.data);
  }

  private teamKills(): number {
    let count = 0;
    for (const player of this.players) {
      count += player.getKillsThisRound();
    }

    return count;
  }

  private resetTeamKills() {
    for (const player of this.players) {
      player.resetKillsThisRound();
    }
  }

  public alivePlayers(): number {
    if (this.playerCount == 0) return 1;

    let count = 0;
    for (const player of this.players) {
      if (player.checkIsAlive()) {
        count++;
      }
    }
    return count;
  }

  public addRoundReason(reason: RecordType, roundNumber: number) {
    const arrayPos = roundNumber - 1;
    this.roundRecord[arrayPos] = {
      type: reason,
      wasAttack: this.isAttacking,
      round: roundNumber,
    };

    this.roundRecord[arrayPos + 1] = {
      type: "upcoming",
      wasAttack: this.isAttacking,
      round: roundNumber + 1,
    };
  }

  public setAuxDisconnected(playerId: string): void {
    const player = this.players.find((player) => player.getPlayerId() === playerId);
    if (player) {
      player.setAuxDisconnected();
    }
  }
}
