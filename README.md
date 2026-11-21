# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aqles/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aqles/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A dashboard ranking pre-token protocols by implied launch value, from a sealed DefiLlama snapshot — with a farm plan for every protocol. The radar-2 model prices each protocol off its own category's market multiple, its seven-day momentum, its age without a token, and its chain breadth. Wrapped, staked and bridged products are left out of the board and listed with their reasons.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
```

`main.ts` reads the sealed snapshot (the grader mounts it at `/input/snapshot.json`), writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/`. It writes `out/dossier.json` last. Node 22, standard library only, no network.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7ghbcrz6&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
