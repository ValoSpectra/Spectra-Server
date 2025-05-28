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

  public constructor(init?: Partial<ToolsData>) {
    Object.assign(this, init);

    if (this.tournamentInfo.logoUrl != "" || this.tournamentInfo.name != "") {
      this.tournamentInfo.enabled = true;
    } else {
      this.tournamentInfo.enabled = false;
    }

    // Add Spectra logo to sponsors if enabled (will move somewhere else in future)
    if (this.sponsorInfo.enabled) {
      this.sponsorInfo.sponsors.push("https://auto.valospectra.com/assets/misc/logo.webp");
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

type BaseMapPoolInfo = {
  type: "past" | "present" | "future";
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

export type MapPoolInfo = PastMapPoolInfo | PresentMapPoolInfo | FutureMapPoolInfo;
