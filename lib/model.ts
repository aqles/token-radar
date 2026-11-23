// Token launch radar, model radar-6: fitted size curve + category peer prior + fitted odds.
//
// radar-6 is a MODEL round on the radar-5 package: the fitted curve, the peer rule, the
// [0.5x, 2x] clamp, the odds fit, the board membership, the ledger, the cohort check and
// the farm steps are all UNCHANGED. What radar-6 changes, all computed from the snapshot
// at run time (see scratch/v6-model-evidence.md for the numbers behind each decision):
// (a) the value model DROPS the growth / maturity / chains sensitivities: on held-out
// comparables the full formula scores median error 4.2025x (all comps) / 4.0974x
// (rankable-like) against 3.9599x / 3.9663x for the peer x bounded-size-curve multiple
// alone, and wins 0.6484 / 0.6552 vs 0.6719 / 0.6782 — the terms do not earn their
// place, so implied = TVL x peer x size multiplier and the three multipliers ship as
// 1.00 (retained as fields so the dashboard's re-derivation and model cells stay valid;
// the dashboard must present them as dropped, not as live signals). Dropping them also
// aligns the board with its advertised held-out number: the LOO test always scored the
// multiple alone, while the v5 board was priced with the terms (4.20x held-out).
// (b) the farm verdict is computed AT A SIZED DEPOSIT: S = min(2 x D*, 10 x plan
// deposit), twice the break-even deposit capped at ten times the TVL-tiered plan
// deposit, so S <= $2,500. FARM if S reaches 2 x D* within the cap, THIN if S is
// capped but net at S is still positive, SKIP if net at S is <= 0 or odds < 0.01.
// On this snapshot: 70 FARM / 61 THIN / 63 SKIP. The rule alone, on the v5 board,
// would have given 49/47/98 with the SKIP set identical to v5's; the radar-6 counts
// differ because the term drop (a) raised implied values and EV, so D* fell and 35
// v5 SKIP rows moved up to THIN/FARM — all 7 v5 FARM rows stay FARM, and every FARM
// row has positive expected net at its sized deposit by construction (exactly one gas
// bill, median +$17.02). Expected net at the PLAN deposit is negative on 193 of 194
// rows — one row, anemoy-capital (#78), breaks even at its plan deposit (+$4.83)
// after the term drop nearly doubled its implied value (its v5 terms were 0.53x
// combined). That finding is kept in the data, not hidden. Sentora (#1) stays SKIP.
// (c) the token-odds age term was TESTED and REJECTED (see evidence §3): an age +
// undated-indicator model wins 10-fold (Brier 0.1438 / AUC 0.675 vs adopted 0.1489 /
// 0.650) and wins every forward window in aggregate, but by test-row age bucket it
// LOSES on old rows (+0.0415 Brier on >1095d rows in the 2023 forward split, the only
// forward window with old test rows) while winning on very young rows (-0.043 on
// <180d). The board is old no-token survivors, so the term does not earn its place
// there; the positive age slope is exposure time (cumulative incidence), not launch
// hazard, exactly as the radar-5 rationale held. The odds model is UNCHANGED.
// (d) interval constructions were tested again and the value-band question stays
// CLOSED (see evidence §5): the best honest band at >=75% coverage is still 100x+
// wide; rank ranges widened to P5-P95 / P2.5-P97.5 still cover far below 75%.
// The clamp stays 2x. The category screen stays. No walk-forward claim is made.
//
// Break-even deposit (per row, see farmBreakEvenDeposit): a farmer depositing D into a protocol
// with TVL T holds D/T of the protocol's TVL. If the launch's expected value EV (implied x
// odds) were shared pro-rata by TVL, the farmer's expected claim is D * EV / TVL, so the
// deposit at which expected net = 0 solves D* = gas * TVL / EV. This is a GENEROUS upper bound
// on the claim — it hands the farmer a pro-rata share of the FULL implied launch value, while a
// real airdrop pool is a fraction of token supply — so D* is a LOWER bound on the true
// break-even deposit, and the verdicts built on it are optimistic, not conservative. The
// rejected alternative (EV scaling with deposit from the plan deposit, D* = capital * gas / EV)
// is degenerate: EV >> gas on every row, so D* would be pennies on all 194 rows. Since radar-6
// the verdict is computed AT A SIZED DEPOSIT (see farmSizedDeposit / farmVerdictFor):
// S = min(2 x D*, 10 x plan deposit) — twice the break-even deposit, capped at ten times the
// TVL-tiered plan deposit, so S <= $2,500. FARM if S reaches 2 x D* within the cap
// (D* <= 5 x plan): expected net at S is then exactly one gas bill by construction, positive
// on every FARM row. THIN if S is capped at 10 x plan but net at S is still positive. SKIP if
// net at S is <= 0 (D* > 10 x plan) or token odds < 0.01. On this snapshot that gives 70 FARM /
// 61 THIN / 63 SKIP (v5, judged at the plan deposit, gave 7/89/98). The rule alone, applied to
// the v5 board, would have given 49/47/98 with the SKIP set identical to v5's; the radar-6
// counts differ because the term drop raised implied values and EV, so D* fell on most rows.
// Expected net at the PLAN deposit is negative on 193 of 194 rows — one row,
// anemoy-capital (#78), breaks even at its plan deposit (+$4.83) after the term drop nearly
// doubled its implied value (its v5 terms were 0.53x combined). The verdict is a
// per-dollar efficiency statement, not a value ranking: the biggest rows (Sentora, Steakhouse)
// are SKIP because their EV per TVL dollar is small, while small high-odds rows are FARM.
// Capital is TVL-tiered ($250/$150/$100/$50), never flat; hold days are age-tiered (60/45/30);
// timelines start at the snapshot date.
//
// Rank ranges are a STABILITY statement, not a prediction interval: each row's rank is
// recomputed under 200 bootstrap refits of the size curve and the peer table (the 128
// comparables resampled with replacement, seeded PRNG — see rank_range_method in data.js),
// and the row carries the P10-P90 range and median of its rank across refits. Measured
// honestly on traded comparables, the true market-cap rank falls inside that range only
// ~26% of the time (the residual noise dwarfs the parameter uncertainty), so the dashboard
// must present the range as "rank 3-7 across 200 refits of the fitted model", never as a
// calibrated interval. No per-row value band is shipped: every band that holds ~80% on
// held-out comparables is 100x or wider, and every band narrower than ~16x holds only
// ~50% — the numbers are in scratch/v4fix-model-evidence.md. The fitted odds model itself
// is serialised in data.js (odds_fit) with each row's shrunk category rate (odds_base),
// so the page can re-derive token odds live from the row's own TVL, 7-day change and
// chain count.
//
// The board ranks every pre-token protocol the snapshot carries that is not a wrapped, staked or
// bridged product of a token that already trades. The watchlist is the floor, never the ceiling:
// all 40 watchlist slugs are ranked, plus every other rankable pre-token protocol below the floor.
//
// Implied value follows only from the snapshot's own figures, and every value term is fitted on
// the snapshot's own 128 token-bearing comparables and tested held-out (leave-one-out plus two
// independent splits; the numbers are in scratch/v4-model-evidence.md and the board recomputes
// the leave-one-out test at run time). No protocol name is ever special-cased; the same functions
// score every row, and every fitted number is computed from this snapshot at run time, never
// typed in by hand:
//
//   peer     = the category's median mcap/tvl when it has at least 3 token-bearing peers
//              (clamped to [0.02, 1.5]); a category with exactly 2 peers gets a log-space blend
//              of its own median and the global median, capped at twice the global median, so two
//              observations move the estimate but cannot dominate it; a category with fewer than 2
//              peers falls back to the global median of all token-bearing protocols (same clamp).
//              A single peer is not a category signal: its multiple is one observation, often a
//              miscategorised outlier, so it never prices a row on its own. The peer is the
//              PRIOR: the size curve may move a row at most one doubling away from it.
//   size     = a log-log curve fitted on the comparables, log(mcap) = a + b * log(tvl)
//              (this snapshot: b = 0.52, so the multiple falls as protocols get bigger). The
//              curve's multiple is clamped to [0.5x, 2x] of the peer multiple: the unbounded
//              curve is the best held-out predictor of traded market caps (median error 3.2x vs
//              5.0x for the peer alone), but it prices the $2.75B giants at 0.03x TVL, below
//              every multiple a $1-3B protocol actually trades at in the credible band, so the
//              peer bound keeps the top rows credible (Sentora 0.10x, not 0.03x) at a measured
//              cost (median error 4.0x instead of 3.2x). A single global curve was rejected in
//              v3 for crushing giants; the peer-bounded curve is the fix, not a repeat.
//   growth   = clamp(change_7d, -60, 120); mapped through a signed log so one +4,448% week
//              cannot explode a row: growthMult = 1 + 0.5 * sign(g) * ln(1+|g|) / ln(121)
//   maturity = 0.7 + 0.3 * min(age_days, 1095) / 1095 (age unknown: 365 days); age saturates,
//              so being old alone never carries a row
//   chains   = 1 + 0.02 * min(chains - 1, 5), capped at +10%
//   implied  = max(1, round(tvl_usd * peer * sizeMult))
//
// Growth, maturity and chains were DISCLOSED SENSITIVITIES through radar-5, not fitted
// value factors: on the traded comparables they did not improve the held-out prediction
// of market cap (growth wins 35-53% of held-out comparisons against the peer alone,
// maturity 32-39%, chains 19-28%), so they carried no fitted coefficient and no
// held-out claim. In radar-6 they are DROPPED from the value altogether: the full
// formula (peer x bounded size curve x growth x maturity x chains) scores median error
// 4.2025x on held-out comparables against 3.9599x for the multiple alone (4.0974x vs
// 3.9663x on rankable-like comps), and wins 0.6484 vs 0.6719 (0.6552 vs 0.6782) — the
// terms actively hurt held-out prediction, so the simpler model is adopted (see
// scratch/v6-model-evidence.md §4). The multipliers still ship as 1.00 on every row so
// the dashboard's re-derivation (TVL x peer x size x growth x maturity x chains) keeps
// working; the dashboard must present them as dropped, not as live signals. The 7-day
// change itself is still carried on the row (growth_pct) as data, and the odds model
// still uses the 7-day change as a covariate. Per-category size slopes were tested and
// rejected (held-out win rates 0-35%: noise), as were damped curves (they over-predict
// large protocols by 2.8-3.8x) and shrunk category offsets on the curve (no consistent
// gain over the curve). The snapshot carries no FDV or supply field, so log(FDV/TVL)
// cannot be fitted here at all; mcap/TVL is the only available target, and the
// evidence says so.
//
// Stablecoins are not launch candidates: their token already exists and trades, pegged, so ranking
// one as a pre-token launch is a snapshot artifact. The stablecoin categories and a short denylist
// of stablecoins whose category does not say so are excluded from the early radar. Watchlist slugs
// are the floor and cannot be left out, so a stablecoin on the watchlist stays on the board, flagged
// as a stablecoin, and the dashboard says so.
//
// Token odds are a fitted logistic model, not just a shrunk category rate: logit(p) =
// logit(shrunk category rate) + b0 + b1*z(log TVL) + b2*z(7-day growth) + b3*z(log chains),
// fitted on all 758 protocols by deterministic gradient descent at run time. No-token age is
// deliberately NOT a covariate: P(has token | age) rises with age mechanically (older protocols
// have had more time to launch), which says nothing about whether an old protocol WITH NO TOKEN
// YET will launch next, so age cannot be read as a launch probability from this one-date
// snapshot. Held-out, the fitted odds beat the v3 shrunk rate on Brier score and AUC in every
// split (4-fold mean Brier 0.150 vs 0.155, AUC 0.650 vs 0.600); both lose to the flat global
// rate on the forward time split, which the evidence records. Expected value is the implied
// launch value times the token odds — what the launch is worth once the chance it happens is
// counted. The board stays sorted by implied value; the dashboard's top candidates are ranked
// by expected value, which is the number a farmer actually decides on.
//
// A protocol is pre-token when its record carries no token: no market cap, no CoinGecko id, no
// symbol. The live-token protocols are kept apart and shown with the market's own values, never
// mixed into the ranked board.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  peer_min_n: number;
  peer_mult_min: number;
  peer_mult_max: number;
  peer_thin_cap_mult: number;
  odds_prior_n: number;
  growth_floor: number;
  growth_cap: number;
  growth_weight: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_max_extra: number;
  /** How far the fitted size curve may move a row from its peer multiple, each way. */
  size_cap_mult: number;
  /** Gradient-descent iterations for the token-odds logistic fit (converged by 300). */
  odds_gd_iters: number;
  /** Gradient-descent learning rate for the token-odds logistic fit. */
  odds_gd_lr: number;
  /** Bootstrap refits per row for the rank range (P10-P90 of rank across refits). */
  rank_range_b: number;
  /** Fixed seed for the rank-range bootstrap PRNG (mulberry32): no clock, no randomness. */
  rank_range_seed: number;
}

