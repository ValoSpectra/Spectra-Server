import fs from "fs";
import { IAuthedData } from "../model/eventData";
import log from "./Logging";
const Log = log("ReplayLogging").level(1);

export class ReplayLogging {

    protected static versionInfo = {version: "v0.0.0"};
    protected static writeLog = true;

    protected groupCode: string;
    protected logStartTime: number;

    protected fileName: string;
    protected fileWriteStream!: fs.WriteStream;
    protected fileStartOffset: number = 0;
    protected writeReady: boolean = false;
    protected isOpening: boolean = false;
    protected isWriting: boolean = false;
    protected writeBuffer: string[] = [];

    public constructor(groupCode: string) {
        this.groupCode = groupCode;
        this.logStartTime = Date.now();

        this.fileName = `Match_${this.groupCode}_${this.logStartTime}.replay`;

        if (ReplayLogging.writeLog) {
            this.openFileStream();
        }
    }

    public writeData(data: IAuthedData) {
        if (!ReplayLogging.writeLog)    return;
        this.writeBuffer.push(JSON.stringify(data));
        this.writeBufferToFile();
    }

    public write(data: IAuthedData) {
        this.writeData(data);
    }

    public log(data: IAuthedData) {
        this.writeData(data);
    }

    public closeFile() {
        if (!ReplayLogging.writeLog)    return;
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
        const dataString = JSON.stringify(ReplayLogging.versionInfo);
        this.fileWriteStream.write(dataString);
        return dataString.length;
    }

    protected writeFileEnd(writeStream?: fs.WriteStream): number {
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
        while((s = this.writeBuffer.shift()) != null) {
            this.writeFileContentDelimiter();
            this.fileWriteStream.write(s.toString());
        }
        this.isWriting = false;
    }

}