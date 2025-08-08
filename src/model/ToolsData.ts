export class ToolsData {
  public seriesInfo: ISeriesInfo = {
    needed: 1,
    wonLeft: 0,
    wonRight: 0,
    mapInfo: [],
  };
  public seedingInfo: ISeedingInfo = {
    left: "",
    right: "",
  };
  public tournamentInfo: ITournamentInfo = {
    name: "",
    logoUrl: "",
    backdropUrl: "",
    enabled: false,
  };
  public timeoutDuration: number = 60;
  public sponsorInfo: ISponsorInfo = {
    enabled: false,
    duration: 5,
    sponsors: [],
  };
  public watermarkInfo: IWatermarkInfo = {
    spectraWatermark: true,
    customTextEnabled: false,
    customText: "",
  };

  public constructor(init?: Partial<ToolsData>) {
    Object.assign(this, init);

    if (this.tournamentInfo.logoUrl != "" || this.tournamentInfo.name != "") {
      this.tournamentInfo.enabled = true;
    } else {
      this.tournamentInfo.enabled = false;
    }
  }
}

export type ISeriesInfo = {
  needed: number;
  wonLeft: number;
  wonRight: number;
  mapInfo: MapPoolInfo[];
};

export type ISeedingInfo = {
  left: string;
  right: string;
};

export type ITournamentInfo = {
  name: string;
  logoUrl: string;
  backdropUrl: string;
  enabled: boolean;
};

export type ISponsorInfo = {
  enabled: boolean;
  duration: number;
  sponsors: string[];
};

export type IWatermarkInfo = {
  spectraWatermark: boolean;
  customTextEnabled: boolean;
  customText: string;
};

type BaseMapPoolInfo = {
  type: "past" | "present" | "future" | "disabled";
};

type PastMapPoolInfo = BaseMapPoolInfo & {
  type: "past";
  map: string;
  left: {
    logo: string;
    score: number;
  };
  right: {
    logo: string;
    score: number;
  };
};

type PresentMapPoolInfo = BaseMapPoolInfo & {
  type: "present";
  logo: string;
};

type FutureMapPoolInfo = BaseMapPoolInfo & {
  type: "future";
  map: string;
  logo: string;
};

type DisabledMapPoolInfo = BaseMapPoolInfo & {
  type: "disabled";
};

export type MapPoolInfo =
  | PastMapPoolInfo
  | PresentMapPoolInfo
  | FutureMapPoolInfo
  | DisabledMapPoolInfo;
