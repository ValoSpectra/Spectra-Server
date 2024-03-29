import { Match } from "../model/Match";

let lastEventNumber = 0;

export function sendMatchToEventstream(match: Match) {
    if (match.eventNumber > lastEventNumber) {
        lastEventNumber = match.eventNumber;
        fetch("http://overlay.localhost:3000/publish-inhouse-data", {
            method: "POST",
            headers: {
                'x-access-token': 'DEVToken',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(match)
        }).then(() => {
        });
    }
}