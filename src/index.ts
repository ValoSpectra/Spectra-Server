import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import { WebsocketIncoming } from "./connector/websocketIncoming";
import { MatchController } from "./controller/MatchController";
import logging from "./util/Logging";
import { PreviewHandler } from "./util/previews/PreviewHandler";
import { readFileSync } from "fs";
import { createServer as createSecureServer } from "https";
import { DatabaseConnector } from "./connector/databaseConnector";
import { handleDiscordAuth, handlePackageRequest } from "./util/SupportService";
const Log = logging("Status");
require("dotenv").config();

const websocketIncoming = new WebsocketIncoming();
const previewHandler = PreviewHandler.getInstance(websocketIncoming);

const app = express();
app.use(bodyParser.json(), cors({ origin: "*" }));
const port = 5101;

app.get("/status", (req: Request, res: Response) => {
  const status = { status: "UP", matchesRunning: MatchController.getInstance().getMatchCount() };
  res.header("Access-Control-Allow-Origin", "*").json(status);
});

app.put("/createPreview", async (req: Request, res: Response) => {
  await previewHandler.handlePreviewCreation(req, res);
});

app.get("/preview/:previewCode", async (req: Request, res: Response) => {
  const previewCode = req.params.previewCode;
  Log.info(`Received request for preview with code: ${previewCode}`);
  if (!previewCode || previewCode.length !== 6) {
    return res.status(400).json({ error: "Invalid preview code format" });
  }
  const previewMatch = previewHandler.getPreview(previewCode);
  if (!previewMatch) {
    return res.status(404).json({ error: "Preview not found" });
  }
  res.status(200).json(previewMatch);
});

app.get("/getOrgForKey", async (req, res) => {
  const key = req.query.key;
  if (!key || typeof key !== "string") {
    res.status(400).header("Access-Control-Allow-Origin", "*").json({ error: "Key is required" });
    return;
  }

  if (process.env.USE_BACKEND === "true") {
    const validity = await DatabaseConnector.verifyAccessKey(key);
    if (validity.valid) {
      res.status(200).header("Access-Control-Allow-Origin", "*").json({
        id: validity.organizationId,
        name: validity.organizationName,
        isSupporter: validity.isSupporter,
      });
      return;
    }
  }

  res.status(401).header("Access-Control-Allow-Origin", "*").send("401 Unauthorized");
});

app.get("/getTeamInfoForCode", async (req, res) => {
  const groupCode = req.query.groupCode;
  if (!groupCode || typeof groupCode !== "string") {
    res
      .status(400)
      .header("Access-Control-Allow-Origin", "*")
      .json({ error: "Group code is required" });
    return;
  }
  const teamInfo = MatchController.getInstance().getTeamInfoForCode(groupCode);
  if (teamInfo) {
    res.status(200).header("Access-Control-Allow-Origin", "*").json(teamInfo);
  } else {
    res
      .status(404)
      .header("Access-Control-Allow-Origin", "*")
      .json({ error: "Group code not found" });
  }
});

if (process.env.USE_BACKEND === "true") {
  app.get("/getSupportPackages", async (req, res) => {
    handlePackageRequest(res);
  });
  app.get("/client/oauth-callback", async (req, res) => {
    handleDiscordAuth(req, res);
  });
}

if (process.env.INSECURE == "true") {
  app.listen(port, () => {
    Log.info(`Extras available on port ${port}`);
  });
} else {
  const key = readFileSync(process.env.SERVER_KEY!);
  const cert = readFileSync(process.env.SERVER_CERT!);
  const creds = { key, cert };
  const server = createSecureServer(creds, app);
  server.listen(port, () => {
    Log.info(`Extras available on port ${port} (TLS)`);
  });
}
