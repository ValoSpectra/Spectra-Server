import { WebsocketIncoming } from './connector/websocketIncoming';
import express from 'express';
import logging from "./util/Logging";
const Log = logging("Status");

const websocketIncoming = new WebsocketIncoming();

const app = express();
const port = 5101;

app.get('/status', (req, res) => {
    res.json({ status: 'UP' });
});

app.listen(port, () => {
    Log.info(`Making status available on port ${port}`);
});