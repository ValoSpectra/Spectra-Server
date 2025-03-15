require("dotenv").config();
import { Match } from "../model/Match";
import logging from "../util/Logging";
const Log = logging("DatabaseConnector");

export interface KeyValidity {
  valid: boolean;
  reason: ValidityReasons;
  organizationId?: string;
}

export enum ValidityReasons {
  VALID = "",
  INVALID = "Invalid Key",
  EXPIRED = "Expired Key",
  UNKNOWN = "Unknown Error",
}

export class DatabaseConnector {
  public static async verifyAccessKey(key: string): Promise<KeyValidity> {
    const res = await this.apiRequest(`system/validateAccessKey/${key}`, "get");

    // Key is valid
    if (res.status == 200) {
      const data = await res.json();
      Log.info(`Access key for organization ${data.id}:${data.name} verified`);
      return { valid: true, reason: ValidityReasons.VALID, organizationId: data.id };
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
    } else {
      Log.error(
        `An unknown error occured during an access key verification. HTTP Code: ${res.status}`,
      );
      return { valid: false, reason: ValidityReasons.UNKNOWN };
    }
  }

  public static async registerMatch(match: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { replayLog, eventNumber, timeoutEndTimeout, timeoutRemainingLoop, ...toSend } = match;
    const res = await this.apiRequest(`system/match/${match.matchId}/register`, "post", {
      match: toSend,
    });

    if (res.status == 200) {
      return;
    } else {
      Log.error(`Register match encountered an error. HTTP Code: ${res.status}`);
      return;
    }
  }

  public static async updateMatch(match: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { replayLog, eventNumber, timeoutEndTimeout, timeoutRemainingLoop, ...toSend } = match;
    const res = await this.apiRequest(`system/match/${match.matchId}/update`, "put", {
      match: toSend,
    });

    if (res.status == 200) {
      return;
    } else {
      Log.error(`Update match encountered an error. HTTP Code: ${res.status}`);
      return;
    }
  }

  public static async completeMatch(match: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { replayLog, eventNumber, timeoutEndTimeout, timeoutRemainingLoop, ...toSend } = match;
    const res = await this.apiRequest(`system/match/${match.matchId}/complete`, "put", {
      match: toSend,
    });

    if (res.status == 200) {
      return;
    } else {
      Log.error(`Complete match encountered an error. HTTP Code: ${res.status}`);
      return;
    }
  }

  private static async apiRequest(
    path: string,
    method: "get" | "post" | "put",
    body?: any,
  ): Promise<any> {
    const res = await fetch(process.env.BACKEND_URL + "/" + path, {
      method: method,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "X-User-Token": process.env.BACKEND_TOKEN!,
      },
    });

    if (res.status) {
      return res;
    } else {
      Log.error(`API request encountered an error. HTTP Code: ${res.status}`);
      throw new Error(`API request encountered an error. HTTP Code: ${res.status}`);
    }
  }
}