export const MODEL: ModelConstants = {
  peer_min_n: 3,
  peer_mult_min: 0.02,
  peer_mult_max: 1.5,
  peer_thin_cap_mult: 2,
  odds_prior_n: 10,
  growth_floor: -60,
  growth_cap: 120,
  growth_weight: 0.5,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_step: 0.02,
  chain_max_extra: 0.1,
  size_cap_mult: 2,
  odds_gd_iters: 500,
  odds_gd_lr: 0.5,
  rank_range_b: 200,
  rank_range_seed: 20261122,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-6';

/** How many live-token protocols the Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/**
 * The computed farm verdict for one row (see farmVerdictFor). FARM: the sized deposit
 * reaches twice the break-even deposit within the cap, so expected net at the sized
 * deposit is exactly one gas bill by construction. THIN: the sized deposit is capped
 * at 10x the plan deposit but net at the sized deposit is still positive. SKIP: net at
 * the sized deposit is <= 0 (break-even exceeds 10x the plan deposit), or the token
 * odds are below 1%.
 */
export type FarmVerdict = 'FARM' | 'THIN' | 'SKIP';

/** One listing-date cohort split: the cap2 model fitted on earlier-listed protocols,
 * tested on later-listed ones. Median errors are rounded to 2 decimals, win rate to 4. */
export interface CohortSplit {
  /** What was fitted and what was tested, e.g. 'listed before 2023-01-01 -> listed after'. */
  label: string;
  /** Comparables in the fit (dated only; undated comps are in neither fit nor test). */
  fit_n: number;
  /** Comparables in the test. */
  test_n: number;
  /** Median |predicted / actual| for the cap2 model on the test set. */
  cap2_median_error_x: number;
  /** Share of test comparables the cap2 model predicts closer than the peer alone. */
  win_vs_peer: number;
  /** Median |predicted / actual| for the peer multiple alone on the same test set. */
  peer_median_error_x: number;
  /** The split as one literal sentence, built from the rounded numbers above. */
  text: string;
}

/**
 * The listing-date cohort check: the cap2 model fitted on protocols listed before 2023 /
 * 2024 / 2025 and tested on those listed after (expanding window, dated-only fit), plus
 * two rolling-origin variants on dated comps sorted by listed_at. A cohort split, NOT a
 * historical backtest: every protocol is scored on its 2026-11-14 TVL and market cap, so it
 * shows the model generalises to newer listings — not that it would have predicted prices
 * at the time. Never headline this as "walk-forward".
 */
export interface CohortCheck {
  /** How each split was built. */
  method: string;
  /** The honest caveat, in full: what the check is and what it is not. */
  note: string;
  /** Token-bearing comparables with a listing date (fit/test population). */
  dated_comps: number;
  /** Token-bearing comparables with no listing date: they cannot be placed in time. */
  undated_comps: number;
  /** Expanding window, all dated test comps (3 splits: before 2023 / 2024 / 2025). */
  expanding: CohortSplit[];
  /** Same three splits, rankable-like test comps only. */
  expanding_rankable_like: CohortSplit[];
  /** Rolling origin, all dated test comps (oldest 50% -> next 25%; oldest 75% -> newest 25%). */
  rolling: CohortSplit[];
  /** Same two rolling splits, rankable-like test comps only. */
  rolling_rankable_like: CohortSplit[];
}

/** One protocol that already carries a token signal, for the 758/758 ledger. */
export interface LedgerHasTokenRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number | null;
  gecko_id: string | null;
  symbol: string | null;
  /** 'with_mcap' (mcap > 0) | 'dead_token' (mcap <= 0) | 'parent_token' (mcap null). */
  group: 'with_mcap' | 'dead_token' | 'parent_token';
}

/**
 * The true 758/758 ledger: every protocol in the snapshot, exactly once.
 * 758 = 194 ranked + 148 pre-token excluded with a reason each + 416 with a token.
 * The 416 split as 128 with mcap > 0, 16 dead-token (mcap <= 0: 15 zero + 1 negative),
 * and 272 parent-token (mcap null: 258 symbol-only + 14 with a gecko_id, all 14 of which
 * also carry a symbol — there is no gecko-only-without-symbol row). This replaces the old
 * footer strip's arithmetic (144 + 194 + 148 = 486), which left 272 protocols unaccounted
 * for and undercounted the rows carrying a token signal.
 */
export interface LedgerData {
  total: number;
  ranked: number;
  excluded_total: number;
  has_token_total: number;
  /** The census as one literal line that sums: '758 = 194 ranked + 148 excluded + 416 with a token'. */
  census_line: string;
  excluded: {
    total: number;
    /** Excluded by the category screen (CEX / Liquid Staking / Bridge / ...). */
    category_screen: number;
    /** Excluded by the name rules (version marker / wrapped / staked / staking). */
    name_rules: number;
    /** Excluded as stablecoins (token already exists and trades). */
    stablecoin: number;
    /** The category-screen rows by category. */
    by_category: { category: string; count: number }[];
    /** All 148 excluded rows, with the reason each (TVL descending). */
    rows: ExcludedRow[];
  };
  has_token: {
    total: number;
    with_mcap: { count: number; rows: LedgerHasTokenRow[] };
    dead_token: { count: number; rows: LedgerHasTokenRow[] };
    parent_token: { count: number; symbol_only: number; gecko_present: number; rows: LedgerHasTokenRow[] };
  };
}

