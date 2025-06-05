import { AuthTeam } from "../../connector/websocketIncoming";
import { IPreviewData } from "../../model/eventData";
import { SpikeStates, TimeoutStates } from "../../model/Match";
import { AvailableAbilities, AvailableAuxiliary } from "../../model/Player";
import { RecordEntry } from "../../model/Team";
import { ToolsData } from "../../model/ToolsData";
import { Agents, Armor, WeaponsAndAbilities } from "../ValorantInternalTranslator";

export class PreviewMatch {
  groupCode: string = "PREVIEW";
  isRunning: boolean = true;
  map: string = "Sunset";
  ranksEnabled: boolean = false;
  roundNumber: number = 1;
  roundPhase: string = "combat";
  spikeState: SpikeStates = { planted: false, defused: false, detonated: false };
  switchRound: number = 6;
  teams: PreviewTeam[];
  timeoutState: TimeoutStates = {
    leftTeam: false,
    rightTeam: false,
    techPause: false,
    timeRemaining: 0,
  };
  tools: ToolsData;

  public constructor(init: IPreviewData) {
    const leftTeam = new PreviewTeam(init.leftTeam);
    leftTeam.players = [
      new PreviewPlayer("Voodoo One", "Vampire"),
      new PreviewPlayer("Twoperator", "Killjoy"),
      new PreviewPlayer("ThreeOfLife", "Guide"),
      new PreviewPlayer("FourceField", "Stealth"),
      new PreviewPlayer("FIVEbyFIVE", "Smonk"),
    ];
    const rightTeam = new PreviewTeam(init.rightTeam);
    rightTeam.players = [
      new PreviewPlayer("AlpacaHoarder", "Grenadier"),
      new PreviewPlayer("BeeSting", "Terra"),
      new PreviewPlayer("CowTipper", "Sprinter"),
      new PreviewPlayer("DodoDaniel", "BountyHunter"),
      new PreviewPlayer("Eeliminator", "Mage"),
    ];
    this.teams = [leftTeam, rightTeam];
    this.tools = new ToolsData(init.toolsData);
  }
}

export class PreviewTeam {
  public teamName: string = "Spectra Team";
  public teamTricode: string = "SPTR";
  public teamUrl: string = "https://auto.valospectra.com/assets/misc/icon.webp";
  public isAttacking: boolean = false;
  public roundsWon: number = 0;
  private spentThisRound: number = 10350;
  private roundRecord: RecordEntry[] = [];

  public players: PreviewPlayer[] = [];
  private hasDuplicateAgents = false;

  constructor(team: AuthTeam) {
    this.teamName = team.name;
    this.teamTricode = team.tricode;
    this.teamUrl = team.url;

    this.isAttacking = team.attackStart;
  }
}

type ValueOf<T> = T[keyof T];
export class PreviewPlayer {
  private name: string;
  private agentInternal: string = "";

  private isAlive: boolean = true;
  private hasSpike: boolean = false;
  private isObserved: boolean = false;

  private health: number = 100;
  private abilities: AvailableAbilities = { ability1: 1, ability2: 1, grenade: 0 };

  private kills: number = getRandomInt(0, 20);
  private deaths: number = getRandomInt(0, 20);
  private assists: number = getRandomInt(0, 20);

  private currUltPoints: number = getRandomInt(0, 8);
  private maxUltPoints: number = 8;
  private ultReady: boolean = this.currUltPoints >= this.maxUltPoints;

  private money: number = getRandomInt(0, 9) * 1000;
  private moneySpent: number = getRandomInt(0, 2) * 1000;

  private armorName: (typeof Armor)[number] = Armor[0];
  private highestWeapon: ValueOf<WeaponsAndAbilities> = WeaponsAndAbilities.TX_Hud_Pistol_Luger;

  private scoreboardAvailable: boolean = false;
  private auxiliaryAvailable: AvailableAuxiliary = {
    abilities: true,
    health: true,
    scoreboard: false,
  };
  private iconNameSuffix: string = "";

  constructor(name: string, agentInternal: keyof typeof Agents) {
    this.name = name;
    this.agentInternal = agentInternal;
  }
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
