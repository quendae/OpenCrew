# OpenCrew

OpenCrew is an original browser implementation of cooperative mission-based trick-taking, inspired by the design space popularized by **The Crew** series. It uses original UI, mission text and campaign themes rather than publisher artwork or copied logbook content.

## Campaigns

- **Orbital Nine** — space expedition; 50 progressively harder generated mission templates.
- **Abyssal Signal** — deep-sea expedition; 32 adaptive mission templates with more variable objectives.
- **Emberline** — original third theme: storm-rescue airships coordinating flights through an electrical supercell.

All campaigns share one rules engine: four colored suits numbered 1–9, four trump/rocket cards numbered 1–4, follow-suit trick taking, one limited communication action per player, task ownership and cooperative success/failure.

## Current state

- playable local game for 2–5 seats;
- bots with easy/normal/hard/expert heuristics;
- responsive desktop/tablet/phone/phone-landscape UI;
- generated missions and campaign selection;
- host-authoritative WebRTC multiplayer module;
- signaling-worker scaffold;
- per-seat hidden-information filtering;
- deterministic game seeds and Node regression tests.

The multiplayer transport is intentionally isolated from the game rules. Guests send actions; the host validates and executes them and sends seat-filtered state snapshots. This matches the architecture in the supplied multiplayer guide.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Multiplayer

The browser client reads the signaling origin from:

```js
localStorage.setItem('opencrew.signal', 'https://your-worker.example.workers.dev')
```

`src/multiplayer.js` owns session/WebRTC state. `src/game.js` owns authoritative rules. Hidden cards are removed by `stateForSeat()` before guest synchronization.

> The worker in `worker/signaling.js` is a development scaffold. Before public deployment, replace its process-local room map with Cloudflare Durable Objects or another persistent ephemeral signaling store.

## Design direction

The visual baseline retains the useful principles of the supplied SKAT reference — strong card hierarchy, physical card motion, dark premium staging, concise HUD, explicit active/disabled states and full responsive behavior — while replacing casino felt/wood with expedition-specific materials:

- Orbital Nine: midnight navy, cyan telemetry, orbital grid and restrained glass panels.
- Abyssal Signal: near-black teal, sonar rings, pressure-gauge details and bioluminescent accents.
- Emberline: soot-black brown, copper/orange storm-light, weather-map contours and instrument-panel cues.

Cards remain light, tactile and visually dominant.

## IP note

OpenCrew does not contain copied publisher illustrations, logos, rulebook prose, or mission-logbook text. Mechanics are implemented independently and campaign content is original/generated.
