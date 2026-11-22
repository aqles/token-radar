# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aqles/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aqles/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A dashboard ranking pre-token protocols by implied launch value, from a sealed DefiLlama snapshot — with a farm plan for every protocol. The radar-4 model prices each protocol as TVL × peer multiple × fitted size multiplier × momentum × maturity × chain breadth. The size multiplier comes from a log-log curve fit at run time (log(mcap) = 6.9646 + 0.5223·log(TVL), ordinary least squares on 128 traded comparables), clamped to [0.5×, 2×] of the category peer multiple — the clamp keeps giants credible (Sentora: 0.2138× peer → 0.0327× unbounded curve → 0.104× adopted, $285.7M). Held out, leave-one-out on the 128 traded tokens, radar-4 predicts market caps with a median error of 3.96× against 5.53× for the peer multiple alone, winning 67.2% of comparisons; on the rankable-like subset (n=87) 3.96× vs 4.99×, win 67.8%. The unbounded curve is better held out still (3.23×) — the 2× bound is a stated prior, not a fit. Token odds are a fitted logistic on log TVL, 7-day growth and log chains, offset by the shrunk category rate (4-fold Brier 0.150 vs 0.154 for the v3 rate, AUC 0.650 vs 0.600); age is excluded because it rises mechanically with age. Momentum, maturity and chain breadth are disclosed sensitivities, not fitted factors — the blind test does not support them as value factors. Expected value is implied value times token odds. Wrapped, staked, bridged and stablecoin products are left out of the board and listed with their reasons; the two stablecoins on the watchlist stay on the board, flagged, because the watchlist is the floor. No walk-forward claim: the snapshot is a single date (2026-11-14), and no FDV field exists in it.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
```

`main.ts` reads the sealed snapshot (the grader mounts it at `/input/snapshot.json`), writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/`. It writes `out/dossier.json` last. Node 22, standard library only, no network.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7ghbcrz6&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
