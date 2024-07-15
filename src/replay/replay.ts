import { ReplayPlayer, ReplayMode } from "./ReplayPlayer";
import { ReplayConnectorService } from "./ReplayConnectorService";
import logging from "../util/Logging";
const Log = logging("Replay").level(1);

let INGEST_SERVER_URL = "ws://localhost:5100/ingest";
let REPLAY_FILE = "customGameTest.replay";
let REPLAY_MODE = ReplayMode.INSTANT;
let DELAY_MS = 500;

const args = process.argv;
for (let i = 2; i < args.length; i++) {
    let arg = args[i];
    let logString = `Parameter ${arg}`;

    switch(arg) {
        case "-instant": 
            REPLAY_MODE = ReplayMode.INSTANT;
            break;
        case "-delay":
            let delay = parseInt(args[i+1]);
            REPLAY_MODE = ReplayMode.DELAY;
            if (!Number.isNaN(delay)) {
                i++;
                DELAY_MS = delay;
                logString += ` = ${DELAY_MS}`;
            }
            break;
        case "-game":
            REPLAY_FILE = args[++i];
            logString += ` = ${REPLAY_FILE}`;
            break;
        case "-timestamps":
            REPLAY_MODE = ReplayMode.TIMESTAMPS;
            Log.info("Using timestamps mode");
            break;
        case "-manual":
            REPLAY_MODE = ReplayMode.MANUAL;
            Log.info("Using manual mode");
            break;
        case "-server":
            INGEST_SERVER_URL = args[++i];
            Log.info(`Overriding ingest server url with ${INGEST_SERVER_URL}`);
            break;
        default:
            Log.error(`Unknown parameter ${arg}`);
    }
    Log.debug(logString);
}

const connector = new ReplayConnectorService(INGEST_SERVER_URL);
const player = new ReplayPlayer(connector, REPLAY_MODE, DELAY_MS);

player.loadReplayFile(REPLAY_FILE);
const { playerName, teamName, gameCode } = player.getReplayHeader();
connector.setAuthValues("Dunkel#Licht", "A", {name: "Left Team", tricode: "LEFT", url: "https://dnkl.gg/PHtt7"}, {name: "Right Team", tricode: "RIGHT", url: "https://dnkl.gg/8GKvE"});
connector.open().then(() => {
    player.play(() => {
        connector.close();
    });
});