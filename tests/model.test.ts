// Tests for lib/model.ts — Node built-in test runner, no dependencies.
// Run: node --test tests/model.test.ts   (or npm test)
// No Math.random / Date.now anywhere: every expectation is deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  AIRDROP_POOL_SHARE,
  MODEL,
  buildBoard,
  buildFarmMethod,
  buildRadar,
  farmBreakEvenDeposit,
  farmEvPerDollar,
  farmNetAtPlan,
  farmNetAtPlanRealistic,
  farmRealisticBreakEvenDeposit,
  farmVerdictFor,
  fitSizeCurve,
  fitSizeCurveFromComps,
  parseSnapshot,
  peerMultipleFor,
  saturationMultiplier,
  type PeerTable,
  type Snapshot,
  type SnapshotProtocol,
} from '../lib/model.ts';

const here = dirname(fileURLToPath(import.meta.url));

function protocol(partial: Partial<SnapshotProtocol> & { slug: string }): SnapshotProtocol {
  return {
    name: partial.slug,
    category: 'Lending',
    chains: ['Ethereum'],
    tvl_usd: 100_000_000,
    change_7d: 0,
    mcap_usd: null,
    listed_at: null,
    gecko_id: null,
    symbol: null,
    ...partial,
  };
}

function comp(slug: string, tvl: number, mcap: number, category = 'Lending'): SnapshotProtocol {
  return protocol({ slug, name: slug, category, tvl_usd: tvl, mcap_usd: mcap, gecko_id: `g-${slug}`, symbol: slug.toUpperCase().slice(0, 4), listed_at: '2022-01-01' });
}

function snapshotWith(protocols: SnapshotProtocol[], watchlist: string[] = []): Snapshot {
  return { as_of: '2026-11-14', source: 'test', floor_usd: 5_000_000, protocols, watchlist };
}

// ---- peerMultipleFor ----

test('peerMultipleFor: n>=3 returns the category median, no fallback', () => {
  const peers: PeerTable = { byCategory: new Map([['Lending', { multiple: 0.25, n: 4 }]]), global: 0.2 };
  const r = peerMultipleFor('Lending', peers, MODEL);
  assert.equal(r.multiple, 0.25);
  assert.equal(r.n, 4);
  assert.equal(r.fallback, false);
});

test('peerMultipleFor: n=2 returns a log-space blend, capped at twice the global median', () => {
  const peers: PeerTable = { byCategory: new Map([['Lending', { multiple: 0.4, n: 2 }]]), global: 0.2 };
  const r = peerMultipleFor('Lending', peers, MODEL);
  // log blend: exp(2/3*ln(0.4) + 1/3*ln(0.2)) ≈ 0.314, below the 2x-global cap of 0.4.
  assert.ok(r.multiple > 0.2 && r.multiple < 0.4, `blend ${r.multiple} should sit between global and category median`);
  assert.equal(r.n, 2);
  assert.equal(r.fallback, false);
});

test('peerMultipleFor: n<2 falls back to the global median', () => {
  const peers: PeerTable = { byCategory: new Map([['Lending', { multiple: 0.9, n: 1 }]]), global: 0.2 };
  const r = peerMultipleFor('Lending', peers, MODEL);
  assert.equal(r.multiple, 0.2);
  assert.equal(r.fallback, true);
  const missing = peerMultipleFor('NoSuchCategory', peers, MODEL);
  assert.equal(missing.multiple, 0.2);
  assert.equal(missing.fallback, true);
});

// ---- fitSizeCurve ----

test('fitSizeCurve: OLS recovers a known log-log line', () => {
  // mcap = TVL^0.5 * 100: log(mcap) = log(100) + 0.5*log(TVL).
  const comps = [10, 40, 90, 160, 250, 360, 490, 640, 810, 1000, 1210, 1440].map((tvl, i) => {
    const t = tvl * 1_000_000;
    return comp(`c${i}`, t, Math.round(100 * Math.sqrt(t)));
  });
  const curve = fitSizeCurveFromComps(comps);
  assert.ok(curve !== null);
  assert.ok(Math.abs(curve.slope - 0.5) < 0.01, `slope ${curve.slope}`);
  assert.ok(Math.abs(curve.intercept - Math.log(100)) < 0.05, `intercept ${curve.intercept}`);
  assert.equal(curve.n_comps, 12);
});

