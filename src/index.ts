import { WebsocketIncoming } from "./connector/websocketIncoming";
import express from "express";
import logging from "./util/Logging";
import { MatchController } from "./controller/MatchController";
const Log = logging("Status");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const websocketIncoming = new WebsocketIncoming();

const app = express();
const port = 5101;

app.get("/status", (req, res) => {
  const status = { status: "UP", matchesRunning: MatchController.getInstance().getMatchCount() };
  res.json(status);
});

app.listen(port, () => {
  Log.info(`Status available on port ${port}`);
});