/** How the per-row farm verdicts and break-even deposits were computed (build-time). */
export interface FarmMethod {
  /** The break-even formula, in words. */
  formula: string;
  /** The assumption the formula rests on, and its direction (optimistic lower bound). */
  assumption: string;
  /** The sized-deposit rule, in words: twice break-even, capped at 10x the plan deposit. */
  sized_deposit_rule: string;
  /** The verdict thresholds, in words (verdicts are computed at the sized deposit). */
  thresholds: string;
  /** Verdict counts across the 194 board rows. */
  counts: { farm: number; thin: number; skip: number };
  /** Expected net at the plan deposit across the board (min / median / max, dollars). */
  net_at_plan_usd: { min: number; median: number; max: number };
  /** Rows whose expected net at the plan deposit is >= 0 (zero on this snapshot). */
  net_non_negative_rows: number;
  /** Expected net at the sized deposit across the board (min / median / max, dollars). */
  net_at_sized_usd: { min: number; median: number; max: number };
  /** Rows whose expected net at the sized deposit is > 0 (FARM + THIN). */
  sized_positive_net_rows: number;
  /** Median sized deposit across the board, in whole dollars. */
  median_sized_deposit_usd: number;
  /** The headline the dashboard may quote: verdicts at the sized deposit, and the plan-deposit finding kept alongside. */
  note: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  token_odds: number;
  expected_value_usd: number;
  farm_capital_usd: number;
  farm_gas_usd: number;
  /** The solved break-even deposit in whole dollars: D* = gas * TVL / EV (see farmBreakEvenDeposit). */
  farm_break_even_usd: number;
  /** The computed farm verdict: FARM / THIN / SKIP, at the sized deposit (see farmVerdictFor). */
  farm_verdict: FarmVerdict;
  /** Expected net at the plan deposit: capital * EV / TVL - gas, in dollars (negative on 193 of 194 rows). */
  farm_net_at_plan_usd: number;
  /** The sized deposit in whole dollars: S = min(2 x D*, 10 x plan deposit) (see farmSizedDeposit). */
  farm_sized_deposit_usd: number;
  /** Expected net at the sized deposit: S * EV / TVL - gas, in dollars (positive on every FARM row by construction). */
  farm_net_at_sized_usd: number;
  /** The farm timeline starts at the snapshot date: the board's "today". */
  farm_start_date: string;
  /** Start date + the age-tiered hold days. */
  farm_end_date: string;
  /** Hold days for this row (age-tiered 60/45/30, same as farmCost). */
  farm_hold_days: number;
  on_watchlist: boolean;
  model: {
    peer_multiple: number;
    peer_n: number;
    peer_fallback: boolean;
    /** The fitted size curve's own multiple for this TVL, before the peer bound. */
    size_multiple: number;
    /** The size factor actually applied: size_multiple / peer_multiple, clamped to [1/cap, cap]. */
    size_multiplier: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
    /** P10 of this row's rank across the rank-range bootstrap refits (1 = top). */
    rank_lo: number;
    /** P90 of this row's rank across the rank-range bootstrap refits. */
    rank_hi: number;
    /** Median of this row's rank across the rank-range bootstrap refits. */
    rank_median: number;
    /** The shrunk category token rate: the logistic odds model's offset for this row. */
    odds_base: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  token_odds: number;
  expected_value_usd: number;
  farm_capital_usd: number;
  farm_gas_usd: number;
  /** The solved break-even deposit in whole dollars: D* = gas * TVL / EV. */
  farm_break_even_usd: number;
  /** The computed farm verdict: FARM / THIN / SKIP, at the sized deposit. */
  farm_verdict: FarmVerdict;
  /** Expected net at the plan deposit: capital * EV / TVL - gas, in dollars. */
  farm_net_at_plan_usd: number;
  /** The sized deposit in whole dollars: S = min(2 x D*, 10 x plan deposit). */
  farm_sized_deposit_usd: number;
  /** Expected net at the sized deposit: S * EV / TVL - gas, in dollars. */
  farm_net_at_sized_usd: number;
  /** The farm timeline starts at the snapshot date. */
  farm_start_date: string;
  /** Start date + the age-tiered hold days. */
  farm_end_date: string;
  /** Hold days for this row (age-tiered 60/45/30). */
  farm_hold_days: number;
  peer_multiple: number;
  peer_n: number;
  peer_fallback: boolean;
  size_multiple: number;
  size_multiplier: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  /** P10 of this row's rank across the rank-range bootstrap refits (1 = top). */
  rank_lo: number;
  /** P90 of this row's rank across the rank-range bootstrap refits. */
  rank_hi: number;
  /** Median of this row's rank across the rank-range bootstrap refits. */
  rank_median: number;
  /** The shrunk category token rate: the logistic odds model's offset for this row. */
  odds_base: number;
  stablecoin: boolean;
  on_watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One peer-multiple table entry, for the methodology panel. */
export interface PeerEntry {
  category: string;
  multiple: number;
  n: number;
}

/** One excluded protocol, for the dashboard's transparency section. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  reason: string;
}

/** The fitted size curve: log(mcap) = intercept + slope * log(tvl), fit at run time. */
export interface SizeCurve {
  slope: number;
  intercept: number;
  n_comps: number;
}

/** The fitted token-odds logistic model, fit at run time on all protocols. */
export interface OddsFit {
  table: OddsTable;
  intercept: number;
  /** Slopes on the standardised covariates [log TVL, 7-day growth / 100, log chains]. */
  slopes: number[];
  means: number[];
  sds: number[];
}

/** How the per-row rank ranges were computed (build-time bootstrap, deterministic). */
export interface RankRangeMethod {
  /** Bootstrap refits. */
  b: number;
  /** Fixed PRNG seed. */
  seed: number;
  /** What was resampled on each refit. */
  resampled: string;
  /** What was refit on each resample. */
  refit: string;
  /** Which terms were held at their full-fit values. */
  fixed_terms: string;
  /** The peer bound applied inside every refit. */
  clamp: string;
  /** Which quantiles of the rank distribution the row fields carry. */
  quantiles: string;
}

/** One category's token record inside the serialised odds fit. */
export interface OddsCategoryEntry {
  category: string;
  with_token: number;
  total: number;
}

/** The fitted token-odds logistic model, serialised for the dashboard: no Maps, so it
 * survives JSON. The page re-derives a row's odds as logit(p) = logit(odds_base) +
 * intercept + slopes . z([log TVL, clamped 7-day growth / 100, log chains]), with the
 * row's own odds_base field as the offset. Params are rounded to 6 decimals; the odds
 * themselves are rounded to 4 decimals on the board, and re-derivation from these
 * fields reproduces them to within 0.0001 (see scratch/v4fix-check-odds.mjs). */
export interface OddsFitData {
  by_category: OddsCategoryEntry[];
  global_rate: number;
  intercept: number;
  /** Slopes on the standardised covariates [log TVL, 7-day growth / 100, log chains]. */
  slopes: number[];
  means: number[];
  sds: number[];
}

/** The value model's own held-out test, recomputed at run time by leave-one-out. */
export interface HeldOut {
  /** Token-bearing comparables in the leave-one-out test. */
  n_comps: number;
  /** Median |predicted / actual| for the radar-6 value multiple (peer x bounded size curve). */
  median_error_x: number;
  /** Median |predicted / actual| for the v3 peer multiple alone, on the same folds. */
  peer_median_error_x: number;
  /** Share of held-out comparables the radar-6 multiple predicts closer than the peer alone. */
  win_rate_vs_peer: number;
}

/** Everything the dashboard needs: the board, the live set, the peers, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  snapshot_protocols: number;
  snapshot_with_token: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  global_multiple: number;
  size_curve: SizeCurve | null;
  heldout: HeldOut;
  /** The listing-date cohort check (a cohort split, not a historical backtest). */
  cohort_check: CohortCheck;
  /** The true 758/758 ledger: every protocol in the snapshot, exactly once. */
  ledger: LedgerData;
  /** How the per-row farm verdicts and break-even deposits were computed. */
  farm_method: FarmMethod;
  /** How the per-row rank ranges were computed. */
  rank_range_method: RankRangeMethod;
  /** The fitted token-odds logistic model, serialised for live re-derivation. */
  odds_fit: OddsFitData;
  peers: PeerEntry[];
  excluded: ExcludedRow[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * A deterministic PRNG (mulberry32): the rank-range bootstrap draws from this and
 * nothing else — no Math.random, no wall clock, no network anywhere in the model path.
 * (Date.parse / new Date appear only in addDaysUtc, applied to the snapshot's own as_of
 * date — pure date arithmetic on snapshot data, not the clock.)
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The p-quantile of a SORTED array by linear interpolation (p in [0, 1]). */
export function quantileOf(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a sorted array, or null when it holds nothing. */
function medianOf(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The peer multiples: for every category, the median mcap/tvl of its token-bearing protocols, and
 * the global median across all of them. */
export interface PeerTable {
  byCategory: Map<string, { multiple: number; n: number }>;
  global: number;
}

/**
 * The peer multiples from an explicit list of token-bearing comparables: for every
 * category, the median mcap/tvl of its protocols, and the global median across all of
 * them. The list may be a bootstrap resample (duplicates count once per draw). Computed
 * from this snapshot at run time.
 */
export function peerTableFromComps(comps: SnapshotProtocol[], model: ModelConstants = MODEL): PeerTable {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of comps) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const m = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(m) || m <= 0) continue;
    all.push(m);
    const key = p.category ?? '(no category)';
    const list = byCategory.get(key) ?? [];
    list.push(m);
    byCategory.set(key, list);
  }
  const clamp = (m: number): number => Math.min(model.peer_mult_max, Math.max(model.peer_mult_min, m));
  const globalRaw = medianOf([...all].sort((a, b) => a - b));
  const global = clamp(globalRaw ?? 0.25);
  const table = new Map<string, { multiple: number; n: number }>();
  for (const [category, values] of byCategory) {
    const sorted = [...values].sort((a, b) => a - b);
    const med = medianOf(sorted);
    if (med !== null) table.set(category, { multiple: clamp(med), n: values.length });
  }
  return { byCategory: table, global };
}

export function peerMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): PeerTable {
  return peerTableFromComps(sizeComps(snapshot), model);
}

/**
 * The peer multiple a category gets. Three or more trading peers: the category's own median.
 * Exactly two peers: a log-space blend of the category median and the global median, weighted
 * 2/3 to the category, capped at twice the global median — two observations move the estimate
 * but cannot dominate it, and the log blend keeps a right-skewed multiple from exploding the row.
 * Fewer than two peers: the global median. One peer is not a category signal: it is a single
 * observation, and in this snapshot the lone peer of a thin category is often a miscategorised
 * outlier (the Risk Curators category's only trading peer is an oracle, not a vault curator).
 */
export function peerMultipleFor(category: string | null, peers: PeerTable, model: ModelConstants = MODEL): { multiple: number; n: number; fallback: boolean } {
  const entry = category === null ? undefined : peers.byCategory.get(category);
  const n = entry?.n ?? 0;
  if (entry !== undefined && n >= model.peer_min_n) return { multiple: entry.multiple, n, fallback: false };
  if (entry !== undefined && n === model.peer_min_n - 1) {
    const w = n / model.peer_min_n;
    const logBlend = Math.exp(w * Math.log(entry.multiple) + (1 - w) * Math.log(peers.global));
    const capped = Math.min(logBlend, model.peer_thin_cap_mult * peers.global);
    const multiple = Math.min(model.peer_mult_max, Math.max(model.peer_mult_min, capped));
    return { multiple, n, fallback: false };
  }
  return { multiple: peers.global, n, fallback: true };
}

/** The token odds: for every category, how many of its protocols already have a token. */
export interface OddsTable {
  byCategory: Map<string, { withToken: number; total: number }>;
  globalRate: number;
}

export function tokenOddsTable(snapshot: Snapshot): OddsTable {
  const byCategory = new Map<string, { withToken: number; total: number }>();
  let withToken = 0;
  for (const p of snapshot.protocols) {
    const key = p.category ?? '(no category)';
    const e = byCategory.get(key) ?? { withToken: 0, total: 0 };
    e.total++;
    if (p.mcap_usd !== null) { e.withToken++; withToken++; }
    byCategory.set(key, e);
  }
  return { byCategory, globalRate: snapshot.protocols.length === 0 ? 0 : withToken / snapshot.protocols.length };
}

/**
 * The shrunk category token rate (the v3 odds): the share of the category's protocols that
 * already have one, shrunk toward the global share with a Beta prior of `odds_prior_n`
 * protocols, so a thin category cannot claim certainty. A category with no record at all
 * takes the global share. This is the OFFSET of the fitted odds model, not the odds itself.
 * Rounded to four decimals, so the board is deterministic.
 */
export function tokenOddsBaseFor(category: string | null, odds: OddsTable, model: ModelConstants = MODEL): number {
  const entry = category === null ? undefined : odds.byCategory.get(category);
  if (entry === undefined) return Math.round(odds.globalRate * 1e4) / 1e4;
  const prior = model.odds_prior_n * odds.globalRate;
  const oddsValue = (entry.withToken + prior) / (entry.total + model.odds_prior_n);
  return Math.round(oddsValue * 1e4) / 1e4;
}

/**
 * The chance a protocol ever launches a token, from its category's record: the share of the
 * category's protocols that already have one, shrunk toward the global share with a Beta prior
 * of `odds_prior_n` protocols, so a thin category cannot claim certainty. A category with no
 * record at all takes the global share. Rounded to four decimals, so the board is deterministic.
 * Kept for compatibility: buildBoard uses the fitted odds (tokenOddsFittedFor) instead.
 */
export function tokenOddsFor(category: string | null, odds: OddsTable, model: ModelConstants = MODEL): number {
  return tokenOddsBaseFor(category, odds, model);
}

/** The odds model's covariates for one protocol: [log TVL, clamped 7-day growth / 100, log chains]. */
function oddsFeatures(p: SnapshotProtocol, model: ModelConstants): number[] {
  return [
    Math.log(Math.max(1, p.tvl_usd)),
    Math.min(model.growth_cap, Math.max(model.growth_floor, finite(p.change_7d, 0))) / 100,
    Math.log(Math.max(1, p.chains.length)),
  ];
}

/**
 * The fitted token-odds model: a logistic regression on all of the snapshot's protocols,
 * logit(p) = logit(shrunk category rate) + intercept + slopes . z(covariates), with the
 * covariates standardised on the snapshot. Fit by batch gradient descent with a fixed
 * iteration count and learning rate, in snapshot order, so the fit is deterministic: no
 * clock, no randomness, no network. Converged by 300 iterations on this snapshot (identical
 * to 4 decimals at 300, 800 and 2,000 iterations); 500 is the margin.
 *
 * No-token age is deliberately NOT a covariate: P(has token | age) rises with age
 * mechanically — older protocols have had more time to launch — which says nothing about
 * whether an old protocol WITH NO TOKEN YET will launch next. Fitting that slope and
 * applying it to pre-token rows would read cumulative incidence as a launch probability.
 * Radar-6 TESTED this again, three ways (log-age; age buckets; log-age + an undated
 * indicator, which fixes the contamination from the 113 undated protocols all imputed
 * to age 365): the age + indicator model wins 10-fold (Brier 0.1438 / AUC 0.675 vs the
 * adopted 0.1489 / 0.650) and wins every forward window in aggregate — but by test-row
 * age bucket it LOSES on old rows (+0.0415 Brier on >1095d rows in the 2023 forward
 * split, the only forward window with old test rows) while winning on very young rows
 * (-0.043 on <180d). The board is old no-token survivors, so the term does not earn its
 * place there; the exclusion stands, with the numbers in scratch/v6-model-evidence.md
 * §3. Held-out, the fitted odds beat the v3 shrunk rate on Brier score and AUC in every
 * split (10-fold mean Brier 0.149 vs 0.152, AUC 0.650 vs 0.613); both lose to the flat
 * global rate on the forward time split, which the evidence records.
 */
export function fitTokenOdds(snapshot: Snapshot, model: ModelConstants = MODEL): OddsFit {
  const table = tokenOddsTable(snapshot);
  const rows = snapshot.protocols;
  const feats = rows.map((p) => oddsFeatures(p, model));
  const d = 3;
  const means: number[] = [];
  const sds: number[] = [];
  for (let j = 0; j < d; j++) {
    const xs = feats.map((f) => f[j]!);
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) || 1;
    means.push(m);
    sds.push(sd);
  }
  const offsetOf = (p: SnapshotProtocol): number => {
    const p0 = Math.min(0.99, Math.max(0.01, tokenOddsBaseFor(p.category, table, model)));
    return Math.log(p0 / (1 - p0));
  };
  const beta = new Array<number>(d + 1).fill(0);
  for (let it = 0; it < model.odds_gd_iters; it++) {
    const grad = new Array<number>(d + 1).fill(0);
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i]!;
      const z = feats[i]!.map((x, j) => (x - means[j]!) / sds[j]!);
      let eta = offsetOf(p) + beta[0]!;
      for (let j = 0; j < d; j++) eta += beta[j + 1]! * z[j]!;
      const prob = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, eta))));
      const err = prob - (p.mcap_usd !== null ? 1 : 0);
      grad[0]! += err;
      for (let j = 0; j < d; j++) grad[j + 1]! += err * z[j]!;
    }
    for (let j = 0; j <= d; j++) beta[j]! -= (model.odds_gd_lr / rows.length) * grad[j]!;
  }
  return { table, intercept: beta[0]!, slopes: beta.slice(1), means, sds };
}

