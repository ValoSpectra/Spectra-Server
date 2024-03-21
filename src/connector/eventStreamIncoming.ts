import { MatchController } from "../controller/MatchController";

var HoojEventSource = require('eventsource');
let matchController = MatchController.getInstance();

export function setupEventStream() {
    const eventStreamSource = new HoojEventSource("http://overlay.localhost:3000/stream/?channel=events", { https: { rejectUnauthorized: false } });
    eventStreamSource.onerror = (err: any) => { console.log(err); };
    eventStreamSource.addEventListener("streamdeck", processStreamEvent);

    // Debug match setup
    matchController.addMatch({type: "inhouse-tracker", name: "addMatch", groupCode: "A", team1: "TestTeam", team2: "Hooj"});
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