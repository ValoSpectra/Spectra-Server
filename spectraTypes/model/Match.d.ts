import { IAuthedData } from "./eventData";
import { AuthTeam } from "../connector/websocketIncoming";
export declare class Match {
    private matchType;
    private switchRound;
    private firstOtRound;
    groupCode: string;
    isRanked: boolean;
    isRunning: boolean;
    roundNumber: number;
    roundPhase: string;
    private roundTimeoutTime?;
    private wasTimeout;
    private spikeDetonationTime?;
    private teams;
    private map;
    private spikeState;
    private attackersWon;
    private ranks;
    private replayLog;
    eventNumber: number;
    constructor(groupCode: string, leftTeam: AuthTeam, rightTeam: AuthTeam, isRanked?: boolean);
    receiveMatchSpecificData(data: IAuthedData): void;
    private processScoreCalculation;
    private processRoundReasons;
    private debugLogRoundInfo;
}
export interface SpikeStates {
    planted: boolean;
    detonated: boolean;
    defused: boolean;
}
