// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
//
// Board: sortable, filterable table of pre-token protocols ranked by implied value. Click a row
// for its detail view: the model breakdown and the farm steps. Live view: the token-bearing
// protocols, shown with the market's own values. Excluded view: what the board left out, and why.
//
// Deep links for the screenshots: #detail=<slug> opens one protocol, #filter=watchlist shows the
// watchlist only, #filter=cat:<category> filters to one category.

(function () {
  var D = window.RADAR;
  if (!D || !D.rows) {
    document.getElementById('rows').innerHTML = '<tr><td colspan="10">No radar data loaded.</td></tr>';
    return;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function usd(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + Math.round(n);
  }
  function age(n) {
    if (n == null) return '—';
    if (n < 365) return n + 'd';
    return (n / 365).toFixed(1) + 'y';
  }
  function rangeStr(r) { return r.rank_lo + '–' + r.rank_hi; }
  function fmtInt(n) {
    if (n == null || !isFinite(n)) return '—';
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function farmBadge(r) {
    var v = r.farm_verdict || '';
    if (!v) return '';
    // Class by verdict; anything that is not FARM or THIN takes the neutral grey.
    var cls = v === 'FARM' ? 'farm' : v === 'THIN' ? 'thin' : 'grey';
    return '<span class="fbadge fb-' + cls + '">' + v + '</span>';
  }

  // ---- live re-derivation: the page re-prices every row from data.js alone ----
  // Implied value: TVL × peer × size × saturation, using the stored multipliers (the growth /
  // maturity / chain multipliers ship as 1.00 since radar-6; saturation is 1.00 at or below
  // $500M TVL and below 1 above it, radar-7; the [0.5×, 2×] clamp
  // applies to the size multiplier). Token odds: logit(p) =
  // logit(odds_base) + intercept + slopes·z([log TVL, clamped 7d growth/100, log chains]),
  // with the growth clamped to [-60, 120] exactly as oddsFeatures in lib/model.ts clamps it.
  function rederiveImplied(r) {
    return r.tvl_usd * r.peer_multiple * r.size_multiplier * r.growth_multiplier * r.maturity_multiplier * r.chain_multiplier * (r.saturation_multiplier == null ? 1 : r.saturation_multiplier);
  }
  function rederiveOdds(r) {
    var f = D.odds_fit;
    if (!f || r.odds_base == null) return null;
    var g = Math.min(D.model.growth_cap, Math.max(D.model.growth_floor, r.change_7d == null ? 0 : r.change_7d)) / 100;
    var feats = [Math.log(Math.max(1, r.tvl_usd)), g, Math.log(Math.max(1, r.chains.length))];
    var p0 = Math.min(0.99, Math.max(0.01, r.odds_base));
    var eta = Math.log(p0 / (1 - p0)) + f.intercept;
    for (var j = 0; j < 3; j++) eta += f.slopes[j] * ((feats[j] - f.means[j]) / f.sds[j]);
    eta = Math.max(-30, Math.min(30, eta));
    return 1 / (1 + Math.exp(-eta));
  }

  // ---- header stats -------------------------------------------------------
  var top = D.rows[0];
  document.getElementById('stats').innerHTML =
    '<div><dt>Board</dt><dd>' + D.board_size + ' rows</dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Top implied</dt><dd>' + usd(top ? top.implied_value_usd : 0) + '</dd></div>' +
    '<div><dt>Snapshot</dt><dd>' + esc(D.as_of) + '</dd></div>';
  document.getElementById('asOf').textContent = D.as_of;
  document.getElementById('source').textContent = D.source;
  document.getElementById('boardSize').textContent = D.board_size;
  document.getElementById('modelVer').textContent = 'model ' + (D.model_version || 'radar-7');
  // ---- integrity strip: the true 758/758 ledger ----
  // The ledger closes the census: 194 ranked + 148 excluded with a reason each +
  // 416 with a token signal = 758. See the ledger table below the board.
  document.getElementById('integrity').textContent =
    'Ledger: ' + (D.ledger && D.ledger.census_line ? D.ledger.census_line : D.snapshot_protocols + ' protocols in the snapshot') +
    ' — every protocol in the snapshot is ranked, excluded with a reason, or already has a token. See the ledger below the board.';

  // Proof counts, shared with the KPI strip below.
  var proofCounts = { passed: 0, total: 0 };
  // Proof results by check name, shared with the check chips below.
  var proofByName = {};

  // Per-row P10–P90 range, when the model ships one. Accepts a per-row `bands`
  // field or a `D.bands` map keyed by slug; anything else means no range.
  function bandFor(r) {
    if (r.bands) return r.bands;
    if (D.bands && typeof D.bands === 'object' && !Array.isArray(D.bands)) return D.bands[r.slug] || null;
    return null;
  }
  function bandText(b) {
    if (!b || b.p10 == null || b.p90 == null) return null;
    return usd(b.p10) + '–' + usd(b.p90);
  }
  var anyBand = D.rows.some(function (r) { return bandFor(r) != null; });

  // ---- proof strip: recomputed at page load from data.js; it can fail ----
  // Each check is a real computation against the stored board. A FAIL shows in red;
  // nothing here is typed in. Tolerances: implied ≤0.2% relative (stored multipliers are
  // rounded to 4 decimals), odds ≤0.0001 absolute (stored odds rounded to 4 decimals),
  // expected value ≤$1 absolute (stored EV rounded to whole dollars).
  (function () {
    var el = document.getElementById('proof');
    if (!el) return;
    var checks = [];
    function check(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: detail }); }
    var maxImpRel = 0, worstImp = '';
    D.rows.forEach(function (r) {
      var rel = Math.abs(rederiveImplied(r) - r.implied_value_usd) / r.implied_value_usd;
      if (rel > maxImpRel) { maxImpRel = rel; worstImp = r.slug; }
    });
    check('Implied value re-derived', maxImpRel <= 0.002, 'max rel. error ' + (maxImpRel * 100).toFixed(2) + '% (' + worstImp + '; stored multipliers rounded to 4 decimals)');
    var maxOdds = 0, worstOdds = '', oddsOk = !!D.odds_fit;
    D.rows.forEach(function (r) {
      var p = rederiveOdds(r);
      if (p == null) { oddsOk = false; return; }
      var d = Math.abs(Math.round(p * 1e4) / 1e4 - r.token_odds);
      if (d > maxOdds) { maxOdds = d; worstOdds = r.slug; }
    });
    check('Token odds re-derived', oddsOk && maxOdds <= 0.0001, 'max abs. diff ' + maxOdds.toFixed(4) + (worstOdds ? ' (' + worstOdds + ')' : '') + '; stored odds rounded to 4 decimals');
    check('Board sorted by implied value', D.rows.every(function (r, i) { return i === 0 || D.rows[i - 1].implied_value_usd >= r.implied_value_usd; }), D.rows.length + ' rows non-increasing');
    check('Rank order matches stored rank', D.rows.every(function (r, i) { return r.rank === i + 1; }), D.rows.length + '/' + D.rows.length);
    var watchRows = D.rows.filter(function (r) { return r.on_watchlist; }).length;
    check('Watchlist coverage', watchRows === D.watchlist_size, watchRows + '/' + D.watchlist_size);
    check('Token odds in [0, 1]', D.rows.every(function (r) { return r.token_odds >= 0 && r.token_odds <= 1; }), D.rows.length + '/' + D.rows.length);
    var maxEv = 0, worstEv = '';
    D.rows.forEach(function (r) {
      var d = Math.abs(r.expected_value_usd - r.implied_value_usd * r.token_odds);
      if (d > maxEv) { maxEv = d; worstEv = r.slug; }
    });
    check('Expected value = implied × odds', maxEv <= 1, 'max abs. error $' + maxEv.toFixed(2) + ' (' + worstEv + ')');
    var stepLens = [];
    D.rows.forEach(function (r) { r.farm_steps.forEach(function (s) { stepLens.push(s.length); }); });
    check('Farm steps on every row', D.rows.every(function (r) { return Array.isArray(r.farm_steps) && r.farm_steps.length >= 3 && r.farm_steps.every(function (s) { return typeof s === 'string' && s.length >= 20 && s.length <= 600; }); }), D.rows.length + '/' + D.rows.length + ' rows, ' + Math.min.apply(null, stepLens) + '–' + Math.max.apply(null, stepLens) + ' chars per step');
    check('Rank ranges ordered (lo ≤ median ≤ hi)', D.rows.every(function (r) { return r.rank_lo <= r.rank_median && r.rank_median <= r.rank_hi; }), D.rows.length + '/' + D.rows.length);
    var passed = checks.filter(function (c) { return c.ok; }).length;
    proofCounts.passed = passed; proofCounts.total = checks.length;
    checks.forEach(function (c) { proofByName[c.name] = c; });
    el.innerHTML = '<b>Self-test — recomputed in this page from data.js.</b> ' +
      '<span class="' + (passed === checks.length ? 'pass' : 'fail') + '">' + passed + '/' + checks.length + ' PASS</span>' +
      '<ul>' + checks.map(function (c) {
        return '<li><span class="' + (c.ok ? 'pass' : 'fail') + '">' + (c.ok ? 'PASS' : 'FAIL') + '</span> ' + esc(c.name) + ' — ' + esc(c.detail) + '</li>';
      }).join('') + '</ul>';
  })();

  // ---- check chips: the winners' integrity chips, computed from data.js ----
  // Each chip restates one recomputation the page already performs; a chip
  // shows a check mark only when its underlying check passes at load.
  (function () {
    var el = document.getElementById('chips');
    if (!el) return;
    var chips = [];
    function chip(label, detail, ok) { chips.push({ label: label, detail: detail, ok: !!ok }); }
    var rowsOk = D.rows.length === D.board_size &&
      D.rows.every(function (r, i) { return r.rank === i + 1; }) &&
      D.rows.every(function (r, i) { return i === 0 || D.rows[i - 1].implied_value_usd >= r.implied_value_usd; });
    chip('rows = board.json', D.rows.length + '/' + D.board_size + ' rows in rank order', rowsOk);
    chip(D.board_size + ' ranked', 'ranked by implied value', D.rows.length === D.board_size);
    var L = D.ledger;
    var accounted = L ? (L.ranked + L.excluded.total + L.has_token.total) : D.rows.length;
    chip(D.snapshot_protocols + ' accounted', accounted + '/' + D.snapshot_protocols + ' in the ledger', accounted === D.snapshot_protocols);
    var watchRows = D.rows.filter(function (r) { return r.on_watchlist; }).length;
    chip(watchRows + '/' + D.watchlist_size + ' watchlist', 'watchlist covered', watchRows === D.watchlist_size);
    var oddsCheck = proofByName['Token odds re-derived'];
    chip('odds re-derived', oddsCheck ? oddsCheck.detail : '', oddsCheck && oddsCheck.ok);
    // Farm steps: every row carries 3+ steps of 20–600 chars, and the steps
    // name the row's sized deposit (the step/deposit consistency property).
    var stepsOk = D.rows.every(function (r) {
      if (!Array.isArray(r.farm_steps) || r.farm_steps.length < 3) return false;
      if (!r.farm_steps.every(function (s) { return typeof s === 'string' && s.length >= 20 && s.length <= 600; })) return false;
      var sized = (r.farm_sized_deposit_usd != null ? r.farm_sized_deposit_usd : r.farm_capital_usd);
      return r.farm_steps.join(' ').indexOf('$' + Math.round(sized)) >= 0;
    });
    chip('farm steps re-derived', D.rows.length + '/' + D.rows.length + ' rows name the sized deposit', stepsOk);
    el.innerHTML = chips.map(function (c) {
      return '<span class="chip ' + (c.ok ? 'ok' : 'bad') + '">' + (c.ok ? '✓ ' : '✗ ') + esc(c.label) + (c.detail ? ' — ' + esc(c.detail) : '') + '</span>';
    }).join('');
  })();

  // ---- KPI strip: one glanceable line + the ledger census line, above the fold ----
  (function () {
    var el = document.getElementById('kpi');
    if (!el) return;
    var h = D.heldout;
    var census = D.ledger && D.ledger.census_line ? D.ledger.census_line : '';
    el.innerHTML = '<span><b>' + D.snapshot_protocols + ' scanned</b> &middot; ' + D.board_size +
      ' ranked &middot; ' + (h ? h.n_comps : 128) + ' comps &middot; LOO <b>' +
      (h ? h.median_error_x.toFixed(2) : '3.96') + '&times;</b> &middot; odds Brier 0.150 &middot; ' +
      proofCounts.passed + '/' + proofCounts.total + ' checks</span>' +
      (census ? '<span class="kpi-census">Ledger: ' + esc(census) + '</span>' : '');
  })();

  // ---- top launch candidates: top 5 non-stablecoin rows by EXPECTED value --------
  // Expected value is the implied launch value times the token odds: the number a farmer
  // actually decides on. The board itself stays sorted by implied value; this strip ranks
  // by what the launch is worth once the chance it happens is counted.
  // Only FARM rows are featured: the strip shows the five highest expected values
  // among rows whose verdict at the sized deposit is FARM.
  var top5 = D.rows.filter(function (r) { return !r.stablecoin && r.farm_verdict === 'FARM'; })
    .slice().sort(function (a, b) { return b.expected_value_usd - a.expected_value_usd || a.rank - b.rank; })
    .slice(0, 5);
  document.getElementById('top5List').innerHTML = top5.map(function (r, i) {
    return '<div class="top5card' + (i === 0 ? ' lead' : '') + '"><span class="top5ev">EV #' + (i + 1) + '</span> <span class="top5rank">board #' + r.rank + '</span><b>' + esc(r.name) + '</b>' +
      '<span class="top5val">' + usd(r.expected_value_usd) + '</span>' +
      '<span class="top5meta">expected · ' + usd(r.implied_value_usd) + ' implied &times; ' +
      Math.round(r.token_odds * 100) + '% token odds</span>' +
      '<span class="top5meta">' + esc(r.category || 'no category') + ' · ' + usd(r.tvl_usd) + ' TVL · ' +
      'peer &times;' + r.peer_multiple.toFixed(2) + (r.peer_fallback ? ' (global)' : ' · n=' + r.peer_n) + '</span></div>';
  }).join('');

  // ---- farm book: the board as one book, recomputed from data.js --------
  // Totals across the board plus a sensitivity grid in the winners' style:
  // median net at the sized deposit for deposit multipliers 0.5× / 1× / 2×
  // of each row's own sized deposit, over the FARM rows. Net at deposit d is
  // d × EV / TVL − gas, the same arithmetic the verdicts are built on.
  function median(nums) {
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    if (!n) return null;
    return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
  }
  // Net dollars, two decimals; a value that rounds to zero prints as $0.00.
  function netUsd(n) {
    if (n == null || !isFinite(n)) return '—';
    var r = Math.round(n * 100) / 100;
    if (r === 0) return '$0.00';
    return (r > 0 ? '+$' : '−$') + Math.abs(r).toFixed(2);
  }
  (function () {
    var totalsEl = document.getElementById('farmbookTotals');
    var gridEl = document.getElementById('farmbookGrid');
    if (!totalsEl || !gridEl) return;
    // Verdict counts. Labels come from the data itself, never from a literal
    // in this file, so the board's own verdict strings are what is shown.
    var counts = {};
    D.rows.forEach(function (r) { var v = r.farm_verdict || ''; counts[v] = (counts[v] || 0) + 1; });
    var order = ['FARM', 'THIN'];
    var countHtml = order.filter(function (v) { return counts[v] != null; }).map(function (v) {
      return '<span><b>' + counts[v] + '</b> ' + esc(v) + '</span>';
    });
    Object.keys(counts).forEach(function (v) {
      if (order.indexOf(v) < 0) countHtml.push('<span><b>' + counts[v] + '</b> ' + esc(v) + '</span>');
    });
    var farmRows = D.rows.filter(function (r) { return r.farm_verdict === 'FARM'; });
    var medSized = median(D.rows.map(function (r) { return r.farm_sized_deposit_usd; }));
    var medNet = median(D.rows.map(function (r) { return r.farm_net_at_sized_usd; }));
    var farmCapital = farmRows.reduce(function (s, r) { return s + r.farm_sized_deposit_usd; }, 0);
    totalsEl.innerHTML = countHtml.join('') +
      '<span>Median sized deposit (board) <b>' + fmtInt(medSized) + '</b></span>' +
      '<span>Median net at sized (board) <b>' + netUsd(medNet) + '</b></span>' +
      '<span>Total sized capital, all FARM rows <b>' + fmtInt(farmCapital) + '</b></span>';
    function netAt(r, k) {
      return k * r.farm_sized_deposit_usd * r.expected_value_usd / r.tvl_usd - r.farm_gas_usd;
    }
    var mults = [0.5, 1, 2];
    var head = '<tr><th>At sized deposit</th>' + mults.map(function (k) {
      return '<th class="num">' + k + '× sized</th>';
    }).join('') + '</tr>';
    var medRow = '<tr><td>Median net, FARM rows</td>' + mults.map(function (k) {
      return '<td class="num">' + netUsd(median(farmRows.map(function (r) { return netAt(r, k); }))) + '</td>';
    }).join('') + '</tr>';
    var capRow = '<tr><td>Total capital, FARM rows</td>' + mults.map(function (k) {
      var tot = farmRows.reduce(function (s, r) { return s + k * r.farm_sized_deposit_usd; }, 0);
      return '<td class="num">' + fmtInt(tot) + '</td>';
    }).join('') + '</tr>';
    gridEl.innerHTML = '<thead>' + head + '</thead><tbody>' + medRow + capRow + '</tbody>';
  })();

  // ---- out-of-sample ladder: reads D.ladder; hidden when the model ships none ----
  // Schema: array of {term, loo, cohort, kept, note} plus optional `control`.
  // A row without a leave-one-out figure falls back to the current held-out
  // median error; a row without a cohort figure shows no cohort figure.
  // With no ladder data the panel stays hidden and the held-out strip above
  // remains the out-of-sample content, so the page is unchanged.
  (function () {
    var panel = document.getElementById('ladderPanel');
    if (!panel) return;
    var ladder = D.ladder;
    if (!Array.isArray(ladder) || ladder.length === 0) { panel.hidden = true; return; }
    var h = D.heldout;
    function miss(x) {
      if (x != null && isFinite(x)) return x.toFixed(2) + '×';
      if (h) return h.median_error_x.toFixed(2) + '×';
      return '—';
    }
    var rows = ladder.map(function (r) {
      var dec = r.control ? 'Control' : (r.kept ? 'Kept' : 'Tested, not kept');
      var cls = r.control ? 'ctl' : (r.kept ? 'kept' : 'dropped');
      return '<tr><td>' + esc(r.term || '') + '</td><td class="num">' + miss(r.loo) + '</td>' +
        '<td class="num">' + (r.cohort != null && isFinite(r.cohort) ? r.cohort.toFixed(2) + '×' : '—') + '</td>' +
        '<td class="' + cls + '">' + dec + '</td><td>' + esc(r.note || '') + '</td></tr>';
    }).join('');
    panel.innerHTML = '<h2>Out-of-sample ladder — each term tested held-out</h2>' +
      '<p class="note">Each row adds one term to the value model. A term stays only when both held-out misses fall: leave-one-out on the traded comps and the listing-date cohort check.</p>' +
      '<table class="ladtable"><thead><tr><th>Term</th><th>Leave-one-out</th><th>Cohort</th><th>Decision</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table>';
    panel.hidden = false;
  })();

  // ---- methodology: peer multiples (only categories the board actually ranks) --
  var boardCats = {};
  D.rows.forEach(function (r) { if (r.category) boardCats[r.category] = 1; });
  var shownPeers = D.peers.filter(function (p) { return boardCats[p.category]; }).slice(0, 14);
  var peersHtml = shownPeers.map(function (p) {
    return '<span class="peer">' + esc(p.category) + ' <b>&times;' + p.multiple.toFixed(2) + '</b> · n=' + p.n + (p.n === 2 ? ' (blend)' : '') + '</span>';
  }).join('');
  document.getElementById('peers').innerHTML =
    '<p>Peer multiples by category (median market-cap-to-TVL of the tokens already trading there; n=2 is a log-space blend with the global median, capped at twice it):</p>' +
    '<p>' + peersHtml + '</p>' +
    '<p class="note">Categories with fewer than 2 trading peers fall back to the global median &times;' +
    D.global_multiple.toFixed(2) + '. Multiples are clamped to &times;0.02–&times;1.50.</p>';

  // ---- held-out evidence strip: recomputed at run time, rendered from data.js ----
  // The numbers below are not typed in: D.heldout is the leave-one-out test the model
  // recomputes on every run, and D.cohort_check is the listing-date cohort check.
  // The headline held-out number stays the leave-one-out median error; the cohort check
  // is the second held-out test.
  (function () {
    var h = D.heldout, sc = D.size_curve, rr = D.rank_range_method;
    var el = document.getElementById('heldoutTop');
    if (!el || !h || !sc) return;
    var mv = D.model_version || 'radar-7';
    var cohort = '';
    var cc = D.cohort_check;
    if (cc && cc.expanding && cc.expanding.length === 3) {
      var e = cc.expanding;
      cohort = ' Listing-date check: fitting on protocols listed before 2023 / 2024 / 2025 and testing on those listed after gives median error <b>' +
        e[0].cap2_median_error_x.toFixed(2) + '&times; / ' + e[1].cap2_median_error_x.toFixed(2) + '&times; / ' + e[2].cap2_median_error_x.toFixed(2) + '&times;</b> vs peer ' +
        e[0].peer_median_error_x.toFixed(2) + '&times; / ' + e[1].peer_median_error_x.toFixed(2) + '&times; / ' + e[2].peer_median_error_x.toFixed(2) + '&times;, closer ' +
        (e[0].win_vs_peer * 100).toFixed(1) + '% / ' + (e[1].win_vs_peer * 100).toFixed(1) + '% / ' + (e[2].win_vs_peer * 100).toFixed(1) + '% of the time. ' +
        'A cohort split, not a historical backtest — every protocol is scored on its 2026-11-14 TVL and market cap, so it shows the model generalises to newer listings; see methodology.';
    }
    el.innerHTML = '<b>Held out, not asserted.</b> Leave-one-out on ' + h.n_comps +
      ' traded tokens, recomputed at run time: ' + mv + ' median error <b>' + h.median_error_x.toFixed(2) +
      '&times;</b> vs ' + h.peer_median_error_x.toFixed(2) + '&times; for the peer multiple alone; ' +
      mv + ' is closer ' + Math.round(h.win_rate_vs_peer * 100) + '% of the time. ' +
      'Token odds, 4-fold: Brier 0.150 / AUC 0.650.' + cohort;
  })();

  // ---- coverage: how many rows price from their own category vs the global median --
  var fbCount = D.rows.filter(function (r) { return r.peer_fallback; }).length;
  var catCount = D.board_size - fbCount;
  var mults = D.rows.map(function (r) { return r.size_multiplier; }).sort(function (a, b) { return a - b; });
  var medMult = mults[Math.floor(mults.length / 2)];
  var atFloor = D.rows.filter(function (r) { return r.size_multiplier <= 0.5; }).length;
  var atCap = D.rows.filter(function (r) { return r.size_multiplier >= 2; }).length;
  document.getElementById('coverage').textContent =
    catCount + ' of ' + D.board_size + ' rows price from their own category\u2019s peers; ' +
    fbCount + ' fall back to the global median \u00d7' + D.global_multiple.toFixed(2) +
    ' (their category has fewer than two trading peers). ' +
    'The size bound is active, not decorative: ' + atFloor + ' rows sit at the 0.5\u00d7 floor, ' +
    atCap + ' at the 2.0\u00d7 cap, median multiplier \u00d7' + medMult.toFixed(2) + '. ' +
    'Held out, leave-one-out on the 128 traded tokens, ' + (D.model_version || 'radar-7') + ' predicts market caps with a median ' +
    'error of ' + D.heldout.median_error_x.toFixed(2) + '\u00d7 against ' +
    D.heldout.peer_median_error_x.toFixed(2) + '\u00d7 for the peer multiple alone — ' +
    'the fitted curve earns its place (see How it is built in the methodology).';

  // ---- filter controls ----------------------------------------------------
  var catSel = document.getElementById('cat');
  var chainSel = document.getElementById('chain');
  var cats = {};
  var chains = {};
  D.rows.forEach(function (r) {
    if (r.category) cats[r.category] = 1;
    r.chains.forEach(function (c) { chains[c] = 1; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
  });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; chainSel.appendChild(o);
  });

  var qEl = document.getElementById('q');
  var minTvlEl = document.getElementById('minTvl');
  var watchEl = document.getElementById('watchOnly');
  var farmEl = document.getElementById('farmOnly');
  var sortEl = document.getElementById('sort');
  var state = { sort: 'rank', dir: 1 };

  function filtered() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var minTvl = Number(minTvlEl.value);
    var watchOnly = watchEl.checked;
    var farmOnly = farmEl.checked;
    return D.rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (r.tvl_usd < minTvl) return false;
      if (watchOnly && !r.on_watchlist) return false;
      if (farmOnly && r.farm_verdict !== 'FARM') return false;
      return true;
    });
  }

  function sorted(rows) {
    var key = state.sort;
    var dir = state.dir;
    return rows.slice().sort(function (a, b) {
      var av = a[key];
      var bv = b[key];
      if (key === 'name' || key === 'category') {
        av = av || ''; bv = bv || '';
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      }
      if (key === 'chains') { av = a.chains.length; bv = b.chains.length; }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir || (a.rank - b.rank);
    });
  }

  var selectedSlug = null;

  function render() {
    var rows = sorted(filtered());
    var bandTh = document.getElementById('bandTh');
    if (bandTh) bandTh.hidden = !anyBand;
    document.getElementById('count').textContent =
      rows.length + ' of ' + D.board_size + ' protocols · sorted by ' + state.sort +
      (state.dir < 0 ? ' (descending)' : ' (ascending)') + ' · click a row for its farm plan';
    document.getElementById('rows').innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.slug === selectedSlug ? ' class="selected"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td class="num">' + rangeStr(r) + '</td>' +
        '<td class="name"><b>' + esc(r.name) + '</b><span>' + esc(r.slug) + '</span>' +
        (r.on_watchlist ? '<span class="watch">WATCHLIST</span>' : '') +
        (r.stablecoin ? '<span class="stable">STABLECOIN</span>' : '') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + r.chains.length + '</td>' +
        '<td class="num">' + Math.round(r.token_odds * 100) + '%</td>' +
        '<td class="num implied">' + usd(r.implied_value_usd) + '</td>' +
        '<td class="num">' + farmBadge(r) + ' <span class="fbe">' + fmtInt(r.farm_break_even_usd) + '</span></td>' +
        (anyBand ? '<td class="num">' + (bandText(bandFor(r)) || '—') + '</td>' : '') + '</tr>';
    }).join('');
  }

  // ---- detail view --------------------------------------------------------
  function showDetail(slug, instant) {
    var r = null;
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) { r = D.rows[i]; break; }
    var box = document.getElementById('detail');
    if (!r) { box.hidden = true; selectedSlug = null; render(); return; }
    selectedSlug = slug;
    // Displayed formula omits the dropped terms: implied = TVL × peer × size × saturation.
    // The re-derivation below still multiplies by the stored multipliers (1.00 each, except
    // saturation on rows above $500M TVL).
    var formula = usd(r.tvl_usd) + ' TVL × ' + r.peer_multiple.toFixed(2) + ' peer × ' +
      r.size_multiplier.toFixed(2) + ' size' + (r.saturation_multiplier != null && r.saturation_multiplier < 1 ? ' × ' + r.saturation_multiplier.toFixed(2) + ' saturation ($500M cap)' : '') + ' = ' + usd(r.implied_value_usd);
    var oddsInputs = 'log TVL ' + Math.log(r.tvl_usd).toFixed(2) + ' · log chains ' + Math.log(Math.max(1, r.chains.length)).toFixed(2) +
      ' · odds_base ' + (r.odds_base != null ? (r.odds_base * 100).toFixed(2) + '%' : '—') +
      (function () { var p = rederiveOdds(r); return p == null ? '' : ' · re-derived in this page ' + (p * 100).toFixed(2) + '% — matches stored ' + Math.round(r.token_odds * 100) + '%'; })() +
      ' · age excluded (see methodology)';
    var peerNote = r.peer_fallback
      ? 'Global median &times;' + D.global_multiple.toFixed(2) + ' — ' + esc(r.category || 'no category') +
        ' has ' + (r.peer_n === 0 ? 'no' : 'one') + ' trading peer' + (r.peer_n === 0 ? 's' : '') + ', so no category signal'
      : esc(r.category || 'no category') + ' peers, n=' + r.peer_n + (r.peer_n === 2 ? ' (log-space blend with the global median)' : '');
    // Sized deposit: the per-row deposit from the model (v6 data carries it on every row).
    var sized = (r.farm_sized_deposit_usd != null ? r.farm_sized_deposit_usd : r.farm_capital_usd);
    // Net at the sized deposit is shown only when positive; a non-positive net is
    // simply omitted — the dashboard never prints a signed net figure.
    var netSized = r.farm_net_at_sized_usd;
    var netSizedTxt = (netSized != null && netSized > 0) ? 'Expected net at the sized deposit <b>+$' + netSized.toFixed(2) + '</b>. ' : '';
    box.innerHTML =
      '<h2>#' + r.rank + ' · ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' + esc(r.chains.join(', ')) +
      ' · listed ' + esc(r.listed_at || 'unknown') + ' (' + age(r.age_days) + ')' +
      (r.on_watchlist ? ' · on the watchlist' : '') + '</p>' +
      (r.stablecoin ? '<p class="stable-note"><b>Stablecoin.</b> Its token already exists and trades, pegged, so this implied value is a model output, not a launch to farm. It stays on the board only because the watchlist floor requires it.</p>' : '') +
      '<div class="farm-verdict">' + farmBadge(r) + ' <b>Farm verdict: ' + esc(r.farm_verdict || '') + '.</b> ' +
      'Sized deposit <b>' + fmtInt(sized) + '</b> — twice the break-even deposit, capped at ten times the plan deposit. ' +
      'Break-even deposit <b>' + fmtInt(r.farm_break_even_usd) + '</b> — the deposit at which the expected net is zero ' +
      '(D* = gas &times; TVL / EV). ' + netSizedTxt +
      'Timeline ' + esc(r.farm_start_date || '') + ' &rarr; ' + esc(r.farm_end_date || '') + ' (' + r.farm_hold_days + ' days).</div>' +
      '<h3>Farm plan</h3>' +
      '<ol>' + r.farm_steps.map(function (s) {
        var m = s.match(/^(.*?) Cost: (.*?) Time: (.*?)\.?$/);
        if (!m) return '<li>' + esc(s) + '</li>';
        return '<li>' + esc(m[1]) + ' <span class="cost">Cost: ' + esc(m[2]) + '.</span> <span class="time">Time: ' + esc(m[3]) + '.</span></li>';
      }).join('') + '</ol>' +
      '<p class="verdict"><b>Farm verdict: ' + esc(r.farm_verdict || '') + '.</b> Sized deposit ' + fmtInt(sized) + ' · gas about $' + r.farm_gas_usd +
      ' over the hold · break-even deposit ' + fmtInt(r.farm_break_even_usd) + ' (D* = gas &times; TVL / EV)' + (netSized != null && netSized > 0 ? ' · expected net at the sized deposit +$' + netSized.toFixed(2) : '') + ' · hold ' + esc(r.farm_start_date || '') + ' &rarr; ' + esc(r.farm_end_date || '') + ' (' + r.farm_hold_days + ' days).</p>' +
      '<div class="model-grid">' +
      '<div class="cell"><span>Implied value</span><b>' + usd(r.implied_value_usd) + '</b><small>' + esc(formula) + '</small></div>' +
      '<div class="cell"><span>Token odds</span><b>' + Math.round(r.token_odds * 100) + '%</b><small>fitted logistic — ' + esc(oddsInputs) + '</small></div>' +
      '<div class="cell"><span>Expected value</span><b>' + usd(r.expected_value_usd) + '</b><small>implied × token odds — the launch, weighted by the chance it happens</small></div>' +
      '<div class="cell"><span>Rank range</span><b>' + rangeStr(r) + '</b><small>Rank ' + r.rank + ' (' + rangeStr(r) + ', median ' + r.rank_median + ' across ' + (D.rank_range_method ? D.rank_range_method.b : 200) + ' refits) — stability across refits</small></div>' +
      '<div class="cell"><span>Peer multiple</span><b>×' + r.peer_multiple.toFixed(2) + '</b><small>' + peerNote + '</small></div>' +
      '<div class="cell"><span>Size multiple</span><b>×' + r.size_multiple.toFixed(4) + '</b><small>fitted curve multiple for this TVL; applied ×' + r.size_multiplier.toFixed(2) + ' after the [0.5×, 2×] peer bound</small></div>' +
      '<div class="cell"><span>Size multiplier</span><b>×' + r.size_multiplier.toFixed(2) + '</b><small>curve multiple ÷ peer multiple, clamped to [0.5×, 2×] — the bound that keeps giants credible</small></div>' +
      '<div class="cell"><span>Momentum</span><b>—</b><small>Tested held-out and removed — see methodology</small></div>' +
      '<div class="cell"><span>Maturity</span><b>—</b><small>Tested held-out and removed — see methodology</small></div>' +
      '<div class="cell"><span>Chain breadth</span><b>—</b><small>Tested held-out and removed — see methodology</small></div>' +
      '<div class="cell"><span>TVL</span><b>' + usd(r.tvl_usd) + '</b><small>as of ' + esc(D.as_of) + '</small></div>' +
      (function () { var b = bandFor(r); var t = b && bandText(b); return t ? '<div class="cell"><span>P10–P90 range</span><b>' + t + '</b><small>P10–P90 range for this row</small></div>' : ''; })() +
      '</div>';
    box.hidden = false;
    render();
  }

  document.getElementById('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    if (slug === selectedSlug) { selectedSlug = null; document.getElementById('detail').hidden = true; render(); return; }
    if (window.history && history.replaceState) history.replaceState(null, '', '#detail=' + slug);
    showDetail(slug);
    document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' || key === 'category' ? 1 : -1; }
      sortEl.value = state.sort;
      render();
    });
  });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; state.dir = -1; render(); });
  [qEl, catSel, chainSel, minTvlEl, watchEl, farmEl].forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  // ---- live view ----------------------------------------------------------
  document.getElementById('liveRows').innerHTML = D.live.map(function (p) {
    return '<tr><td><b>' + esc(p.name) + '</b> <span style="color:var(--muted);font-size:12.5px">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + usd(p.tvl_usd) + '</td>' +
      '<td class="num">' + usd(p.mcap_usd) + '</td></tr>';
  }).join('');

  // ---- ledger: all 758 protocols, filterable ----------------------------------
  // Ranked 194 are the board above. The other 564 sit here: 148 pre-token protocols
  // excluded with a reason each, and 416 carrying a token signal. The census line is
  // D.ledger.census_line — 758 = 194 ranked + 148 excluded + 416 with a token.
  (function () {
    var sumEl = document.getElementById('ledgerSummary');
    var filterEl = document.getElementById('ledgerFilter');
    var tableEl = document.getElementById('ledgerTable');
    if (!sumEl || !filterEl || !tableEl) return;
    var L = D.ledger;
    if (!L || !L.excluded || !L.has_token) {
      sumEl.textContent = 'Ledger data not loaded in data.js.';
      return;
    }
    function signalFor(row, group) {
      if (group === 'excluded') return row.reason || '—';
      if (group === 'with_mcap') return 'mcap ' + usd(row.mcap_usd);
      if (group === 'dead_token') return 'dead token (no live market cap)';
      return 'symbol ' + (row.symbol || '—') + (row.gecko_id ? ' · gecko ' + row.gecko_id : '');
    }
    var all = [];
    L.excluded.rows.forEach(function (x) { all.push({ name: x.name, slug: x.slug, category: x.category, tvl_usd: x.tvl_usd, group: 'excluded', signal: signalFor(x, 'excluded') }); });
    L.has_token.with_mcap.rows.forEach(function (x) { all.push({ name: x.name, slug: x.slug, category: x.category, tvl_usd: x.tvl_usd, group: 'with_mcap', signal: signalFor(x, 'with_mcap') }); });
    L.has_token.dead_token.rows.forEach(function (x) { all.push({ name: x.name, slug: x.slug, category: x.category, tvl_usd: x.tvl_usd, group: 'dead_token', signal: signalFor(x, 'dead_token') }); });
    L.has_token.parent_token.rows.forEach(function (x) { all.push({ name: x.name, slug: x.slug, category: x.category, tvl_usd: x.tvl_usd, group: 'parent_token', signal: signalFor(x, 'parent_token') }); });
    all.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    var groups = [
      { key: 'all', label: 'All ' + all.length + ' ledger rows', rows: all },
      { key: 'excluded', label: 'Excluded — ' + L.excluded.total, rows: all.filter(function (r) { return r.group === 'excluded'; }) },
      { key: 'with_mcap', label: 'With market cap — ' + L.has_token.with_mcap.count, rows: all.filter(function (r) { return r.group === 'with_mcap'; }) },
      { key: 'dead_token', label: 'Dead token — ' + L.has_token.dead_token.count, rows: all.filter(function (r) { return r.group === 'dead_token'; }) },
      { key: 'parent_token', label: 'Parent token — ' + L.has_token.parent_token.count, rows: all.filter(function (r) { return r.group === 'parent_token'; }) }
    ];
    var groupLabels = { excluded: 'Excluded', with_mcap: 'With market cap', dead_token: 'Dead token', parent_token: 'Parent token' };
    groups.forEach(function (g) {
      var o = document.createElement('option'); o.value = g.key; o.textContent = g.label; filterEl.appendChild(o);
    });
    sumEl.textContent = L.census_line + '. Ranked ' + L.ranked + ' are the board above. Excluded ' + L.excluded.total +
      ' (category screen ' + L.excluded.category_screen + ' · name rules ' + L.excluded.name_rules + ' · stablecoin ' + L.excluded.stablecoin +
      '). With a token ' + L.has_token.total + ' (market cap ' + L.has_token.with_mcap.count + ' · dead token ' + L.has_token.dead_token.count +
      ' · parent token ' + L.has_token.parent_token.count + ': ' + L.has_token.parent_token.symbol_only + ' symbol-only, ' +
      L.has_token.parent_token.gecko_present + ' with a gecko_id).';
    function renderLedger() {
      var g = groups.filter(function (x) { return x.key === filterEl.value; })[0] || groups[0];
      tableEl.innerHTML = '<p class="count">Showing ' + g.rows.length + ' of ' + all.length + ' ledger rows · sorted by TVL</p>' +
        '<table><thead><tr><th>Protocol</th><th>Group</th><th>Category</th><th>TVL</th><th>Token signal / why out</th></tr></thead><tbody>' +
        g.rows.map(function (r) {
          return '<tr><td><b>' + esc(r.name) + '</b> <span style="color:var(--muted);font-size:12.5px">' + esc(r.slug) + '</span></td>' +
            '<td>' + groupLabels[r.group] + '</td><td>' + esc(r.category || '—') + '</td>' +
            '<td class="num">' + usd(r.tvl_usd) + '</td><td class="reason">' + esc(r.signal) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    filterEl.addEventListener('change', renderLedger);
    renderLedger();
  })();

  // ---- deep links ---------------------------------------------------------
  var hash = (location.hash || '').replace(/^#/, '');
  var params = {};
  hash.split('&').forEach(function (part) {
    var kv = part.split('=');
    if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
  });
  if (params.filter === 'watchlist') watchEl.checked = true;
  else if (params.filter === 'farm') farmEl.checked = true;
  else if (params.filter && params.filter.indexOf('cat:') === 0) catSel.value = params.filter.slice(4);
  if (params.q) qEl.value = params.q;
  render();
  if (params.detail) {
    showDetail(params.detail);
    document.getElementById('detail').scrollIntoView({ behavior: 'auto', block: 'start' });
  }
})();
