export class ToolsData {
  private seriesInfo?: ISeriesInfo;

  public constructor(init?: Partial<ToolsData>) {
    Object.assign(this, init);
  }
}

export type ISeriesInfo = {
  needed: number;
  wonLeft: number;
  wonRight: number;
  mapInfo: MapPoolInfo[];
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
