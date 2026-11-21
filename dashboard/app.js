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
    document.getElementById('rows').innerHTML = '<tr><td colspan="8">No radar data loaded.</td></tr>';
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

  // ---- methodology: peer multiples (only categories the board actually ranks) --
  var boardCats = {};
  D.rows.forEach(function (r) { if (r.category) boardCats[r.category] = 1; });
  var shownPeers = D.peers.filter(function (p) { return boardCats[p.category]; }).slice(0, 10);
  var peersHtml = shownPeers.map(function (p) {
    return '<span class="peer">' + esc(p.category) + ' <b>&times;' + p.multiple.toFixed(2) + '</b> · n=' + p.n + '</span>';
  }).join('');
  document.getElementById('peers').innerHTML =
    '<p>Peer multiples by category (median market-cap-to-TVL of the tokens already trading there):</p>' +
    '<p>' + peersHtml + '</p>' +
    '<p class="note">Categories with fewer than 3 trading peers fall back to the global median &times;' +
    D.global_multiple.toFixed(2) + '. Multiples are clamped to &times;0.02–&times;1.50.</p>';

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
        '<td class="name"><b>' + esc(r.name) + '</b><span>' + esc(r.slug) + '</span>' +
        (r.on_watchlist ? '<span class="watch">WATCHLIST</span>' : '') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + r.chains.length + '</td>' +
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
    var formula = usd(r.tvl_usd) + ' TVL &times; ' + r.peer_multiple.toFixed(2) + ' peer &times; ' +
      r.growth_multiplier.toFixed(2) + ' momentum &times; ' + r.maturity_multiplier.toFixed(2) +
      ' maturity &times; ' + r.chain_multiplier.toFixed(2) + ' chains = ' + usd(r.implied_value_usd);
    box.innerHTML =
      '<h2>#' + r.rank + ' · ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' + esc(r.chains.join(', ')) +
      ' · listed ' + esc(r.listed_at || 'unknown') + ' (' + age(r.age_days) + ')' +
      (r.on_watchlist ? ' · on the watchlist' : '') + '</p>' +
      '<div class="model-grid">' +
      '<div class="cell"><span>Implied value</span><b>' + usd(r.implied_value_usd) + '</b><small>' + esc(formula) + '</small></div>' +
      '<div class="cell"><span>Peer multiple</span><b>&times;' + r.peer_multiple.toFixed(2) + '</b><small>' + esc(r.category || 'no category') + ' peers</small></div>' +
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
      }).join('') + '</ol>';
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