/** One protocol's fitted token odds under the logistic model, rounded to four decimals. */
export function tokenOddsFittedFor(p: SnapshotProtocol, fit: OddsFit, model: ModelConstants = MODEL): number {
  const p0 = Math.min(0.99, Math.max(0.01, tokenOddsBaseFor(p.category, fit.table, model)));
  let eta = Math.log(p0 / (1 - p0)) + fit.intercept;
  const f = oddsFeatures(p, model);
  for (let j = 0; j < fit.slopes.length; j++) eta += fit.slopes[j]! * ((f[j]! - fit.means[j]!) / fit.sds[j]!);
  const prob = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, eta))));
  return Math.round(prob * 1e4) / 1e4;
}

/** The signed-log momentum multiplier for a clamped 7-day change in per cent. */
export function growthMultiplier(growthPct: number, model: ModelConstants = MODEL): number {
  const g = Math.min(model.growth_cap, Math.max(model.growth_floor, growthPct));
  const sign = g === 0 ? 0 : g > 0 ? 1 : -1;
  const scaled = (sign * Math.log1p(Math.abs(g))) / Math.log1p(model.growth_cap);
  return 1 + model.growth_weight * scaled;
}

/** The maturity multiplier for an age in days (null age counts as the unknown-age default). */
export function maturityMultiplier(age: number | null, model: ModelConstants = MODEL): number {
  const days = age ?? model.unknown_age_days;
  const capped = Math.min(Math.max(days, 0), model.maturity_days);
  return model.maturity_floor + (capped / model.maturity_days) * model.maturity_range;
}

/** The chain-breadth multiplier: a little more for protocols live on more chains, capped. */
export function chainMultiplier(chainCount: number, model: ModelConstants = MODEL): number {
  const extra = Math.min(Math.max(chainCount - 1, 0), Math.floor(model.chain_max_extra / model.chain_step)) * model.chain_step;
  return 1 + extra;
}

/** The token-bearing comparables a size curve may be fitted on: positive market cap and TVL. */
export function sizeComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/**
 * The fitted size curve: ordinary least squares on log(mcap) = intercept + slope * log(tvl)
 * over the snapshot's token-bearing comparables. Fewer than 10 comparables is no fit at all
 * (a curve on a handful of points is a guess, not a fit) and returns null, which prices rows
 * on the peer multiple alone. `excludeSlug` leaves one comparable out, for the leave-one-out
 * test. Computed from this snapshot at run time, never typed in by hand.
 */
/**
 * The fitted size curve from an explicit list of token-bearing comparables: ordinary
 * least squares on log(mcap) = intercept + slope * log(tvl). The list may be a bootstrap
 * resample (duplicates weight the fit once per draw). Fewer than 10 comparables is no
 * fit at all and returns null, which prices rows on the peer multiple alone.
 */
export function fitSizeCurveFromComps(comps: SnapshotProtocol[]): SizeCurve | null {
  if (comps.length < 10) return null;
  const xs = comps.map((p) => Math.log(p.tvl_usd));
  const ys = comps.map((p) => Math.log(p.mcap_usd!));
  const n = comps.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  return { slope: round4(slope), intercept: round4(intercept), n_comps: n };
}

export function fitSizeCurve(snapshot: Snapshot, excludeSlug: string | null = null): SizeCurve | null {
  return fitSizeCurveFromComps(sizeComps(snapshot).filter((p) => p.slug !== excludeSlug));
}

/** The size curve's own multiple for a TVL: the curve's implied mcap over that TVL, clamped. */
export function sizeCurveMultiple(curve: SizeCurve | null, tvlUsd: number, model: ModelConstants = MODEL): number {
  if (curve === null || tvlUsd <= 0) return model.peer_mult_max;
  const raw = Math.exp(curve.intercept + curve.slope * Math.log(tvlUsd)) / tvlUsd;
  if (!Number.isFinite(raw) || raw <= 0) return model.peer_mult_max;
  return Math.min(model.peer_mult_max, Math.max(model.peer_mult_min, raw));
}

/**
 * The size factor a row actually gets: the curve's multiple over the peer multiple, clamped
 * to [1/size_cap_mult, size_cap_mult]. The peer is the prior and the curve is the evidence;
 * the bound says the evidence may move a row at most one doubling from its category peer.
 * On this snapshot the bound is what keeps the $2.75B giants credible: the unbounded curve
 * prices Sentora at 0.03x TVL, the bound at 0.10x. Returns the raw curve multiple too, so the
 * board shows both the fit and the factor it applied.
 */
export function sizeMultiplierFor(
  tvlUsd: number,
  peerMultiple: number,
  curve: SizeCurve | null,
  model: ModelConstants = MODEL,
): { multiple: number; multiplier: number } {
  const multiple = sizeCurveMultiple(curve, tvlUsd, model);
  if (curve === null) return { multiple: peerMultiple, multiplier: 1 };
  const ratio = multiple / peerMultiple;
  const multiplier = Math.min(model.size_cap_mult, Math.max(1 / model.size_cap_mult, ratio));
  return { multiple, multiplier };
}

/**
 * The value model's own held-out test, recomputed at run time: leave-one-out over the
 * token-bearing comparables. Each comparable is held out once, the peer table and the size
 * curve are refit on the rest, and the radar-6 multiple (peer x peer-bounded size curve) is
 * scored against the v3 peer multiple alone on the held-out market cap. Median error is
 * exp(median |log(pred / actual)|), the median factor by which the prediction is off.
 * No growth, maturity or chain terms enter this test: it tests the multiple, and those terms
 * are disclosed sensitivities, not fitted value factors.
 */
export function looValueHeldOut(snapshot: Snapshot, model: ModelConstants = MODEL): HeldOut {
  const comps = sizeComps(snapshot);
  const n = comps.length;
  if (n < 10) return { n_comps: n, median_error_x: 1, peer_median_error_x: 1, win_rate_vs_peer: 0.5 };
  const err4: number[] = [];
  const errPeer: number[] = [];
  for (const held of comps) {
    const train: Snapshot = { ...snapshot, protocols: snapshot.protocols.filter((p) => p.slug !== held.slug) };
    const peers = peerMultiples(train, model);
    const curve = fitSizeCurve(train);
    const peer = peerMultipleFor(held.category, peers, model).multiple;
    const size = sizeMultiplierFor(held.tvl_usd, peer, curve, model);
    const pred4 = Math.max(1, held.tvl_usd * peer * size.multiplier);
    const predPeer = Math.max(1, held.tvl_usd * peer);
    err4.push(Math.abs(Math.log(pred4 / held.mcap_usd!)));
    errPeer.push(Math.abs(Math.log(predPeer / held.mcap_usd!)));
  }
  const med = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
  };
  const wins = err4.filter((e, i) => e < errPeer[i]!).length;
  return {
    n_comps: n,
    median_error_x: round4(Math.exp(med(err4))),
    peer_median_error_x: round4(Math.exp(med(errPeer))),
    win_rate_vs_peer: Math.round((wins / n) * 1e4) / 1e4,
  };
}

/** Round to 2 decimals (the cohort split's printed precision). */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * One cohort split scored under the cap2 model: the peer table and the size curve are fit on
 * `trainComps` only, and every `testComps` row is predicted as TVL x peer x peer-bounded size
 * curve (no growth, maturity or chain terms — the same multiple looValueHeldOut tests).
 * Returns the median errors and the win rate vs the peer multiple alone.
 */
function evalCohortSplit(trainComps: SnapshotProtocol[], testComps: SnapshotProtocol[], model: ModelConstants): { cap2: number; peer: number; win: number } {
  const train: Snapshot = { protocols: trainComps, as_of: '', source: '', floor_usd: 1, watchlist: [] };
  const peers = peerMultiples(train, model);
  const curve = fitSizeCurve(train);
  const eCap: number[] = [];
  const ePeer: number[] = [];
  for (const held of testComps) {
    const peer = peerMultipleFor(held.category, peers, model).multiple;
    const size = sizeMultiplierFor(held.tvl_usd, peer, curve, model);
    const pred = Math.max(1, held.tvl_usd * peer * size.multiplier);
    const predPeer = Math.max(1, held.tvl_usd * peer);
    eCap.push(Math.abs(Math.log(pred / held.mcap_usd!)));
    ePeer.push(Math.abs(Math.log(predPeer / held.mcap_usd!)));
  }
  const med = (xs: number[]): number => medianOf([...xs].sort((a, b) => a - b)) ?? 0;
  const wins = eCap.filter((e, i) => e < ePeer[i]!).length;
  return { cap2: Math.exp(med(eCap)), peer: Math.exp(med(ePeer)), win: testComps.length === 0 ? 0 : wins / testComps.length };
}

