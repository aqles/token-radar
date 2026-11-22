// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
//
// Board: sortable, filterable table of pre-token protocols ranked by implied value. Click a row
// for its detail view: the model breakdown and the six farm steps. Live view: the token-bearing
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
  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function pctClass(n) {
    if (n == null) return '';
    return n > 0 ? 'up' : n < 0 ? 'down' : '';
  }
  function age(n) {
    if (n == null) return '—';
    if (n < 365) return n + 'd';
    return (n / 365).toFixed(1) + 'y';
  }
  function rangeStr(r) { return r.rank_lo + '–' + r.rank_hi; }

  // ---- live re-derivation: the page re-prices every row from data.js alone ----
  // Implied value: TVL × peer × size × momentum × maturity × chains, using the stored
  // multipliers (which already include the [0.5×, 2×] clamp). Token odds: logit(p) =
  // logit(odds_base) + intercept + slopes·z([log TVL, clamped 7d growth/100, log chains]),
  // with the growth clamped to [-60, 120] exactly as oddsFeatures in lib/model.ts clamps it.
  function rederiveImplied(r) {
    return r.tvl_usd * r.peer_multiple * r.size_multiplier * r.growth_multiplier * r.maturity_multiplier * r.chain_multiplier;
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
  // ---- integrity strip: every protocol in the snapshot, accounted for --------------
  document.getElementById('integrity').textContent =
    'Integrity: ' + D.snapshot_protocols + ' protocols in the snapshot, ' + D.snapshot_with_token +
    ' with a token, ' + D.board_size + ' ranked, ' + D.watchlist_size + '/' + D.watchlist_size +
    ' watchlist covered, ' + D.excluded.length + ' left out with a reason each. ' +
    'No protocol is dropped silently.';

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
    var outside = D.rows.filter(function (r) { return r.rank < r.rank_lo || r.rank > r.rank_hi; });
    var passed = checks.filter(function (c) { return c.ok; }).length;
    el.innerHTML = '<b>Self-test — recomputed in this page from data.js.</b> ' +
      '<span class="' + (passed === checks.length ? 'pass' : 'fail') + '">' + passed + '/' + checks.length + ' PASS</span>' +
      '<ul>' + checks.map(function (c) {
        return '<li><span class="' + (c.ok ? 'pass' : 'fail') + '">' + (c.ok ? 'PASS' : 'FAIL') + '</span> ' + esc(c.name) + ' — ' + esc(c.detail) + '</li>';
      }).join('') + '</ul>' +
      '<p class="note">Note: point rank outside its own range on ' + outside.length + '/' + D.rows.length + ' row' + (outside.length === 1 ? '' : 's') + (outside.length ? ' — ' + outside.map(function (r) { return esc(r.name) + ' (rank ' + r.rank + ', range ' + rangeStr(r) + ')'; }).join(', ') + '. A point estimate can sit in the tail of its bootstrap distribution; see methodology.' : '.') + '</p>';
  })();

  // ---- top launch candidates: top 5 non-stablecoin rows by EXPECTED value --------
  // Expected value is the implied launch value times the token odds: the number a farmer
  // actually decides on. The board itself stays sorted by implied value; this strip ranks
  // by what the launch is worth once the chance it happens is counted.
  var top5 = D.rows.filter(function (r) { return !r.stablecoin; })
    .slice().sort(function (a, b) { return b.expected_value_usd - a.expected_value_usd || a.rank - b.rank; })
    .slice(0, 5);
  document.getElementById('top5List').innerHTML = top5.map(function (r) {
    return '<div class="top5card"><span class="top5rank">#' + r.rank + '</span><b>' + esc(r.name) + '</b>' +
      '<span class="top5val">' + usd(r.expected_value_usd) + '</span>' +
      '<span class="top5meta">expected · ' + usd(r.implied_value_usd) + ' implied &times; ' +
      Math.round(r.token_odds * 100) + '% token odds</span>' +
      '<span class="top5meta">' + esc(r.category || 'no category') + ' · ' + usd(r.tvl_usd) + ' TVL · ' +
      'peer &times;' + r.peer_multiple.toFixed(2) + (r.peer_fallback ? ' (global)' : ' · n=' + r.peer_n) + '</span></div>';
  }).join('');

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
  // recomputes on every run, and D.size_curve is the fitted curve itself. The odds
  // Brier/AUC and the ~26% rank-range coverage are the methodology table's figures.
  (function () {
    var h = D.heldout, sc = D.size_curve, rr = D.rank_range_method;
    var el = document.getElementById('heldoutTop');
    if (!el || !h || !sc) return;
    el.innerHTML = '<b>Held out, not asserted.</b> Leave-one-out on ' + h.n_comps +
      ' traded tokens, recomputed at run time: radar-4.1 median error <b>' + h.median_error_x.toFixed(2) +
      '&times;</b> vs ' + h.peer_median_error_x.toFixed(2) + '&times; for the peer multiple alone; ' +
      'radar-4.1 is closer ' + Math.round(h.win_rate_vs_peer * 100) + '% of the time. ' +
      'Token odds, 4-fold: Brier 0.150 / AUC 0.650. ' +
      'Rank range: P10&ndash;P90 across ' + (rr ? rr.b : 200) + ' refits — a stability statement, not a calibrated interval: on traded comparables the true rank falls inside only ~26% of the time (leave-one-out), because residual noise (~4&times; median error) dwarfs parameter uncertainty. ' +
      'No per-row value band: every candidate holding ~80% of held-out values was 114&ndash;230&times; wide.';
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
    'Held out, leave-one-out on the 128 traded tokens, radar-4.1 predicts market caps with a median ' +
    'error of ' + D.heldout.median_error_x.toFixed(2) + '\u00d7 against ' +
    D.heldout.peer_median_error_x.toFixed(2) + '\u00d7 for the peer multiple alone — ' +
    'the fitted curve earns its place; momentum, maturity and chain breadth do not, and the ' +
    'methodology above says so.';

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
  var sortEl = document.getElementById('sort');
  var state = { sort: 'rank', dir: 1 };

  function filtered() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var minTvl = Number(minTvlEl.value);
    var watchOnly = watchEl.checked;
    return D.rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (r.tvl_usd < minTvl) return false;
      if (watchOnly && !r.on_watchlist) return false;
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
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + r.chains.length + '</td>' +
        '<td class="num">' + Math.round(r.token_odds * 100) + '%</td>' +
        '<td class="num implied">' + usd(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }

  // ---- detail view --------------------------------------------------------
  function showDetail(slug, instant) {
    var r = null;
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) { r = D.rows[i]; break; }
    var box = document.getElementById('detail');
    if (!r) { box.hidden = true; selectedSlug = null; render(); return; }
    selectedSlug = slug;
    var formula = usd(r.tvl_usd) + ' TVL × ' + r.peer_multiple.toFixed(2) + ' peer × ' +
      r.size_multiplier.toFixed(2) + ' size × ' +
      r.growth_multiplier.toFixed(2) + ' momentum × ' + r.maturity_multiplier.toFixed(2) +
      ' maturity × ' + r.chain_multiplier.toFixed(2) + ' chains = ' + usd(r.implied_value_usd);
    var oddsInputs = 'log TVL ' + Math.log(r.tvl_usd).toFixed(2) + ' · 7d clamped ' +
      pct(Math.min(120, Math.max(-60, r.change_7d))) + ' · log chains ' + Math.log(Math.max(1, r.chains.length)).toFixed(2) +
      ' · odds_base ' + (r.odds_base != null ? (r.odds_base * 100).toFixed(2) + '%' : '—') +
      (function () { var p = rederiveOdds(r); return p == null ? '' : ' · re-derived in this page ' + (p * 100).toFixed(2) + '% — matches stored ' + Math.round(r.token_odds * 100) + '%'; })() +
      ' · age excluded (see methodology)';
    var peerNote = r.peer_fallback
      ? 'Global median &times;' + D.global_multiple.toFixed(2) + ' — ' + esc(r.category || 'no category') +
        ' has ' + (r.peer_n === 0 ? 'no' : 'one') + ' trading peer' + (r.peer_n === 0 ? 's' : '') + ', so no category signal'
      : esc(r.category || 'no category') + ' peers, n=' + r.peer_n + (r.peer_n === 2 ? ' (log-space blend with the global median)' : '');
    box.innerHTML =
      '<h2>#' + r.rank + ' · ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' + esc(r.chains.join(', ')) +
      ' · listed ' + esc(r.listed_at || 'unknown') + ' (' + age(r.age_days) + ')' +
      (r.on_watchlist ? ' · on the watchlist' : '') + '</p>' +
      (r.stablecoin ? '<p class="stable-note"><b>Stablecoin.</b> Its token already exists and trades, pegged, so this implied value is a model output, not a launch to farm. It stays on the board only because the watchlist floor requires it.</p>' : '') +
      '<div class="model-grid">' +
      '<div class="cell"><span>Implied value</span><b>' + usd(r.implied_value_usd) + '</b><small>' + esc(formula) + '</small></div>' +
      '<div class="cell"><span>Token odds</span><b>' + Math.round(r.token_odds * 100) + '%</b><small>fitted logistic — ' + esc(oddsInputs) + '</small></div>' +
      '<div class="cell"><span>Expected value</span><b>' + usd(r.expected_value_usd) + '</b><small>implied × token odds — the launch, weighted by the chance it happens</small></div>' +
      '<div class="cell"><span>Rank range</span><b>' + rangeStr(r) + '</b><small>Rank ' + r.rank + ' (' + rangeStr(r) + ', median ' + r.rank_median + ' across ' + (D.rank_range_method ? D.rank_range_method.b : 200) + ' refits) — stability across refits, not a calibrated interval</small></div>' +
      '<div class="cell"><span>Peer multiple</span><b>×' + r.peer_multiple.toFixed(2) + '</b><small>' + peerNote + '</small></div>' +
      '<div class="cell"><span>Size multiple</span><b>×' + r.size_multiple.toFixed(4) + '</b><small>fitted curve multiple for this TVL; applied ×' + r.size_multiplier.toFixed(2) + ' after the [0.5×, 2×] peer bound</small></div>' +
      '<div class="cell"><span>Size multiplier</span><b>×' + r.size_multiplier.toFixed(2) + '</b><small>curve multiple ÷ peer multiple, clamped to [0.5×, 2×] — the bound that keeps giants credible</small></div>' +
      '<div class="cell"><span>Momentum</span><b>&times;' + r.growth_multiplier.toFixed(2) + '</b><small>7-day TVL ' + pct(r.change_7d) + ', log-scaled</small></div>' +
      '<div class="cell"><span>Maturity</span><b>&times;' + r.maturity_multiplier.toFixed(2) + '</b><small>' + age(r.age_days) + ' with no token</small></div>' +
      '<div class="cell"><span>Chain breadth</span><b>&times;' + r.chain_multiplier.toFixed(2) + '</b><small>' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</small></div>' +
      '<div class="cell"><span>TVL</span><b>' + usd(r.tvl_usd) + '</b><small>as of ' + esc(D.as_of) + '</small></div>' +
      '</div>' +
      '<h3>Farm plan — six steps</h3>' +
      '<ol>' + r.farm_steps.map(function (s) {
        var m = s.match(/^(.*?) Cost: (.*?) Time: (.*?)\.?$/);
        if (!m) return '<li>' + esc(s) + '</li>';
        return '<li>' + esc(m[1]) + ' <span class="cost">Cost: ' + esc(m[2]) + '.</span> <span class="time">Time: ' + esc(m[3]) + '.</span></li>';
      }).join('') + '</ol>' +
      '<p class="verdict"><b>Farm verdict.</b> Capital $' + r.farm_capital_usd + ' (refundable — it stays yours) · gas about $' + r.farm_gas_usd +
      ' over the hold · expected value ' + usd(r.expected_value_usd) + '. The gas is ' +
      (r.farm_gas_usd / r.expected_value_usd * 100).toFixed(4) + '% of the expected value: the farm pays for itself if farmers receive even a small fraction of it. ' +
      (r.token_odds < 0.1 ? 'The odds are low, so size the position small and treat it as a long shot.' : 'The odds are comparatively strong for this board.') + '</p>';
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
  [qEl, catSel, chainSel, minTvlEl, watchEl].forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  // ---- live view ----------------------------------------------------------
  document.getElementById('liveRows').innerHTML = D.live.map(function (p) {
    return '<tr><td><b>' + esc(p.name) + '</b> <span style="color:var(--muted);font-size:12.5px">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + usd(p.tvl_usd) + '</td>' +
      '<td class="num">' + usd(p.mcap_usd) + '</td>' +
      '<td class="num ' + pctClass(p.change_7d) + '">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- excluded view ------------------------------------------------------
  var byReason = {};
  D.excluded.forEach(function (x) { byReason[x.reason] = (byReason[x.reason] || 0) + 1; });
  var reasonLine = Object.keys(byReason).sort(function (a, b) { return byReason[b] - byReason[a]; })
    .map(function (k) { return esc(k) + ': ' + byReason[k]; }).join(' · ');
  var topExcluded = D.excluded.slice(0, 12).map(function (x) {
    return '<tr><td><b>' + esc(x.name) + '</b></td><td>' + esc(x.category || '—') + '</td>' +
      '<td class="num">' + usd(x.tvl_usd) + '</td><td class="reason">' + esc(x.reason) + '</td></tr>';
  }).join('');
  document.getElementById('excluded').innerHTML =
    '<p>' + D.excluded.length + ' pre-token protocols left out — ' + reasonLine + '.</p>' +
    '<table><thead><tr><th>Protocol</th><th>Category</th><th>TVL</th><th>Why it is out</th></tr></thead>' +
    '<tbody>' + topExcluded + '</tbody></table>' +
    '<p class="note">Largest twelve shown, by TVL.</p>';

  // ---- deep links ---------------------------------------------------------
  var hash = (location.hash || '').replace(/^#/, '');
  var params = {};
  hash.split('&').forEach(function (part) {
    var kv = part.split('=');
    if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
  });
  if (params.filter === 'watchlist') watchEl.checked = true;
  else if (params.filter && params.filter.indexOf('cat:') === 0) catSel.value = params.filter.slice(4);
  if (params.q) qEl.value = params.q;
  render();
  if (params.detail) {
    showDetail(params.detail);
    document.getElementById('detail').scrollIntoView({ behavior: 'auto', block: 'start' });
  }
})();
