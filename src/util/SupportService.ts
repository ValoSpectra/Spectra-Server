import { Response, Request } from "express";
import logging from "./Logging";
const Log = logging("Support");
require("dotenv").config();

let packageCache: [] = [];
export async function handlePackageRequest(res: Response) {
  if (packageCache.length > 0) {
    res.status(200).header("Access-Control-Allow-Origin", "*").json(packageCache);
    Log.info("Returning cached packages");
    return;
  }

  try {
    const baseUrl = process.env.TEBEX_BASE_URL;
    const storeId = process.env.TEBEX_STORE_ID;
    const extensionId = process.env.TEBEX_EXTENSION_ID;
    const response = await fetch(`${baseUrl}/packages/${storeId}?extensionId=${extensionId}`);
    if (!response.ok) {
      Log.error(`Failed to fetch packages: ${response.status}, ${response.statusText}`);
      res
        .status(502)
        .header("Access-Control-Allow-Origin", "*")
        .json({ error: "Failed to fetch packages" });
      return;
    }
    packageCache = await response.json();
    packageCache.forEach((pkg: any) => {
      pkg.checkoutUrl = `${baseUrl}/checkout/${storeId}/${pkg.id}?extensionId=${extensionId}`;
    });
    Log.info("Fetched packages from Overwolf API");
    res.status(200).header("Access-Control-Allow-Origin", "*").json(packageCache);

    setTimeout(
      () => {
        packageCache = [];
      },
      10 * 60 * 1000,
    ); // clear cache after 10 minutes
  } catch (error) {
    Log.error("Error fetching packages: " + error);
    res
      .status(500)
      .header("Access-Control-Allow-Origin", "*")
      .json({ error: "Internal server error, " + error });
  }
}

export async function handleDiscordAuth(req: Request, res: Response) {
  try {
    const code = req.query.code;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    const params = new URLSearchParams();
    params.append("client_id", clientId || "");
    params.append("client_secret", clientSecret || "");
    params.append("grant_type", "authorization_code");
    params.append("code", code as string);
    params.append("redirect_uri", redirectUri || "");

    const response = await fetch(process.env.DISCORD_OAUTH_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data: AuthBearerResponse = await response.json();

    const userData = await fetch(process.env.DISCORD_USER_URL!, {
      method: "GET",
      headers: {
        Authorization: `${data.token_type} ${data.access_token}`,
      },
    });

    if (userData.status !== 200) {
      Log.error(`Failed to fetch user data: ${userData.status}, ${userData.statusText}`);
      res
        .status(userData.status)
        .header("Access-Control-Allow-Origin", "*")
        .json({ error: "Failed to fetch user data" });
      return;
    }

    userData.json().then((userData: DiscordUserResponse) => {
      res.redirect(
        `${process.env.SPECTRA_CLIENT_DEEPLINK!}?userId=${userData.id}&username=${userData.username}&avatar=${userData.avatar}`,
      );
    });
  } catch (e) {
    Log.error("Error during Discord OAuth: " + e);
    res
      .status(500)
      .header("Access-Control-Allow-Origin", "*")
      .json({ error: "Internal server error" });
  }
}

interface AuthBearerResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}