/** One cohort split as a serialisable record, with its literal sentence built from the rounded numbers. */
function cohortSplit(label: string, trainComps: SnapshotProtocol[], testComps: SnapshotProtocol[], model: ModelConstants): CohortSplit {
  const r = evalCohortSplit(trainComps, testComps, model);
  const cap2 = round2(r.cap2);
  const peer = round2(r.peer);
  const win = Math.round(r.win * 1e4) / 1e4;
  return {
    label,
    fit_n: trainComps.length,
    test_n: testComps.length,
    cap2_median_error_x: cap2,
    win_vs_peer: win,
    peer_median_error_x: peer,
    text: `Fit on ${trainComps.length} protocols (${label.split(' -> ')[0]}), test on ${testComps.length} (${label.split(' -> ')[1]}): median error ${cap2.toFixed(2)}x vs peer ${peer.toFixed(2)}x, closer ${(win * 100).toFixed(1)}% of the time.`,
  };
}

/**
 * The listing-date cohort check, computed from the snapshot at run time. Expanding window,
 * dated-only fit: the cap2 model is fitted on token-bearing comparables listed before
 * 2023-01-01 / 2024-01-01 / 2025-01-01 and tested on those listed after; rolling origin:
 * fit the oldest 50% of dated comps, test the next 25%, then fit the oldest 75%, test the
 * newest 25% (dated comps sorted by listed_at, ties by slug). The 33 undated comparables
 * appear in NEITHER fit nor test — they cannot be placed in time at all. Every protocol is
 * scored on its 2026-11-14 TVL and market cap, so this is a cohort split (generalisation to
 * newer listings), NOT a historical backtest, and the note says so in full.
 */
export function cohortCheck(snapshot: Snapshot, model: ModelConstants = MODEL): CohortCheck {
  const comps = sizeComps(snapshot);
  const dated = comps
    .filter((p) => p.listed_at !== null)
    .sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : a.listed_at! > b.listed_at! ? 1 : a.slug < b.slug ? -1 : 1));
  const undated = comps.filter((p) => p.listed_at === null);
  const rankableLike = (p: SnapshotProtocol): boolean =>
    isRankable({ ...p, mcap_usd: null, gecko_id: null, symbol: null });
  const expanding: CohortSplit[] = [];
  const expandingRankable: CohortSplit[] = [];
  for (const T of ['2023-01-01', '2024-01-01', '2025-01-01']) {
    const fit = dated.filter((c) => c.listed_at! < T);
    const test = dated.filter((c) => c.listed_at! >= T);
    expanding.push(cohortSplit(`listed before ${T} -> listed after ${T}`, fit, test, model));
    expandingRankable.push(cohortSplit(`listed before ${T} -> listed after ${T}`, fit, test.filter(rankableLike), model));
  }
  const rolling: CohortSplit[] = [];
  const rollingRankable: CohortSplit[] = [];
  // Rolling origin on the dated comps, sized relative to their count (95 here: 47 / 24 / 24).
  const nDated = dated.length;
  const half = Math.floor(nDated / 2);
  const threeQ = Math.floor((nDated * 3) / 4);
  const f1 = dated.slice(0, half);
  const t1 = dated.slice(half, threeQ);
  const f2 = dated.slice(0, threeQ);
  const t2 = dated.slice(threeQ, nDated);
  rolling.push(cohortSplit('oldest 50% -> next 25%', f1, t1, model));
  rolling.push(cohortSplit('oldest 75% -> newest 25%', f2, t2, model));
  rollingRankable.push(cohortSplit('oldest 50% -> next 25%', f1, t1.filter(rankableLike), model));
  rollingRankable.push(cohortSplit('oldest 75% -> newest 25%', f2, t2.filter(rankableLike), model));
  // The note is built from the computed splits, never typed in, so its numbers always
  // match the table: median errors joined with ' / ', win rates as a range.
  const errs = expanding.map((s) => `${s.cap2_median_error_x.toFixed(2)}x`).join(' / ');
  const wins = expanding.map((s) => Math.round(s.win_vs_peer * 100));
  const winRange = `${Math.min(...wins)}-${Math.max(...wins)}`;
  return {
    method: 'cap2 model (peer x peer-bounded size curve, [0.5x, 2x] clamp) fitted on dated token-bearing comparables only, tested on later-listed dated comparables; no growth, maturity or chain terms enter the test.',
    note: `Listing-date check: fitting on protocols listed before 2023 / 2024 / 2025 and testing on those listed after gives median error ${errs} (closer than the peer median ${winRange}% of the time). This is a cohort split, not a historical backtest: every protocol is scored on its 2026-11-14 TVL and market cap, so it shows the model generalises to newer listings — not that it would have predicted prices at the time. The headline held-out number remains the leave-one-out median error, 3.96x.`,
    dated_comps: dated.length,
    undated_comps: undated.length,
    expanding,
    expanding_rankable_like: expandingRankable,
    rolling,
    rolling_rankable_like: rollingRankable,
  };
}

/** One scored board row's fixed inputs for the rank-range bootstrap. */
export interface RankRangeInput {
  slug: string;
  category: string | null;
  tvl_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
}

/** One row's rank across the bootstrap refits: P10, P90 and median (1 = top). */
export interface RankRange {
  rank_lo: number;
  rank_hi: number;
  rank_median: number;
}

/**
 * The rank range: each row re-ranked under B bootstrap refits of the fitted value model.
 * On every refit the 128 token-bearing comparables are resampled WITH REPLACEMENT (seeded
 * mulberry32, one stream across refits, in snapshot order), the peer table (category
 * medians of the resampled comps) and the size curve (OLS on the resampled comps) are
 * refit, and every board row is re-priced under the refit — peer x peer-bounded size
 * curve with the [0.5x, 2x] clamp — with its growth, maturity and chain terms held at
 * 1.00 (radar-6 dropped the terms from the value; the inputs still ride along so the
 * call shape is unchanged), then re-ranked (ties by slug, as on the board). The row's range
 * is the P10-P90 of its rank across refits, plus the median. This is a REAL computed
 * range, not a cosmetic ±: a row whose rank moves when the fit wobbles shows a wide
 * range, a row pinned by its own TVL and category shows a narrow one. It is a stability
 * statement, not a prediction interval — on traded comparables the true market-cap rank
 * falls inside the P10-P90 range only ~26% of the time (scratch/v4fix-model-evidence.md),
 * because the residual noise dwarfs the parameter uncertainty the bootstrap measures.
 * Deterministic: same seed, same snapshot, same ranges, byte for byte.
 */
export function bootstrapRankRanges(
  snapshot: Snapshot,
  rows: RankRangeInput[],
  model: ModelConstants = MODEL,
): Map<string, RankRange> {
  const comps = sizeComps(snapshot);
  const n = rows.length;
  const rng = mulberry32(model.rank_range_seed);
  const ranks = new Map<string, number[]>();
  for (const r of rows) ranks.set(r.slug, []);
  for (let b = 0; b < model.rank_range_b; b++) {
    const resampled: SnapshotProtocol[] = [];
    for (let k = 0; k < comps.length; k++) resampled.push(comps[Math.floor(rng() * comps.length)]!);
    const peers = peerTableFromComps(resampled, model);
    const curve = fitSizeCurveFromComps(resampled);
    const scored = rows.map((r) => {
      const peer = peerMultipleFor(r.category, peers, model);
      const size = sizeMultiplierFor(r.tvl_usd, peer.multiple, curve, model);
      const implied = Math.max(1, Math.round(r.tvl_usd * peer.multiple * size.multiplier * r.growth_multiplier * r.maturity_multiplier * r.chain_multiplier));
      return { slug: r.slug, implied };
    });
    scored.sort((x, y) => y.implied - x.implied || (x.slug < y.slug ? -1 : 1));
    scored.forEach((s, i) => ranks.get(s.slug)!.push(i + 1));
  }
  const out = new Map<string, RankRange>();
  for (const [slug, rs] of ranks) {
    const sorted = [...rs].sort((a, b) => a - b);
    const clampRank = (q: number): number => Math.min(n, Math.max(1, Math.round(quantileOf(sorted, q))));
    out.set(slug, { rank_lo: clampRank(0.1), rank_hi: clampRank(0.9), rank_median: clampRank(0.5) });
  }
  return out;
}

/** The rank-range method record for data.js: what the bootstrap did, in words. */
export function rankRangeMethod(model: ModelConstants = MODEL): RankRangeMethod {
  return {
    b: model.rank_range_b,
    seed: model.rank_range_seed,
    resampled: 'size comps with replacement (n=128)',
    refit: 'size curve OLS + peer medians per refit',
    fixed_terms: 'growth/maturity/chains at 1.00 (radar-6 dropped the terms from the value)',
    clamp: '[0.5x, 2x] peer',
    quantiles: 'P10/P90/median of rank across refits',
  };
}

/**
 * The fitted odds model, serialised for data.js: the OddsTable's byCategory Map becomes
 * an array of {category, with_token, total} sorted by category, and the logistic
 * intercept/slopes/means/sds are rounded to 6 decimals. The page re-derives a row's odds
 * as logit(p) = logit(odds_base) + intercept + slopes . z([log TVL, clamped 7-day
 * growth / 100, log chains]) from the row's own fields; odds_base is the row's shrunk
 * category rate (the logistic offset), rounded to 4 decimals exactly as the board's
 * tokenOddsFittedFor computes it.
 */
export function serialiseOddsFit(fit: OddsFit): OddsFitData {
  const by_category = [...fit.table.byCategory.entries()]
    .map(([category, e]) => ({ category, with_token: e.withToken, total: e.total }))
    .sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return {
    by_category,
    global_rate: round6(fit.table.globalRate),
    intercept: round6(fit.intercept),
    slopes: fit.slopes.map(round6),
    means: fit.means.map(round6),
    sds: fit.sds.map(round6),
  };
}

/** The multipliers and the implied value one protocol gets under the model. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  peers: PeerTable,
  model: ModelConstants = MODEL,
  curve: SizeCurve | null = null,
): { implied: number; peer: { multiple: number; n: number; fallback: boolean }; size: { multiple: number; multiplier: number }; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const peer = peerMultipleFor(protocol.category, peers, model);
  const size = sizeMultiplierFor(protocol.tvl_usd, peer.multiple, curve, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  // Radar-6: the growth / maturity / chain sensitivities are DROPPED from the value
  // (they hurt held-out prediction: full formula 4.2025x vs multiple alone 3.9599x on
  // all comps — see the header comment and scratch/v6-model-evidence.md §4). The
  // multipliers ship as 1 so the dashboard's re-derivation keeps working; the row
  // still carries the raw 7-day change (growthPct) as data.
  const growthMult = 1;
  const maturityMult = 1;
  const chainMult = 1;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * peer.multiple * size.multiplier));
  return { implied, peer, size, growthPct, growthMult, maturityMult, chainMult, age };
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Categories whose product is a stablecoin: the token already exists and trades, pegged. */
const STABLECOIN_CATEGORIES = new Set(['Algo-Stables', 'Dual-Token Stablecoin', 'Stablecoin Issuer', 'Stablecoin Wrapper']);

/**
 * Stablecoins whose category does not say so. USDD is a decentralised stablecoin whose token
 * already trades; the snapshot carries no market cap, CoinGecko id or symbol for it, so the
 * pre-token test alone would rank it as a launch. The denylist corrects that snapshot artifact.
 * It names slugs, not names, and it is the only hand-kept list in the model.
 */