test('fitSizeCurve: fewer than 10 comparables returns null', () => {
  const comps = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => comp(`c${i}`, i * 10_000_000, i * 2_000_000));
  assert.equal(fitSizeCurveFromComps(comps), null);
  const snap = snapshotWith(comps);
  assert.equal(fitSizeCurve(snap), null);
});

// ---- saturationMultiplier ----

test('saturationMultiplier: 1 at or below $500M, in (0, 1] above it', () => {
  const curve = { slope: 0.6, intercept: 5.0, n_comps: 128 };
  assert.equal(saturationMultiplier(500_000_000, 0.2, curve, MODEL), 1);
  assert.equal(saturationMultiplier(100_000_000, 0.2, curve, MODEL), 1);
  const above = saturationMultiplier(2_000_000_000, 0.2, curve, MODEL);
  assert.ok(above > 0 && above < 1, `saturation above $500M should be in (0, 1), got ${above}`);
  assert.equal(saturationMultiplier(2_000_000_000, 0.2, null, MODEL), 1);
});

// ---- farm break-even ----

test('farmBreakEvenDeposit: D* = gas x TVL / EV, and 0 when EV is not positive', () => {
  // gas $20, TVL $100M, EV $1M -> D* = 20 * 100M / 1M = $2,000.
  assert.equal(farmBreakEvenDeposit(100_000_000, 1_000_000, 20), 2000);
  assert.equal(farmBreakEvenDeposit(100_000_000, 0, 20), 0);
  assert.equal(farmBreakEvenDeposit(100_000_000, -5, 20), 0);
  assert.equal(farmBreakEvenDeposit(0, 1_000_000, 20), 0);
});

test('farmRealisticBreakEvenDeposit: 1/share times the generous break-even', () => {
  const generous = farmBreakEvenDeposit(100_000_000, 1_000_000, 20);
  const realistic = farmRealisticBreakEvenDeposit(100_000_000, 1_000_000, 20);
  assert.ok(Math.abs(realistic - generous / AIRDROP_POOL_SHARE) <= 1, `realistic ${realistic} vs ${generous / AIRDROP_POOL_SHARE}`);
  assert.equal(farmRealisticBreakEvenDeposit(100_000_000, 0, 20), 0);
});

test('farmNetAtPlanRealistic: capital x EV x share / TVL - gas', () => {
  // $250 x $1M x 0.075 / $100M - $20 = $0.19 - $20 = -$19.81.
  assert.equal(farmNetAtPlanRealistic(250, 100_000_000, 1_000_000, 20), -19.81);
  // With share 1 it is exactly the generous net.
  assert.equal(farmNetAtPlanRealistic(250, 100_000_000, 1_000_000, 20, 1), farmNetAtPlan(250, 100_000_000, 1_000_000, 20));
});

test('farmEvPerDollar: EV / TVL', () => {
  assert.equal(farmEvPerDollar(1_000_000, 100_000_000), 0.01);
  assert.equal(farmEvPerDollar(1_000_000, 0), 0);
});

// ---- farm verdict (judged at the plan deposit, not the sized deposit) ----

test('farmVerdictFor: FARM only when the realistic net at the plan deposit is positive', () => {
  assert.equal(farmVerdictFor(5.5, 100, 0.2), 'FARM');
  assert.equal(farmVerdictFor(0, 100, 0.2), 'THIN');
});

test('farmVerdictFor: THIN when only the generous upper bound is positive', () => {
  assert.equal(farmVerdictFor(-3.25, 100, 0.2), 'THIN');
  assert.equal(farmVerdictFor(-0.01, 0.01, 0.2), 'THIN');
});

test('farmVerdictFor: SKIP when both nets are non-positive, or odds are below 1%', () => {
  assert.equal(farmVerdictFor(-3.25, -10, 0.2), 'SKIP');
  assert.equal(farmVerdictFor(0, 0, 0.2), 'SKIP');
  assert.equal(farmVerdictFor(100, 200, 0.009), 'SKIP');
  assert.equal(farmVerdictFor(100, 200, 0), 'SKIP');
});

// ---- parseSnapshot ----

