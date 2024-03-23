import { MatchController } from "../controller/MatchController";
import logging from "../util/Logging";
const Log = logging("EventstreamIncoming");

var HoojEventSource = require('eventsource');
let matchController = MatchController.getInstance();

export function setupEventStream() {
    const eventStreamSource = new HoojEventSource("http://overlay.localhost:3000/stream/?channel=events", { https: { rejectUnauthorized: false } });
    eventStreamSource.onerror = (err: any) => { Log.info(err); };
    eventStreamSource.addEventListener("streamdeck", processStreamEvent);

    // Debug match setup
    matchController.addMatch({type: "inhouse-tracker", name: "addMatch", groupCode: "A", team1: "TESTTEAM", team2: "Hooj", isRanked: false});
}

function processStreamEvent(event: any) {
    const data = JSON.parse(event.data);
    if (data.type === "inhouse-tracker") {
        if (data.name === "addMatch") {
            matchController.addMatch(data);
        } else if (data.name === "removeMatch") {
            matchController.removeMatch(data)
        }
    }
}