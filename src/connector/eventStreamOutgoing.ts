import { Match } from "../model/Match";

export function sendMatchToEventstream(match: Match) {
    fetch("http://overlay.localhost:3000/publish-inhouse-data", {
        method: "POST",
        headers: {
            'x-access-token': 'DEVToken',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(match)
    }).then(() => {
    })
}