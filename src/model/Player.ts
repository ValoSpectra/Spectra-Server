import { Agents, ranks } from "../util/valorantInternalTranslator";
import { IFormattedRoster } from "./eventData";

type ValueOf<T> = T[keyof T];

export class Player {
    public name: string;
    private tagline: string;
    private agentInternal: string;
    private agentProper: ValueOf<Agents> = "";
    private rankName: string;

    constructor (data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.agentInternal = data.agentInternal;
        this.rankName = ranks[data.rank];
    }

    onAgentLock(data: IFormattedRoster) {
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
    }
}