test('parseSnapshot: accepts a valid snapshot', () => {
  const snap = parseSnapshot(readFileSync(join(here, 'fixtures', 'sample-snapshot.json'), 'utf8'));
  assert.equal(snap.as_of, '2026-11-14');
  assert.equal(snap.floor_usd, 5_000_000);
  assert.equal(snap.protocols.length, 17);
  assert.deepEqual(snap.watchlist, ['alpha-vault', 'beta-lend']);
});

test('parseSnapshot: rejects non-JSON, a bad as_of, and a bad floor_usd', () => {
  assert.throws(() => parseSnapshot('not json'), /not JSON/);
  assert.throws(() => parseSnapshot('{"as_of":"14-11-2026","source":"x","floor_usd":5,"protocols":[],"watchlist":[]}'), /as_of/);
  assert.throws(() => parseSnapshot('{"as_of":"2026-11-14","source":"x","floor_usd":0,"protocols":[],"watchlist":[]}'), /floor_usd/);
  assert.throws(() => parseSnapshot('{"as_of":"2026-11-14","source":"x","floor_usd":5.5,"protocols":[],"watchlist":[]}'), /floor_usd/);
});

test('parseSnapshot: rejects a protocol missing a slug, a name, or a TVL', () => {
  const bad = JSON.stringify({ as_of: '2026-11-14', source: 'x', floor_usd: 5, protocols: [{ name: 'NoSlug', tvl_usd: 1 }], watchlist: [] });
  assert.throws(() => parseSnapshot(bad), /lacks a slug/);
  const badTvl = JSON.stringify({ as_of: '2026-11-14', source: 'x', floor_usd: 5, protocols: [{ slug: 'a', name: 'A' }], watchlist: [] });
  assert.throws(() => parseSnapshot(badTvl), /lacks a slug/);
});

// ---- end-to-end on the synthetic fixture ----

test('buildRadar on the synthetic fixture: watchlist covered, realistic fields present, verdicts honest', () => {
  const snap = parseSnapshot(readFileSync(join(here, 'fixtures', 'sample-snapshot.json'), 'utf8'));
  const { board, radar } = buildRadar(snap);
  // 4 rankable pre-token rows: alpha-vault, beta-lend (watchlist), gamma-dex, delta-yield.
  // epsilon-stable and zeta-staked-eth are excluded, not ranked.
  assert.equal(board.length, 4);
  assert.deepEqual(board.map((r) => r.slug).sort(), ['alpha-vault', 'beta-lend', 'delta-yield', 'gamma-dex']);
  for (const row of board) {
    assert.equal(row.farm_pool_share, AIRDROP_POOL_SHARE);
    assert.ok(row.farm_realistic_break_even_usd >= row.farm_break_even_usd, 'realistic break-even is never below the generous one');
    assert.ok(row.farm_net_at_plan_realistic_usd <= row.farm_net_at_plan_usd, 'realistic net is never above the generous net');
    assert.ok(row.farm_ev_per_dollar_usd > 0);
    // The verdict must follow the plan-deposit rule, not the sized-deposit rule.
    const expected = row.token_odds < 0.01
      ? 'SKIP'
      : row.farm_net_at_plan_realistic_usd > 0
        ? 'FARM'
        : row.farm_net_at_plan_usd > 0
          ? 'THIN'
          : 'SKIP';
    assert.equal(row.farm_verdict, expected, `${row.slug}: verdict ${row.farm_verdict} should be ${expected}`);
    assert.ok(row.farm_steps.length >= 3);
  }
  // Farm-method counts are computed from the board, and the note states the pool share.
  const method = buildFarmMethod(board);
  assert.equal(method.pool_share, AIRDROP_POOL_SHARE);
  assert.equal(method.counts.farm + method.counts.thin + method.counts.skip, board.length);
  assert.match(method.note, /7\.5%/);
  assert.match(method.thresholds, /plan deposit/);
  assert.doesNotMatch(method.note, /by construction/);
  // Radar serialisation carries the new fields to the dashboard.
  assert.equal(radar.rows.length, board.length);
  assert.ok(radar.rows.every((r) => r.farm_net_at_plan_realistic_usd !== undefined && r.farm_pool_share === AIRDROP_POOL_SHARE));
  assert.ok(radar.size_curve !== null, 'fixture has 11 comps, so the size curve fits');
  assert.equal(radar.live.length, 11);
});