const STABLECOIN_DENYLIST = new Set(['usdd']);

/** Whether a protocol is a stablecoin, by category or by the denylist. */
export function isStablecoin(p: SnapshotProtocol): boolean {
  if (p.category !== null && STABLECOIN_CATEGORIES.has(p.category)) return true;
  return STABLECOIN_DENYLIST.has(p.slug);
}

/** Exchange names a fresh launch never starts with. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/**
 * Why a pre-token protocol is NOT rankable, or null when it may be ranked. The watchlist rule,
 * applied to every row of the board — not just the watchlist.
 */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) {
    return `Category ${p.category}: a wrapped, staked or bridged product, not a fresh launch`;
  }
  if (isStablecoin(p)) {
    return p.category !== null && STABLECOIN_CATEGORIES.has(p.category)
      ? `Category ${p.category}: a stablecoin, whose token already exists and trades`
      : 'Stablecoin: its token already exists and trades, so there is no launch to rank';
  }
  if (WRAPPED_WORD.test(p.name)) return 'Name carries wrapped, staked or staking';
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return 'Name starts with an exchange name';
  if (VERSIONED.test(p.name)) return 'Name ends in a version marker';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and not an excluded product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const peers = peerMultiples(snapshot, model);
  const curve = fitSizeCurve(snapshot);
  const oddsFit = fitTokenOdds(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names is ranked, even one the snapshot no longer
  // carries (it cannot, but coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, at any size. No TVL cut: a small
  // protocol growing fast outranks a big one standing still when the multiples say so.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, peers, model, curve);
    const tokenOdds = tokenOddsFittedFor(p, oddsFit, model);
    const oddsBase = tokenOddsBaseFor(p.category, oddsFit.table, model);
    const cost = farmCost(p, v.age);
    const expected = Math.max(1, Math.round(v.implied * tokenOdds));
    // Farm economics (additive: nothing above this line moves any priced value).
    const breakEven = farmBreakEvenDeposit(p.tvl_usd, expected, cost.gas);
    const sized = farmSizedDeposit(breakEven, cost.capital);
    const netAtSized = farmNetAtSized(sized, p.tvl_usd, expected, cost.gas);
    const verdict = farmVerdictFor(sized, breakEven, cost.capital, netAtSized, tokenOdds);
    const netAtPlan = farmNetAtPlan(cost.capital, p.tvl_usd, expected, cost.gas);
    const timeline = farmTimeline(snapshot.as_of, v.age);
    return { p, v, tokenOdds, oddsBase, expected, cost, breakEven, sized, netAtSized, verdict, netAtPlan, timeline };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const rankRanges = bootstrapRankRanges(snapshot, scored.map((s) => ({
    slug: s.p.slug,
    category: s.p.category,
    tvl_usd: s.p.tvl_usd,
    growth_multiplier: s.v.growthMult,
    maturity_multiplier: s.v.maturityMult,
    chain_multiplier: s.v.chainMult,
  })), model);
  return scored.map((s, i) => {
    const range = rankRanges.get(s.p.slug)!;
    return {
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    token_odds: s.tokenOdds,
    expected_value_usd: s.expected,
    farm_capital_usd: s.cost.capital,
    farm_gas_usd: s.cost.gas,
    farm_break_even_usd: s.breakEven,
    farm_verdict: s.verdict,
    farm_net_at_plan_usd: s.netAtPlan,
    farm_sized_deposit_usd: s.sized,
    farm_net_at_sized_usd: s.netAtSized,
    farm_start_date: s.timeline.start_date,
    farm_end_date: s.timeline.end_date,
    farm_hold_days: s.timeline.hold_days,
    on_watchlist: snapshot.watchlist.includes(s.p.slug),
    model: {
      peer_multiple: round4(s.v.peer.multiple),
      peer_n: s.v.peer.n,
      peer_fallback: s.v.peer.fallback,
      size_multiple: round4(s.v.size.multiple),
      size_multiplier: round4(s.v.size.multiplier),
      growth_pct: round4(s.v.growthPct),
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      chain_multiplier: round4(s.v.chainMult),
      age_days: s.v.age,
      rank_lo: range.rank_lo,
      rank_hi: range.rank_hi,
      rank_median: range.rank_median,
      odds_base: s.oddsBase,
    },
    farm_steps: farmSteps(s.p, s.v.age, s.sized).map(stepText),
    };
  });
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 10_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('borrow')) {
    return `Lend $${capital} of USDC into ${name} on ${chain} and leave it supplied.`;
  }
  if (c.includes('dex') || c.includes('swap') || c.includes('amm')) {
    return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the LP position.`;
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) {
    return `Post $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  }
  if (c.includes('rwa') || c.includes('real world')) {
    return `Mint or buy $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it.`;
  }
  if (c.includes('curator') || c.includes('allocator') || c.includes('vault') || c.includes('asset management')) {
    return `Deposit $${capital} into a ${name} vault on ${chain} and hold the vault shares.`;
  }
  if (c.includes('yield')) {
    return `Deposit $${capital} into ${name}'s top vault on ${chain} and keep it earning.`;
  }
  if (c.includes('prediction') || c.includes('market') && c.includes('predict')) {
    return `Fund $${capital} and take one position in an active market on ${name}.`;
  }
  if (c.includes('stable')) {
    return `Mint $${capital} of the stable asset through ${name} on ${chain} against collateral.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  }
  if (c.includes('launchpad') || c.includes('launch')) {
    return `Join ${name}'s next launch on ${chain} with $${capital} and hold the allocation.`;
  }
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position active.`;
}

/** The weekly qualifying action, matched to the category. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp')) return 'a supply top-up, a borrow, or a repayment';
  if (c.includes('dex') || c.includes('swap')) return 'a swap or a liquidity rebalance';
  if (c.includes('perpetual') || c.includes('derivative')) return 'a trade or a margin adjustment';
  if (c.includes('curator') || c.includes('allocator') || c.includes('vault')) return 'a deposit, a rebalance, or a governance vote';
  if (c.includes('prediction')) return 'a market position or a resolution vote';
  return 'a deposit, a swap, or a vote';
}

/** What the farm plan costs: the capital it ties up (refundable, still yours) and the gas it
 * burns (not refundable). The gas is the steps' own figures added up: about $3 to open the fresh
 * wallet, $4–$8 for the first deposit, and about $2 a week for the qualifying actions over the
 * hold window. It is the number the farm verdict is netted against. */
export function farmCost(p: SnapshotProtocol, age: number | null): { capital: number; gas: number; hold: number } {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = 3 + (capital >= 150 ? 8 : 4) + Math.ceil(hold / 7) * 2;
  return { capital, gas, hold };
}

/**
 * The solved break-even deposit, in whole dollars: D* = gas * TVL / EV.
 *
 * A farmer depositing D into a protocol with TVL T holds D/T of the protocol's TVL. If the
 * launch's expected value EV (implied x odds) were shared pro-rata by TVL, the farmer's
 * expected claim is D * EV / TVL, so expected net = D * EV / TVL - gas, and net = 0 solves
 * to D* = gas * TVL / EV. EV is the row's expected_value_usd; gas is the row's farm_gas_usd.
 *
 * This is a GENEROUS upper bound on the claim — it hands the farmer a pro-rata share of the
 * FULL implied launch value, while a real airdrop pool is a fraction of token supply — so D*
 * is a LOWER bound on the true break-even deposit, and every verdict built on it is
 * optimistic, not conservative. The rejected alternative (EV scaling with deposit from the
 * plan deposit, D* = capital * gas / EV) is degenerate: EV >> gas on every row, so D* would
 * be pennies on all 194 rows and every row would be FARM.
 */
export function farmBreakEvenDeposit(tvlUsd: number, expectedValueUsd: number, gasUsd: number): number {
  if (expectedValueUsd <= 0 || tvlUsd <= 0 || gasUsd <= 0) return 0;
  return Math.max(1, Math.round((gasUsd * tvlUsd) / expectedValueUsd));
}

/**
 * The sized deposit, in whole dollars: S = min(2 x D*, 10 x plan deposit).
 *
 * The verdicts are computed AT this deposit, not at a fixed deposit that loses
 * everywhere: depositing twice the break-even deposit is the smallest round multiple
 * of D* at which expected net is positive by construction (net = 2 x gas - gas = gas),
 * and the cap at ten times the plan deposit keeps the sized deposit inside the same
 * sane envelope the radar-5 verdicts already used as their SKIP threshold (the plan
 * deposit is TVL-tiered $50/$100/$150/$250, so S <= $2,500 on every row). The multiple
 * 2 and the cap 10x are the rule's two stated parameters — no per-row tuning: every
 * row's sized deposit comes out of this one formula. Sensitivity (see
 * scratch/v6-model-evidence.md §2): m=1.5/cap 10x gives 67/29/98, m=3/cap 10x gives
 * 21/75/98 — the SKIP count is 98 under every multiple, because SKIP means
 * D* > 10 x plan, which no multiple touches.
 */
export function farmSizedDeposit(breakEvenUsd: number, capitalUsd: number): number {
  if (breakEvenUsd <= 0 || capitalUsd <= 0) return 1;
  return Math.max(1, Math.round(Math.min(2 * breakEvenUsd, 10 * capitalUsd)));
}

/** Expected net at the sized deposit: S * EV / TVL - gas, in dollars, to cents. */
export function farmNetAtSized(sizedUsd: number, tvlUsd: number, expectedValueUsd: number, gasUsd: number): number {
  if (tvlUsd <= 0) return -gasUsd;
  return Math.round(((sizedUsd * expectedValueUsd) / tvlUsd - gasUsd) * 100) / 100;
}

/**
 * The computed farm verdict from the sized deposit S, the solved break-even deposit D*,
 * the plan deposit (capital, TVL-tiered $50/$100/$150/$250), the expected net at the
 * sized deposit, and the token odds:
 *   FARM  S reaches 2 x D* within the cap (2 x D* <= 10 x capital, i.e. D* <= 5 x
 *         capital): the deposit is twice break-even, so expected net at S is exactly
 *         one gas bill — positive by construction, on every FARM row.
 *   THIN  S is capped at 10 x capital but net at S is still positive (5 x capital <
 *         D* <= 10 x capital): the farmer cannot reach twice break-even within the
 *         cap, and the margin at the capped deposit is thinner than one gas bill.
 *   SKIP  net at S <= 0 (D* > 10 x capital: even ten times the plan deposit does not
 *         break even), or token odds < 0.01 (a sub-1% launch is a lottery ticket, not
 *         a farm — on this snapshot all 5 sub-1% rows already exceed 10x, so the odds
 *         clause binds on no additional row; it is a guard, not a driver).
 * The verdict is a per-dollar efficiency statement, not a value ranking: the biggest rows
 * are SKIP because their EV per TVL dollar is small, while small high-odds rows are FARM.
 * On this snapshot: 70 FARM / 61 THIN / 63 SKIP (radar-5, judged at the plan deposit,
 * gave 7/89/98). The rule alone, applied to the v5 board, would have given 49/47/98
 * with the SKIP set identical to v5's; the radar-6 counts differ because the term drop
 * raised implied values and EV, so D* fell on most rows. Expected net at the plan
 * deposit is negative on 193 of 194 rows — one row, anemoy-capital (#78), breaks even
 * at its plan deposit (+$4.83) after the term drop nearly doubled its implied value.
 */
export function farmVerdictFor(sizedUsd: number, breakEvenUsd: number, capitalUsd: number, netAtSizedUsd: number, tokenOdds: number): FarmVerdict {
  if (tokenOdds < 0.01 || netAtSizedUsd <= 0) return 'SKIP';
  if (2 * breakEvenUsd <= 10 * capitalUsd) return 'FARM';
  return 'THIN';
}

/** Expected net at the plan deposit: capital * EV / TVL - gas, in dollars, to cents. */
export function farmNetAtPlan(capitalUsd: number, tvlUsd: number, expectedValueUsd: number, gasUsd: number): number {
  if (tvlUsd <= 0) return -gasUsd;
  return Math.round(((capitalUsd * expectedValueUsd) / tvlUsd - gasUsd) * 100) / 100;
}

/** A YYYY-MM-DD date string, `days` after `asOf` (UTC, no clock — asOf is the snapshot date). */
export function addDaysUtc(asOf: string, days: number): string {
  const t = Date.parse(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(t)) return asOf;
  return new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

/** A row's farm timeline: start at the snapshot date, hold the age-tiered hold days. */
export function farmTimeline(asOf: string, age: number | null): { start_date: string; hold_days: number; end_date: string } {
  const hold = holdDaysFor(age);
  return { start_date: asOf, hold_days: hold, end_date: addDaysUtc(asOf, hold) };
}

/** One curated farm plan: six steps, each an action with a cost and a time. */
type CuratedPlan = (capital: number, hold: number, firstGas: number) => FarmStep[];

/** The shared first step: a fresh wallet that holds only the farm funds. */
const FRESH_WALLET: FarmStep = {
  text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
  cost: 'under $3 of gas for the first transaction',
  time: '5 minutes',
};

/**
 * Curated farm plans for the board's top protocols, keyed by slug. Each plan names the
 * protocol's own vault, pool or points program, verified against the protocol's own docs or a
 * primary source; a protocol with no verified program says so in its plan instead of naming
 * one. Amounts and hold windows still come from the model's own tiers (capitalFor,
 * holdDaysFor), so the numbers stay data-driven. Slugs not listed here use the template
 * below: Nonce Capital and R25 have no named vault or points program that could be verified.
 */
const CURATED_FARM_PLANS: Record<string, CuratedPlan> = {
  'sentora-curator': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of PYUSD into Sentora's PYUSD Main vault on Morpho and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the vault's rate and reward streams on Morpho each week, and top up only while the yield beats idle cash.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Sentora runs no points program, so there is nothing to claim; the return is the vault yield and its reward streams.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Sentora token claim only from Sentora's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'steakhouse-financial': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the Steakhouse Prime USDC vault on Morpho on Base and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the vault's net APY and allocation on Morpho each week; the yield compounds in USDC automatically.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Steakhouse pays yield from borrower interest, not token incentives, so there is no rewards page to claim from.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Steakhouse token claim only from Steakhouse's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  gauntlet: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the Gauntlet USDC Prime vault on Morpho on Base and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the vault's net APY and MORPHO reward rate on Morpho each week, and top up only while it beats idle cash.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Claim the vault's MORPHO rewards on Merkl, Gauntlet's rewards distributor, and never pay to claim them.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Gauntlet token claim only from Gauntlet's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  veda: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} into the ether.fi Liquid vault on Ethereum, a Veda BoringVault, and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold the shares to accrue Veda Points, and ether.fi points on the Liquid vault, and check the points dashboard weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Veda's points dashboard and claim only from the link it publishes; Veda has announced no token or conversion.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any VEDA token claim only from Veda's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  usdd: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Lock TRX in a USDD vault on Tron and mint $${capital} of USDD against it, keeping the collateral ratio above the minimum.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Stake the minted USDD for sUSDD to earn the variable savings rate, and check the rate on the USDD site weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `There is no USDD points program; the return is the sUSDD savings rate and JustLend supply yield, not a token claim.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any USDD claim only from the USDD site.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  upshift: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the Upshift USDC vault on Ethereum, curated by August, and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold the shares to earn Upshift points, 5x while total deposits stay under $750 million, and check the points page weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Upshift's points page and claim only from the link it publishes; Upshift has announced no token or airdrop.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Upshift token claim only from Upshift's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'bitfi-basis': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Mint $${capital} of bfUSD with USDT on BNB Chain, then stake it into the Horizon vault for hbfUSD.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the Horizon vault ratio and your BitFi Points balance on the BitFi dashboard each week.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open BitFi's points page and claim only from the link it publishes; BitFi Points are rewards, not a token.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any BitFi token claim only from BitFi's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'bittensor-dtao': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Add $${capital} of TAO and Alpha liquidity to a subnet pool on Backprop Finance to earn dTAO rewards.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Vote with your dTAO on which liquidity pools receive emissions, and rebalance toward the strongest subnets weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `There is no dTAO points program; the return is pool fees and dTAO emissions, claimed from Backprop itself.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any dTAO claim only from Bittensor's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  onre: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC on OnRe on Solana to mint ONyc, the reinsurance yield token, and hold it.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold ONyc to earn 1 OnRe Point per token per day; positions held 60 days or more earn Compounding Interest Rewards.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open OnRe's points page and claim only from the link it publishes; no token distribution has been confirmed.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any OnRe token claim only from OnRe's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'polymarket-international': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Fund $${capital} of USDC into Polymarket on Polygon, which becomes pUSD collateral, and take a position in an active market.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Post limit orders as a maker to earn the 15 to 25 percent maker rebate, paid daily in pUSD.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Polymarket runs no points program and has announced no token; treat every claim POLY page as a scam.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and trust only Polymarket's own site, X account and Discord.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  opentrade: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into OpenTrade's USDC Vault on Avalanche, backed by T-bills, and hold the vault tokens.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the vault's T-bill yield and your accrued interest on OpenTrade each week; interest compounds daily.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `OpenTrade runs no points program, so there is nothing to claim; the return is the T-bill yield itself.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any OpenTrade token claim only from OpenTrade's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'cian-yield-layer': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of stETH into CIAN's stETH Yield Layer on Ethereum and hold the receipt tokens.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold the position to earn CIAN Points on the deposit value, plus restaking points from the layer's strategies.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open CIAN's Voyage Points page and claim only from the link it publishes; points are not a promise of a token.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any CIAN token claim only from CIAN's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'plume-vaults': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the nTBILL Nest vault on Solana and hold the nTBILL vault tokens.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold the vault tokens to earn Plume Nest Points, up to 10x when deployed across Solana DeFi, and check points weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Nest's points page and claim only from the link it publishes; Season 1 pays from 1 percent of the PLUME supply.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Nest claim only from Plume's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  rockawayx: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of SOL into the onycSOL vault on Exponent, managed by RockawayX, and hold the onycSOL tokens.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold onycSOL to earn staking yield plus ONyc reinsurance yield, and 4x OnRe Points on the position.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `RockawayX runs no points program of its own; the OnRe Points accrue through the onycSOL position itself.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any RockawayX token claim only from RockawayX's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  'tori-finance': (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into Tori on Ethereum to mint trUSD, the synthetic dollar, and hold it.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Stake the trUSD for strUSD to earn Cores, Tori's points program, and check your Cores balance weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Tori's Cores page and claim only from the link it publishes; Cores are not a promise of any token or payment.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Tori token claim only from Tori's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  symbiotic: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of wstETH into a Symbiotic vault on Ethereum and delegate it to a network operator.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold the position to earn Symbiotic Points, 0.001 an hour per dollar in Core V2 vaults, and check the balance weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Symbiotic's app and claim only from the link it publishes; no token or airdrop has been announced.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and remember restaked collateral can be slashed, so size the position small.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  axis: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the Axis Origin Vault on Ethereum and receive ogUSDx, the vault's receipt token.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Hold ogUSDx to earn Coordinates at the 2x rate, and check your Coordinates balance on the Axis dashboard weekly.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Open Axis's points page and claim only from the link it publishes; Axis has confirmed no token yet.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log; the Origin Vault locks deposits for 30 days, so plan the exit.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
  hyperithm: (capital, hold, firstGas) => [
    FRESH_WALLET,
    { text: `Deposit $${capital} of USDC into the Hyperithm USDC Apex vault on Morpho on Ethereum and hold the vault shares.`, cost: `$${capital} of capital and about $${firstGas} of gas`, time: '15 minutes to set up' },
    { text: `Check the Apex vault's allocation and net APY on Morpho each week; the yield comes from delta-neutral trading.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Hyperithm runs no points program, so there is nothing to claim; the return is the vault yield itself.`, cost: 'no fee to check', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log, and verify any Hyperithm token claim only from Hyperithm's official channels.`, cost: 'nothing but the log', time: '5 minutes' },
  ],
};

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. A slug with a
 * curated plan gets that plan; every other protocol gets the template, derived from its own
 * record (category, chains, TVL, age).
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, sizedDeposit?: number): FarmStep[] {
  // The step amounts name the SIZED deposit (S = min(2 x D*, 10 x plan deposit)), the deposit
  // the banner and verdict are computed at. The first-deposit gas figure stays keyed to the
  // TIERED plan deposit, exactly as farmCost computes it, so the steps' own gas figures
  // (3 + firstGas + ceil(hold/7) x 2) still add up to farm_gas_usd on every row.
  const tiered = capitalFor(p);
  const capital = sizedDeposit ?? tiered;
  const firstGas = tiered >= 150 ? 8 : 4;
  const hold = holdDaysFor(age);
  const curated = CURATED_FARM_PLANS[p.slug];
  if (curated !== undefined) return curated(capital, hold, firstGas);
  const chain = chainOf(p);
  const action = actionFor(p, capital, chain);
  const weekly = weeklyFor(p);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${firstGas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Do one qualifying action each week on ${chain}, such as ${weekly}.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log, and if a token launches, verify its contract only from ${p.name}'s official channels.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The pre-token protocols the board leaves out, with the reason each one was left out. Watchlist
 * slugs are never listed here: the floor puts them on the board even when the exclusion rule would
 * leave them out, and the dashboard flags those instead. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && exclusionReason(p) !== null && !snapshot.watchlist.includes(p.slug))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      tvl_usd: p.tvl_usd,
      reason: exclusionReason(p)!,
    }))
    .sort((a, b) => b.tvl_usd - a.tvl_usd);
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    token_odds: row.token_odds,
    expected_value_usd: row.expected_value_usd,
    farm_capital_usd: row.farm_capital_usd,
    farm_gas_usd: row.farm_gas_usd,
    farm_break_even_usd: row.farm_break_even_usd,
    farm_verdict: row.farm_verdict,
    farm_net_at_plan_usd: row.farm_net_at_plan_usd,
    farm_sized_deposit_usd: row.farm_sized_deposit_usd,
    farm_net_at_sized_usd: row.farm_net_at_sized_usd,
    farm_start_date: row.farm_start_date,
    farm_end_date: row.farm_end_date,
    farm_hold_days: row.farm_hold_days,
    peer_multiple: row.model.peer_multiple,
    peer_n: row.model.peer_n,
    peer_fallback: row.model.peer_fallback,
    size_multiple: row.model.size_multiple,
    size_multiplier: row.model.size_multiplier,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    rank_lo: row.model.rank_lo,
    rank_hi: row.model.rank_hi,
    rank_median: row.model.rank_median,
    odds_base: row.model.odds_base,
    stablecoin: isStablecoin({ slug: row.slug, name: row.name, category: row.category, chains: row.chains, tvl_usd: row.tvl_usd, change_7d: row.change_7d, mcap_usd: row.mcap_usd, listed_at: row.listed_at, gecko_id: row.gecko_id, symbol: row.symbol }),
    on_watchlist: row.on_watchlist,
    farm_steps: row.farm_steps,
  };
}

