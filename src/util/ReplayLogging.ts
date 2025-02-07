import fs from "fs";
import { IAuthedAuxData, IAuthedData, IAuthenticationData } from "../model/eventData";
import log from "./Logging";
const Log = log("ReplayLogging").level(1);

export class ReplayLogging {
  protected static writeLog = true;

  protected matchData: Partial<IAuthenticationData>;
  protected logStartTime: number;

  protected fileName: string;
  protected fileWriteStream!: fs.WriteStream;
  protected fileStartOffset: number = 0;
  protected writeReady: boolean = false;
  protected isOpening: boolean = false;
  protected isWriting: boolean = false;
  protected writeBuffer: string[] = [];

  public constructor(data: IAuthenticationData) {
    this.matchData = data;
    delete this.matchData.key;
    delete this.matchData.type;
    this.logStartTime = Date.now();

    this.fileName = `Match_${this.matchData.groupCode}_${this.logStartTime}.replay`;

    if (ReplayLogging.writeLog) {
      this.openFileStream();
    }
  }

  public writeData(data: IAuthedData | IAuthedAuxData) {
    if (!ReplayLogging.writeLog) return;
    this.writeBuffer.push(JSON.stringify(data));
    this.writeBufferToFile();
  }

  public write(data: IAuthedData | IAuthedAuxData) {
    this.writeData(data);
  }

  public log(data: IAuthedData) {
    this.writeData(data);
  }

  public closeFile() {
    if (!ReplayLogging.writeLog) return;
    this.fileWriteStream.close();
  }

  protected openFileStream() {
    if (!fs.existsSync("./replays/")) {
      fs.mkdirSync("./replays/");
    }
    Log.info("Opening replay file " + this.fileName);
    this.fileWriteStream = fs.createWriteStream(`./replays/${this.fileName}`);
    this.fileWriteStream.on("ready", () => {
      Log.debug("Replay file " + this.fileName + " is ready");
      Log.debug("Writing file header");
      this.writeFileStart();
      this.writeReady = true;
      this.isOpening = false;
      this.writeBufferToFile();
    });
    this.fileWriteStream.on("close", () => {
      Log.debug(`Replay file ${this.fileName} closed`);
      this.writeReady = false;
    });
  }

  protected writeFileStart(): number {
    const headerData = {
      serverVersion: module.exports.version,
      ...this.matchData,
      logStartTime: this.logStartTime,
    };
    const dataString = JSON.stringify(headerData);
    this.fileWriteStream.write(dataString);
    return dataString.length;
  }

  protected writeFileEnd(): number {
    return 0;
  }

  protected writeFileContentDelimiter() {
    this.fileWriteStream.write(",\n");
    return 2;
  }

  protected async writeBufferToFile() {
    if (this.isWriting || !this.writeReady) return;
    this.isWriting = true;
    let s;
    while ((s = this.writeBuffer.shift()) != null) {
      this.writeFileContentDelimiter();
      this.fileWriteStream.write(s.toString());
    }
    this.isWriting = false;
  }
}
