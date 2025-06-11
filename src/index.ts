import { WebsocketIncoming } from "./connector/websocketIncoming";
import express, { Request, Response } from "express";
import logging from "./util/Logging";
import { MatchController } from "./controller/MatchController";
import { PreviewHandler } from "./util/previews/PreviewHandler";
import bodyParser from "body-parser";
import cors from "cors";
const Log = logging("Status");

const websocketIncoming = new WebsocketIncoming();
const previewHandler = PreviewHandler.getInstance(websocketIncoming);

const app = express();
app.use(bodyParser.json(), cors({ origin: "*" }));
const port = 5101;

app.get("/status", (req: Request, res: Response) => {
  const status = { status: "UP", matchesRunning: MatchController.getInstance().getMatchCount() };
  res.json(status);
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

app.listen(port, () => {
  Log.info(`Extras available on port ${port}`);
});