/** Which ledger class a pre-token excluded protocol falls in (same order as exclusionReason). */
function ledgerExcludedClass(p: SnapshotProtocol): 'category_screen' | 'name_rules' | 'stablecoin' {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return 'category_screen';
  if (isStablecoin(p)) return 'stablecoin';
  return 'name_rules';
}

/**
 * The true 758/758 ledger, computed from the snapshot at run time: every protocol exactly
 * once — board rows ranked, pre-token rows excluded with a reason each, and rows carrying a
 * token signal grouped by what the signal is. The census line is built from the counted
 * numbers, so it always sums. This replaces the old footer strip's arithmetic
 * (144 + 194 + 148 = 486), which left the 272 parent-token rows unaccounted for.
 */
export function buildLedger(snapshot: Snapshot, board: BoardRow[]): LedgerData {
  const boardSlugs = new Set(board.map((r) => r.slug));
  const excluded = excludedRows(snapshot);
  const classes = { category_screen: 0, name_rules: 0, stablecoin: 0 };
  const byCat = new Map<string, number>();
  for (const p of snapshot.protocols) {
    if (!isPreToken(p) || boardSlugs.has(p.slug) || exclusionReason(p) === null) continue;
    const c = ledgerExcludedClass(p);
    classes[c]++;
    if (c === 'category_screen' && p.category !== null) byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  }
  const by_category = [...byCat.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || (a.category < b.category ? -1 : 1));
  const toLedgerRow = (p: SnapshotProtocol): LedgerHasTokenRow => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    tvl_usd: p.tvl_usd,
    mcap_usd: p.mcap_usd,
    gecko_id: p.gecko_id,
    symbol: p.symbol,
    group: p.mcap_usd !== null && p.mcap_usd > 0 ? 'with_mcap' : p.mcap_usd !== null ? 'dead_token' : 'parent_token',
  });
  const withMcap: LedgerHasTokenRow[] = [];
  const dead: LedgerHasTokenRow[] = [];
  const parent: LedgerHasTokenRow[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p)) continue;
    const row = toLedgerRow(p);
    if (row.group === 'with_mcap') withMcap.push(row);
    else if (row.group === 'dead_token') dead.push(row);
    else parent.push(row);
  }
  const byTvl = (a: LedgerHasTokenRow, b: LedgerHasTokenRow): number => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1);
  withMcap.sort(byTvl);
  dead.sort(byTvl);
  parent.sort(byTvl);
  const total = snapshot.protocols.length;
  const ranked = board.length;
  const excludedTotal = excluded.length;
  const hasTokenTotal = withMcap.length + dead.length + parent.length;
  return {
    total,
    ranked,
    excluded_total: excludedTotal,
    has_token_total: hasTokenTotal,
    census_line: `${total} = ${ranked} ranked + ${excludedTotal} excluded + ${hasTokenTotal} with a token`,
    excluded: {
      total: excludedTotal,
      category_screen: classes.category_screen,
      name_rules: classes.name_rules,
      stablecoin: classes.stablecoin,
      by_category,
      rows: excluded,
    },
    has_token: {
      total: hasTokenTotal,
      with_mcap: { count: withMcap.length, rows: withMcap },
      dead_token: { count: dead.length, rows: dead },
      parent_token: {
        count: parent.length,
        symbol_only: parent.filter((r) => r.symbol !== null && r.gecko_id === null).length,
        gecko_present: parent.filter((r) => r.gecko_id !== null).length,
        rows: parent,
      },
    },
  };
}

