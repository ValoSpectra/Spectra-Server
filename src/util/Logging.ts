import { DebugLogger } from "util";
import fs from "fs";

class Logging {

    public static logLevel: number = 2;
    public static writeFile: boolean = false;

    private static writeStream: fs.WriteStream;
    private static writeReady: boolean = false;
    private static isOpening: boolean = false;
    private static isWriting: boolean = false;
    private static writeBuffer: string[] = [];

    //color info -> https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
    private static colorInfo: string = "\x1b[33m";
    private static colorDebug: string = "\x1b[36m";
    private static colorError: string = "\x1b[31m";
    private static colorReset: string = "\x1b[0m";

    private static writeLogfile(name: string, data: any) {
        if (!this.writeFile) return;
        
        if (typeof data == "object") {
            this.writeBuffer.push(`[${name}] Object`);
            this.writeBuffer.push(JSON.stringify(data));
        }
        else {
            this.writeBuffer.push(`[${name}] ${data}`);
        }

        if (!this.writeReady && !this.isOpening) {
            this.isOpening = true;
            if (!fs.existsSync("./logs/")) {
                fs.mkdirSync("./logs/");
            }
            this.writeStream = fs.createWriteStream(`./logs/log_${Date.now()}.txt`);
            this.writeStream.on("ready", () => {
                this.writeReady = true;
                this.isOpening = false;
                this.writeBufferToFile();
            });
            this.writeStream.on("close", () => {
                this.writeReady = false;
            });
        } 
        else {
            this.writeBufferToFile();
        }
    }

    private static async writeBufferToFile() {
        if (this.isWriting) return;
        this.isWriting = true;
        let s;
        while((s = this.writeBuffer.shift()) != null) {
            this.writeStream.write(s.toString());
            this.writeStream.write("\n");
        }
        this.isWriting = false;
    }

    private name: string;

    public constructor(name: string) {
        this.name = name;
    }

    private log(data: any, color: string) {
        if (typeof data == "object") {
            console.log(`${color}[${this.name}]${Logging.colorReset} Object`);
            console.log(data);
        }
        else {
            console.log(`${color}[${this.name}]${Logging.colorReset} ${data}`);
        }
        Logging.writeLogfile(this.name, data);
        return data;
    }

    info(data: any) {
        if (Logging.logLevel >= 1)
            this.log(data, Logging.colorInfo);
        return data;
    }

    debug(data: any) {
        if (Logging.logLevel >= 2)
            this.log(data, Logging.colorDebug);
        return data;
    }

    error(data: any) {
        if (Logging.logLevel >= 0)
            this.log(data, Logging.colorError);
        return data;
    }

}

export default function create(name: string) {
    return new Logging(name);
}