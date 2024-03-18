import express from 'express';
var EventSource = require('eventsource');

const app = express();

app.listen(5100, () => {
    console.log('InhouseTracker Server started on port 5100!');
    const eventStreamSource = new EventSource("http://overlay.localhost:3000/stream/?channel=events", { https: {rejectUnauthorized: false} });
    eventStreamSource.onerror = (err: any) => { console.log(err); };
    eventStreamSource.addEventListener("streamdeck", processStreamEvent);
})

app.use(express.json());

app.post("/ingest", function (req, res) {
    const token = req.headers["x-auth-token"];
    if (token !== "A") {
        res.sendStatus(403);
        res.end();
        return;
    } else {
        res.sendStatus(200);
        res.end();
    }

    const type = req.body.type;
    const data = req.body.data;
    console.log(type);
    console.log(data);
});

function processStreamEvent(e: any) {
    const json = JSON.parse(e.data);
    console.log(json);
} 