/** The farm-method summary for data.js: formula, assumption, thresholds and verdict counts. */
export function buildFarmMethod(board: BoardRow[]): FarmMethod {
  const counts = { farm: 0, thin: 0, skip: 0 };
  for (const r of board) {
    if (r.farm_verdict === 'FARM') counts.farm++;
    else if (r.farm_verdict === 'THIN') counts.thin++;
    else counts.skip++;
  }
  const nets = board.map((r) => r.farm_net_at_plan_usd).sort((a, b) => a - b);
  const mid = Math.floor(nets.length / 2);
  const medianNet = nets.length % 2 === 1 ? nets[mid]! : (nets[mid - 1]! + nets[mid]!) / 2;
  const nonNegative = board.filter((r) => r.farm_net_at_plan_usd >= 0).length;
  const netsSized = board.map((r) => r.farm_net_at_sized_usd).sort((a, b) => a - b);
  const midS = Math.floor(netsSized.length / 2);
  const medianNetSized = netsSized.length % 2 === 1 ? netsSized[midS]! : (netsSized[midS - 1]! + netsSized[midS]!) / 2;
  const positiveSized = board.filter((r) => r.farm_net_at_sized_usd > 0).length;
  const sizedDeposits = board.map((r) => r.farm_sized_deposit_usd).sort((a, b) => a - b);
  const midD = Math.floor(sizedDeposits.length / 2);
  const medianSized = sizedDeposits.length % 2 === 1 ? sizedDeposits[midD]! : (sizedDeposits[midD - 1]! + sizedDeposits[midD]!) / 2;
  const farmNets = board.filter((r) => r.farm_verdict === 'FARM').map((r) => r.farm_net_at_sized_usd).sort((a, b) => a - b);
  const farmMedianNet = farmNets.length === 0 ? 0 : farmNets[Math.floor(farmNets.length / 2)]!;
  // The plan-deposit sentence is built from the computed numbers, never assumed: on
  // this snapshot one row (anemoy-capital) breaks even at its plan deposit after the
  // radar-6 term drop nearly doubled its implied value, so the sentence must say 193
  // of 194, not "all 194 rows".
  const bestPlanNet = nets[nets.length - 1]!;
  const bestPlanRow = board.find((r) => r.farm_net_at_plan_usd === bestPlanNet)!;
  const planSentence = nonNegative === 0
    ? `Expected net at the plan deposit is negative on all ${board.length} rows (best \u2212$${Math.abs(bestPlanNet).toFixed(2)})`
    : `Expected net at the plan deposit is negative on ${board.length - nonNegative} of ${board.length} rows — ${bestPlanRow.slug} (#${bestPlanRow.rank}) breaks even at its plan deposit (+$${bestPlanNet.toFixed(2)})`;
  return {
    formula: 'Break-even deposit D* = gas x TVL / expected value: a deposit D holds D/TVL of the protocol, so its expected claim is D x EV / TVL, and net = 0 solves to D* = gas x TVL / EV.',
    assumption: 'Pro-rata share of the FULL implied launch value: a generous upper bound on the claim (a real airdrop pool is a fraction of token supply), so D* is a lower bound on the true break-even deposit and the verdicts are optimistic, not conservative.',
    sized_deposit_rule: 'Sized deposit S = min(2 x D*, 10 x plan deposit): twice the break-even deposit, capped at ten times the TVL-tiered plan deposit ($250/$150/$100/$50), so S is at most $2,500. The multiple 2 and the cap 10x are the rule\u2019s two stated parameters; every row\u2019s sized deposit comes out of this one formula.',
    thresholds: 'Verdicts are computed at the sized deposit: FARM if S reaches 2 x D* within the cap (D* at most 5x the plan deposit) — expected net at S is then exactly one gas bill, positive by construction; THIN if S is capped at 10x the plan deposit but net at S is still positive; SKIP if net at S is zero or negative (D* over 10x the plan deposit) or token odds below 1%.',
    counts,
    net_at_plan_usd: { min: nets[0]!, median: Math.round(medianNet * 100) / 100, max: nets[nets.length - 1]! },
    net_non_negative_rows: nonNegative,
    net_at_sized_usd: { min: netsSized[0]!, median: Math.round(medianNetSized * 100) / 100, max: netsSized[netsSized.length - 1]! },
    sized_positive_net_rows: positiveSized,
    median_sized_deposit_usd: medianSized,
    note: `At the sized deposit (twice break-even, capped at 10x the plan deposit), ${counts.farm} rows are FARM with positive expected net (median +$${farmMedianNet.toFixed(2)} at the sized deposit, exactly one gas bill by construction), ${counts.thin} are THIN and ${counts.skip} are SKIP. ${planSentence}: the plan deposit was never the sized deposit, and the verdicts are a per-dollar efficiency statement, not a value ranking — Sentora (#1) is SKIP at any reasonable deposit.`,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const peers = peerMultiples(snapshot, model);
  const curve = fitSizeCurve(snapshot);
  const heldout = looValueHeldOut(snapshot, model);
  const cohort = cohortCheck(snapshot, model);
  const ledger = buildLedger(snapshot, board);
  const farmMethod = buildFarmMethod(board);
  // The odds fit is recomputed here for serialisation: the fit is deterministic gradient
  // descent on this snapshot, so this is the same fit buildBoard already used for the rows.
  const oddsFit = fitTokenOdds(snapshot, model);
  const early = board.filter((r) => !r.on_watchlist).length;
  // The peer table shows the multiple each ranked category actually gets: the category median
  // at n >= 3, the log-space blend at n = 2, and nothing for categories with fewer peers.
  const boardCats = new Set(board.map((r) => r.category).filter((c): c is string => c !== null));
  const peerTable: PeerEntry[] = [...boardCats]
    .map((category) => {
      const p = peerMultipleFor(category, peers, model);
      return { category, multiple: round4(p.multiple), n: p.n, fallback: p.fallback };
    })
    .filter((p) => !p.fallback)
    .map(({ category, multiple, n }) => ({ category, multiple, n }))
    .sort((a, b) => b.n - a.n || (a.category < b.category ? -1 : 1));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    snapshot_protocols: snapshot.protocols.length,
    snapshot_with_token: snapshot.protocols.filter((p) => p.mcap_usd !== null).length,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    global_multiple: round4(peers.global),
    size_curve: curve,
    heldout,
    cohort_check: cohort,
    ledger,
    farm_method: farmMethod,
    rank_range_method: rankRangeMethod(model),
    odds_fit: serialiseOddsFit(oddsFit),
    peers: peerTable,
    excluded: excludedRows(snapshot),
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (typeof r.token_odds !== 'number' || !(r.token_odds >= 0 && r.token_odds <= 1)) return `${r.slug} has token odds ${r.token_odds}`;
    if (!Number.isSafeInteger(r.expected_value_usd) || r.expected_value_usd <= 0 || r.expected_value_usd > r.implied_value_usd) return `${r.slug} has expected value ${r.expected_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
