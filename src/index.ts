import express from 'express';
import { WebsocketIncoming } from './connector/websocketIncoming';
var EventSource = require('eventsource');

const app = express();
const websocketIncoming = new WebsocketIncoming();

function processStreamEvent(e: any) {
    const json = JSON.parse(e.data);
    console.log(json);
} 