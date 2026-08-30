# OpenCrew

OpenCrew is an original browser implementation of cooperative mission-based trick-taking. It explores the same broad design space as modern cooperative trick-taking games while using its own campaign identities, UI, mission generation, objective text and digital-only systems.

## Three campaigns

- **Helios Reach** — 45 outer-system survey operations. The most structured campaign: card-recovery objectives, priority chains, exact trick timing and increasingly restricted crew signals.
- **Abyssal Signal** — 36 hadal research dives. Every dive builds an objective package from a difficulty budget, combining card recovery, avoidance, exact/minimum trick counts, suit recovery, paired captures and timed tricks.
- **Emberline** — 42 storm-rescue operations. The original third campaign focuses on deadlines, minimum activation windows, linked rescues, final-trick objectives and unstable communications inside an electrical supercell.

All three use the same core trick engine: four colored suits numbered 1–9, four trump cards numbered 1–4, mandatory follow-suit play, cooperative mission success/failure and one constrained signal per crew member.

## Mission flow

A mission is no longer pre-assigned before the player sees the table. Open objectives are drafted clockwise starting with the mission lead. Only after the objective board has been distributed does normal trick play begin.

Crew signals are digital equivalents of limited table communication rather than chat. A player may expose one non-trump card only when it truthfully represents the **highest**, **lowest**, or **only** card of that suit in their current hand. Signals can only be sent between tricks. Missions may delay signals, obscure their high/low/only meaning, or disable them completely.

## Two-slot Relay mode

Selecting two crew slots activates a deliberately different digital variant: **Relay Drone** joins as a third active trick-taking seat.

- its hand is public to both human players;
- it is controlled authoritatively by the host AI;
- it drafts objectives and plays tricks like another crew member;
- it has no communication token of its own.

This avoids cloning a physical dummy-player layout while preserving the interesting three-seat information puzzle in a form that works naturally in a browser and in multiplayer.

## Current state

- local play with bots;
- 2-slot Relay mode plus normal 3–5 seat tables;
- easy / normal / hard / expert bot heuristics;
- task drafting before the first trick;
- constrained high / low / only communication;
- campaign-specific communication restrictions;
- multiple task families and timing constraints;
- campaign progress stored locally;
- responsive desktop, tablet, phone portrait and phone landscape UI;
- host-authoritative WebRTC multiplayer lobby and remote action routing;
- hybrid human + host-side bot tables;
- Cloudflare Worker + Durable Object signaling;
- per-seat hidden-information filtering;
- host-private deterministic shuffle seed;
- stale-state revision rejection on guests;
- unit and simulation regression tests;
- Playwright responsive smoke tests in CI.

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

The simulation suite currently runs **288 deterministic full-game bot simulations** across all three campaigns, multiple mission difficulties and every supported table size.

## Multiplayer signaling

Deploy the signaling Worker:

```bash
npx wrangler deploy
```

Then point the browser client at it from the multiplayer screen, or persist the URL with:

```js
localStorage.setItem('opencrew.signal', 'https://your-worker.example.workers.dev')
```

`src/multiplayer.js` owns session/WebRTC state. `src/game.js` owns authoritative rules. Guests submit actions such as `assign-task`, `communicate`, and `play-card`; the host validates and executes them. `stateForSeat()` removes other hands and the shuffle seed before a state snapshot is sent to a guest. The Relay Drone hand is intentionally public in two-slot mode.

`worker/signaling.js` stores only short-lived SDP/ICE messages in a per-room Durable Object. No game rules run in the signaling backend.

## Visual direction

The project keeps the useful interaction principles of the supplied SKAT baseline — cards remain visually dominant, active/blocked states are explicit, motion is short and physical, and mobile keeps the same visual language — but the casino materials have been replaced completely:

- **Helios Reach:** midnight navy, cyan telemetry, navigation grid and orbital instrumentation.
- **Abyssal Signal:** near-black teal, sonar rings, pressure displays and bioluminescent accents.
- **Emberline:** soot-black brown, copper storm-light, weather contours and airship instrumentation.

Cards remain light and tactile so the information hierarchy stays readable against all three environments.

## IP / inspiration boundary

OpenCrew does not include copied publisher artwork, logos, story text, mission-logbook prose, task-card layouts or named fictional systems. Campaign counts, names, mission titles, objective wording and the two-player helper are intentionally original. The project independently implements general cooperative trick-taking mechanics and develops them with digital-specific mission, AI and networking systems.
