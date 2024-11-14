require('dotenv').config()
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
        const res = await fetch(`http://localhost:6100/organizations/accessKey/validate/${key}`);

        // Key is valid
        if (res.status == 200) {
            const data = await res.json();
            Log.info(`Access key for organization ${data.id}:${data.name} verified`);
            return {valid: true, reason: ValidityReasons.VALID};
        }
        // Key does not exist
        else if (res.status == 401) {
            Log.info("An access key verification has failed");
            Log.debug("Access key was: " + key);
            return {valid: false, reason: ValidityReasons.INVALID};
            // Key expired
        } else if (res.status == 403) {
            Log.info(`Access key checked but was expired`);
            Log.debug("Access key was: " + key);
            return {valid: false, reason: ValidityReasons.EXPIRED};
        }
        else {
            Log.error(`An unknown error occured during an access key verification. HTTP Code: ${res.status}`);
            return {valid: false, reason: ValidityReasons.UNKNOWN};
        }
    }

    public static async createMatch(data: Match): Promise<number> {
        const res = await fetch(`http://localhost:6100/matches/create`, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });

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
        const res = await fetch(`http://localhost:6100/matches/start/${matchId}`, {
            method: "PUT"
        });

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`Start match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

    public static async updateMatch(matchId: number, data: Match): Promise<void> {
        const res = await fetch(`http://localhost:6100/matches/update/${matchId}`, {
            method: "PUT",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`Update match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

    public static async endMatch(matchId: number, data: Match): Promise<void> {
        const res = await fetch(`http://localhost:6100/matches/stop/${matchId}`, {
            method: "PUT",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (res.status == 200) {
            return;
        }
        else {
            Log.error(`End match encountered an error. HTTP Code: ${res.status}`);
            return;
        }
    }

}