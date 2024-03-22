import { compare } from "deep-diff-patcher";
import { Match } from "../model/Match";

let oldMatchData: Match;
let trackedMatch: Match;

export function testDiff(match: Match) {
    oldMatchData = structuredClone(match);
    trackedMatch = match;

    // Gotta figure out which parts of the Match can currently be undefined as the differ can't handle those
    // startTimers();
}

function startTimers() {
    setInterval(() => {
        const diff = compare(oldMatchData, trackedMatch);
        console.log(diff);
        oldMatchData = structuredClone(trackedMatch);
    }, 5000)
}