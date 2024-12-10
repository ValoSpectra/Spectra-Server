import { WebsocketIncoming } from "./connector/websocketIncoming";
import express from "express";
import logging from "./util/Logging";
const Log = logging("Status");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const websocketIncoming = new WebsocketIncoming();

const app = express();
const port = 5101;

app.get("/status", (req, res) => {
  res.json({ status: "UP" });
});

app.listen(port, () => {
  Log.info(`Status available on port ${port}`);
});
