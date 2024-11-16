require('dotenv').config();
import { Match } from "../model/Match";
import logging from "../util/Logging";
const Log = logging("DatabaseConnector");


export interface KeyValidity {
    valid: boolean;
    reason: ValidityReasons;
}

export enum ValidityReasons {
    VALID = "",
    INVALID = "Invalid Key",
    EXPIRED = "Expired Key",
    UNKNOWN = "Unknown Error"
}

export class DatabaseConnector {

    public static async verifyAccessKey(key: string): Promise<KeyValidity> {
        const res = await this.apiRequest(`system/validateAccessKey/${key}`, "get");        

        // Key is valid
        if (res.status == 200) {
            const data = await res.json();
            Log.info(`Access key for organization ${data.id}:${data.name} verified`);
            return { valid: true, reason: ValidityReasons.VALID };
        }
        // Key does not exist
        else if (res.status == 401) {
            Log.info("An access key verification has failed");
            Log.debug("Access key was: " + key);
            return { valid: false, reason: ValidityReasons.INVALID };
            // Key expired
        } else if (res.status == 403) {
            Log.info(`Access key checked but was expired`);
            Log.debug("Access key was: " + key);
            return { valid: false, reason: ValidityReasons.EXPIRED };
        }
        else {
            Log.error(`An unknown error occured during an access key verification. HTTP Code: ${res.status}`);
            return { valid: false, reason: ValidityReasons.UNKNOWN };
        }
    }

    public static async createMatch(data: Match): Promise<number> {
        const res = await this.apiRequest("matches/create", "post", data);

        if (res.status == 200) {
            const data = await res.json();
            return data.id;
        }
        else {
            Log.error(`Create match encountered an error. HTTP Code: ${res.status}`);
            return -1;
        }
    }

    public static async startMatch(matchId: number): Promise<void> {
        const res = await this.apiRequest(`matches/start/${matchId}`, "put");

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`Start match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

    public static async updateMatch(matchId: number, data: Match): Promise<void> {
        const res = await this.apiRequest(`matches/update/${matchId}`, "put", data);

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`Update match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

    public static async endMatch(matchId: number, data: Match): Promise<void> {
        const res = await this.apiRequest(`matches/stop/${matchId}`, "put", data);

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`End match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

    private static async apiRequest(path: string, method: "get" | "post" | "put", body?: any): Promise<any> {
        const res = await fetch(process.env.BACKEND_URL + "/" + path, {
            method: method,
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                "X-User-Token": process.env.BACKEND_TOKEN!
            }
        });

        if (res.status) {
            return res;
        }
        else {
            Log.error(`API request encountered an error. HTTP Code: ${res.status}`);
            throw new Error(`API request encountered an error. HTTP Code: ${res.status}`);
        }
    }

}