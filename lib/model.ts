// Token launch radar, model radar-2: peer multiples + log momentum + maturity + chain breadth.
//
// The board ranks every pre-token protocol the snapshot carries that is not a wrapped, staked or
// bridged product of a token that already trades. The watchlist is the floor, never the ceiling:
// all 40 watchlist slugs are ranked, plus every other rankable pre-token protocol below the floor.
//
// Implied value follows only from the snapshot's own figures. No protocol name is ever special-cased;
// the same functions score every row, and the peer multiples are computed from this snapshot at run
// time, never typed in by hand:
//
//   peer     = median mcap/tvl of the token-bearing protocols in the same category (n >= 3,
//              clamped to [0.02, 1.5]); a category with fewer peers falls back to the global
//              median of all token-bearing protocols (same clamp)
//   growth   = clamp(change_7d, -60, 120); mapped through a signed log so one +4,448% week
//              cannot explode a row: growthMult = 1 + 0.5 * sign(g) * ln(1+|g|) / ln(121)
//   maturity = 0.7 + 0.3 * min(age_days, 1095) / 1095 (age unknown: 365 days); age saturates,
//              so being old alone never carries a row
//   chains   = 1 + 0.02 * min(chains - 1, 5), capped at +10%
//   implied  = max(1, round(tvl_usd * peer * growthMult * maturity * chains))
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
  growth_floor: number;
  growth_cap: number;
  growth_weight: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_max_extra: number;
}

export const MODEL: ModelConstants = {
  peer_min_n: 3,
  peer_mult_min: 0.02,
  peer_mult_max: 1.5,
  growth_floor: -60,
  growth_cap: 120,
  growth_weight: 0.5,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_step: 0.02,
  chain_max_extra: 0.1,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
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
  on_watchlist: boolean;
  model: {
    peer_multiple: number;
    peer_n: number;
    peer_fallback: boolean;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
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
  peer_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
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

/** Everything the dashboard needs: the board, the live set, the peers, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  global_multiple: number;
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

/**
 * The peer multiples: for every category, the median mcap/tvl of its token-bearing protocols, and
 * the global median across all of them. Computed from this snapshot at run time.
 */
export interface PeerTable {
  byCategory: Map<string, { multiple: number; n: number }>;
  global: number;
}

export function peerMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): PeerTable {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
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

/** The peer multiple a category gets: its own median when it has enough peers, else the global one. */
export function peerMultipleFor(category: string | null, peers: PeerTable, model: ModelConstants = MODEL): { multiple: number; n: number; fallback: boolean } {
  const entry = category === null ? undefined : peers.byCategory.get(category);
  if (entry !== undefined && entry.n >= model.peer_min_n) return { multiple: entry.multiple, n: entry.n, fallback: false };
  return { multiple: peers.global, n: entry?.n ?? 0, fallback: true };
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

/** The multipliers and the implied value one protocol gets under the model. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  peers: PeerTable,
  model: ModelConstants = MODEL,
): { implied: number; peer: { multiple: number; n: number; fallback: boolean }; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const peer = peerMultipleFor(protocol.category, peers, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = growthMultiplier(growthPct, model);
  const maturityMult = maturityMultiplier(age, model);
  const chainMult = chainMultiplier(protocol.chains.length, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * peer.multiple * growthMult * maturityMult * chainMult));
  return { implied, peer, growthPct, growthMult, maturityMult, chainMult, age };
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

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
    const v = impliedValue(p, snapshot.as_of, peers, model);
    return { p, v };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
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
    on_watchlist: snapshot.watchlist.includes(s.p.slug),
    model: {
      peer_multiple: round4(s.v.peer.multiple),
      peer_n: s.v.peer.n,
      peer_fallback: s.v.peer.fallback,
      growth_pct: round4(s.v.growthPct),
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      chain_multiplier: round4(s.v.chainMult),
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age).map(stepText),
  }));
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

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
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
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
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

/** The pre-token protocols the board leaves out, with the reason each one was left out. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && exclusionReason(p) !== null)
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
    peer_multiple: row.model.peer_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    on_watchlist: row.on_watchlist,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const peers = peerMultiples(snapshot, model);
  const early = board.filter((r) => !r.on_watchlist).length;
  const peerTable: PeerEntry[] = [...peers.byCategory.entries()]
    .filter(([, v]) => v.n >= model.peer_min_n)
    .map(([category, v]) => ({ category, multiple: round4(v.multiple), n: v.n }))
    .sort((a, b) => b.n - a.n || (a.category < b.category ? -1 : 1));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    global_multiple: round4(peers.global),
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
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
