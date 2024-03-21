import { WebsocketIncoming } from './connector/websocketIncoming';
import { setupEventStream } from './connector/eventStreamIncoming';

const websocketIncoming = new WebsocketIncoming();

setupEventStream();