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
      const deeplinkUrl = `${process.env.SPECTRA_CLIENT_DEEPLINK!}?userId=${userData.id}&username=${userData.username}&avatar=${userData.avatar}`;
      res.send(`
        <html>
        <head>
          <title>Discord OAuth Success</title>
          <style>
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              width: 100vw;
              background: linear-gradient(to right, #0e7490, #3b82f6, #4f46e5);
            }
            .centered-container {
              text-align: center;
              background: #fff;
              padding: 1rem 3rem;
              border-radius: 12px;
              box-shadow: 0 2px 16px rgba(0,0,0,0.08);
              font-family: Arial, sans-serif;
            }
            .button {
              display: inline-block;
              margin-top: 1rem;
              padding: 0.5rem 1.5rem;
              background: #5865F2;
              color: #fff;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              font-size: 1rem;
            }
            .less-top {
              margin-top: -20px;
            }
            .more-top {
              margin-top: 50px;
            }
          </style>
          <script>
            setTimeout(function() {
              window.location.href = "${deeplinkUrl}";
            }, 2000);
          </script>
        </head>
        <body>
          <div class="centered-container">
            <h1>Discord Login Successful</h1>
            <h2 class="less-top">Welcome, ${userData.global_name ? userData.global_name : userData.username}!</h2>
            <p class="more-top">You may close this window <b>after</b> being redirected to the Client and getting a confirmation.<br>
            If you are not redirected automatically, please click the button below:</p>
            <a href="${deeplinkUrl}" class="button">Open Spectra Client</a>
          </div>
        </body>
        </html>
      `);
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
