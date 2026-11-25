# Sizzle & Serve — Rush Hour Kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/cipa69ai/cooking-game-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/cipa69ai/cooking-game-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A complete, original 2D cooking game that runs in a desktop browser from static
files — no build step, no network request. You are the only chef on a
three-minute dinner shift: take orders from the board, chop and cook each
ingredient, build dishes on the plating counter, and serve them before the
customers walk out.

## How to play

- **Click** a station to walk there and use it — or move with **WASD / arrow keys**
  and press **Space** to use the nearest station.
- **Keys 1–7** grab an ingredient from the bins (bun, patty, lettuce, tomato,
  cheese, pasta, sauce).
- **Chopping board**: lettuce, tomato and cheese need chopping first.
- **Stove**: patties and pasta cook on the two burners — take them off in the
  green window or they burn.
- **Plating counter**: drop prepared ingredients onto the plate to build a dish.
- **Serve**: click the order ticket (or the serving window) when the plate
  matches an order. Fast serves earn tips; serving in a row builds a combo
  multiplier up to x2.
- **Trash**: discard what you are carrying, or clear the plate.
- **P** pauses, **M** mutes. Three lost customers ends the shift early.

## Recipes

| Dish | Needs | Price |
| --- | --- | --- |
| Burger | bun + cooked patty + chopped lettuce | $80 |
| Garden Salad | chopped lettuce + chopped tomato + chopped cheese | $70 |
| Pasta Marinara | cooked pasta + sauce + chopped cheese | $90 |
| Deluxe Burger | bun + cooked patty + chopped lettuce + chopped tomato | $120 |

Orders arrive faster and patience runs shorter as the shift heats up. Reach
**400 coins for 3 stars**.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot states (deterministic, seeded) for the maker: `?shot=start`,
`?shot=play`, `?shot=serve`, `?shot=rush` (each with `&seed=1`).

## Layout

- `game/index.html` + `game/style.css` — page shell.
- `game/src/config.js` — tuning, recipes, stations, palette.
- `game/src/random.js` — seeded RNG.
- `game/src/audio.js` — synthesized WebAudio sound effects (no audio files).
- `game/src/state.js` — game state and its helpers.
- `game/src/logic.js` — movement, stations, cooking, orders, scoring.
- `game/src/render.js` — all canvas drawing.
- `game/src/shots.js` — screenshot demo states.
- `game/src/main.js` — bootstrap, input, game loop.
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`,
  writes `dossier.json` with the vendored make.fun library).
- `screenshots/` — 4 real renders of the game in a browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jm7qvfrf&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
