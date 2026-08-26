/* DOM 渲染：卡牌、战场、换牌、主页、浮层 */
(function (G) {
  'use strict';

  function $(id) { return document.getElementById(id); }
  G.$ = $;

  G.fast = false;

  G.sleep = function (ms) {
    var t = G.fast ? Math.max(80, ms / 3) : ms;
    if (G.reducedMotion()) t = Math.min(t, 150);
    return new Promise(function (res) { setTimeout(res, t); });
  };

  G.toast = function (msg) {
    var wrap = $('toast-wrap');
    if (!wrap) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, 2600);
  };

  G.xTalk = function (text) {
    var el = $('xTalk');
    if (el) {
      el.textContent = text;
      el.classList.remove('bubble');
      void el.offsetWidth;
      el.classList.add('bubble');
    }
    var h = $('heroTalk');
    if (h && h.textContent !== text) {
      h.textContent = text;
      h.classList.remove('bubble');
      void h.offsetWidth;
      h.classList.add('bubble');
    }
  };

  var LAYERS = ['home', 'camp', 'mulligan', 'match', 'result'];
  G.currentLayer = 'home';

  G.showLayer = function (name) {
    G.currentLayer = name;
    var i, el;
    for (i = 0; i < LAYERS.length; i++) {
      el = $('layer-' + LAYERS[i]);
      if (el) el.classList.toggle('active', LAYERS[i] === name);
    }
    if (name !== 'match') G.xTalk(G.LAYER_TALK[name] || G.X_LINES.home);
  };

  G.cardHtml = function (c, opts) {
    opts = opts || {};
    var cls = 'card camp-' + c.camp;
    if (c.legendary) cls += ' legendary';
    if (opts.selected) cls += ' selected';
    if (opts.playable) cls += ' playable';
    if (opts.marked) cls += ' marked';
    var data = opts.data || ('data-id="' + c.id + '"');
    return '<div class="' + cls + '" ' + data + '>' +
      '<div class="c-cost">◆' + c.cost + '</div>' +
      '<div class="c-num">' + c.num + '</div>' +
      '<div class="c-stats"><span class="atk">' + c.atk + '</span> / <span class="hp">' + c.hp + '</span></div>' +
      '<div class="c-kw">' + G.kwText(c) + '</div>' +
      '<div class="c-band">' + c.camp + '营</div>' +
      '</div>';
  };

  G.minionHtml = function (m, opts) {
    opts = opts || {};
    if (!m) return '<div class="slot' + (opts.drop ? ' drop' : '') + '" data-slot="' + opts.slot + '"></div>';
    var cls = 'minion camp-' + m.camp;
    if (m.legendary) cls += ' legendary';
    if (m.taunt) cls += ' taunt';
    if (opts.canAttack) cls += ' can-attack';
    if (opts.validTarget) cls += ' valid-target';
    return '<div class="' + cls + '" data-id="' + m.id + '" data-slot="' + opts.slot + '">' +
      '<div class="m-num">' + m.num + '</div>' +
      '<div class="m-stats"><span class="m-atk">' + m.atk + '</span> / <span class="m-hp">' + m.hp + '</span></div>' +
      '<div class="m-kw">' + (m.taunt ? '🛡' : '') + (m.charge && m.canAttack ? '⚔' : '') + (m.legendary ? '✦' : '') + '</div>' +
      '</div>';
  };

  G.renderHome = function () {
    var S = G.S;
    var r = G.rankOf(S.points);
    $('rankChip').innerHTML = '<span>' + r.icon + '</span><span>' + r.name + '</span>';
    var stats = [
      { cls: 'gold', k: '声望', v: S.points },
      { cls: 'pink', k: '当前段位', v: r.icon + ' ' + r.name },
      { cls: 'orange', k: '连胜', v: '🔥' + S.streak },
      { cls: 'cyan', k: '总胜场', v: S.wins + '胜/' + S.losses + '负' }
    ];
    $('homeStats').innerHTML = stats.map(function (s) {
      return '<div class="stat ' + s.cls + '"><div class="v">' + s.v + '</div><div class="k">' + s.k + '</div></div>';
    }).join('');

    var dots = '', i, r2;
    for (i = 7; i >= 0; i--) {
      r2 = S.recent[S.recent.length - 1 - i];
      dots += r2
        ? '<div class="recent-dot ' + r2 + '">' + (r2 === 'w' ? '胜' : '负') + '</div>'
        : '<div class="recent-dot empty">·</div>';
    }
    $('recentRow').innerHTML = '<span class="r-label">最近战报</span>' + dots;

    var rule = G.todayRule();
    var dailyBtn = $('btnDaily');
    if (S.dailyDate === G.dayKey() && S.dailyDone) {
      dailyBtn.textContent = '📅 每日挑战 ✓ 已完成';
      dailyBtn.disabled = true;
    } else {
      dailyBtn.textContent = '📅 每日挑战 · ' + rule.name;
      dailyBtn.disabled = false;
    }

    var nums = ['1', '2', '10', '12', '21', '102', '201', '222'];
    var html = '';
    function one(n) {
      var c = G.makeCard(n, n === '201' ? '201' : '102');
      return G.cardHtml(c, { data: '' });
    }
    for (i = 0; i < nums.length; i++) html += one(nums[i]);
    for (i = 0; i < nums.length; i++) html += one(nums[i]);
    $('homeMarquee').innerHTML = html;
  };

  G.renderMulligan = function () {
    var M = G.M;
    var p = M.players[M.mullWho];
    var i, html = '', c;
    $('mullTitle').textContent = p.camp + '营 · 起手换牌';
    $('mullLead').textContent = M.hotseat
      ? (p.camp + '营保密换牌，不要让对方看见。')
      : G.X_LINES.mulligan;
    var n = Math.min(3, p.hand.length);
    var marked = 0;
    for (i = 0; i < n; i++) {
      c = p.hand[i];
      if (M.mullReplace[i]) marked++;
      html += G.cardHtml(c, { marked: M.mullReplace[i], data: 'data-mull="' + i + '"' });
    }
    $('mullCards').innerHTML = html;
    $('mullCount').textContent = '已选换掉：' + marked + ' 张';
  };

  function viewSides() {
    var M = G.M;
    var bottom = M.hotseat ? M.turn : 0;
    var top = 1 - bottom;
    return { bottom: bottom, top: top };
  }

  G.renderMatch = function () {
    var M = G.M;
    if (!M) return;
    var sides = viewSides();
    var my = M.players[sides.bottom];
    var en = M.players[sides.top];
    var myTurn = M.turn === sides.bottom && M.phase === 'play' && M.winner === null;
    var i, html;

    $('oppHeroNum').textContent = en.camp;
    $('oppHp').textContent = Math.max(0, en.hp);
    $('oppName').textContent = en.camp + '营' + (en.isAI ? ' · X' : '');
    $('oppDeck').innerHTML = '牌库<br>' + en.deck.length;
    $('myHeroNum').textContent = my.camp;
    $('myHp').textContent = Math.max(0, my.hp);
    $('myDeck').innerHTML = '牌库<br>' + my.deck.length;

    var oppH = $('oppHero');
    oppH.className = 'hero-port opp camp-' + en.camp;
    if (M.uiMode === 'attack' && myTurn && !G.hasTaunt(en)) oppH.classList.add('valid-target');

    html = '';
    for (i = 0; i < en.hand.length; i++) html += '<div class="card-back"></div>';
    $('oppHands').innerHTML = html;

    html = '';
    for (i = 0; i < 4; i++) {
      var om = en.board[i];
      var vt = false;
      if (M.uiMode === 'attack' && myTurn && om) {
        if (!G.hasTaunt(en) || om.taunt) vt = true;
      }
      html += G.minionHtml(om, { slot: i, validTarget: vt });
    }
    $('oppBoard').innerHTML = html;

    html = '';
    for (i = 0; i < 4; i++) {
      var mm = my.board[i];
      html += G.minionHtml(mm, {
        slot: i,
        canAttack: !!(mm && mm.canAttack && myTurn && M.uiMode !== 'discard'),
        drop: myTurn && M.selHand >= 0 && !mm
      });
    }
    $('myBoard').innerHTML = html;

    var gems = '';
    for (i = 0; i < 6; i++) {
      gems += '<div class="mana-gem' + (i < my.mana ? ' on' : '') + '"></div>';
    }
    $('manaGems').innerHTML = gems;
    $('manaLabel').textContent = my.mana + '/' + my.manaMax;

    var sk = G.SKILLS[my.camp];
    var btnSk = $('btnSkill');
    btnSk.textContent = '✦ ' + sk.name;
    var canSk = myTurn && G.canHeroPower(sides.bottom);
    btnSk.disabled = !canSk;
    btnSk.classList.toggle('ready', canSk);
    if (M.uiMode === 'discard') btnSk.textContent = '弃哪张？';

    html = '';
    if (!M.hotseat || myTurn || M.phase !== 'play') {
      for (i = 0; i < my.hand.length; i++) {
        var c = my.hand[i];
        var cost = G.getPlayCost(my, c);
        html += G.cardHtml(c, {
          selected: M.selHand === i,
          playable: myTurn && cost <= my.mana && G.emptySlot(my) !== -1,
          data: 'data-hand="' + i + '"'
        });
      }
    } else {
      for (i = 0; i < my.hand.length; i++) html += '<div class="card-back" style="width:48px;height:68px"></div>';
    }
    $('myHand').innerHTML = html || '<span style="color:var(--ink-dim);font-size:12px">手牌空</span>';

    var btnUp = $('btnUpgrade');
    var canUp = myTurn && M.selHand >= 0 && my.upgradesThisTurn < 2 &&
      G.canUpgradeNum(my.hand[M.selHand] ? my.hand[M.selHand].num : '222') &&
      my.mana >= G.upgradeCost(my);
    btnUp.disabled = !canUp;

    $('btnEnd').disabled = !myTurn;
    $('btnFast').textContent = G.fast ? '⏩ 快进中' : '⏩ 快进';

    var myPort = $('myHero');
    myPort.className = 'hero-port my camp-' + my.camp;
  };

  G.showBanner = function (text, cls) {
    var el = $('roundBanner');
    el.className = 'round-banner ' + (cls || '') + ' show';
    el.textContent = text;
    return G.sleep(G.reducedMotion() ? 150 : 1100).then(function () {
      el.className = 'round-banner';
    });
  };

  G.showCoin = function (text) {
    var ov = $('coinOverlay');
    $('coinText').textContent = text || '';
    ov.classList.add('show');
    G.SFX.coin();
    return G.sleep(G.reducedMotion() ? 200 : 1000).then(function () {
      ov.classList.remove('show');
    });
  };

  G.showUpgradeOverlay = function (card) {
    var ov = $('upgradeOverlay');
    $('upgradeTitle').textContent = '为「' + card.num + '」末位追加数字';
    var html = '', d, neu, preview;
    for (d = 0; d <= 2; d++) {
      neu = G.makeCard(G.upgradeNum(card.num, d), card.camp);
      preview = G.cardHtml(neu, { data: 'data-digit="' + d + '"' });
      html += '<div class="up-opt" data-digit="' + d + '">' + preview + '</div>';
    }
    $('upgradeOpts').innerHTML = html;
    ov.hidden = false;
  };

  G.hideUpgradeOverlay = function () {
    $('upgradeOverlay').hidden = true;
  };

  G.showPass = function (on, title, desc, btn) {
    var ov = $('passOverlay');
    ov.hidden = !on;
    if (on) {
      $('passTitle').textContent = title || '把设备交给对方';
      $('passDesc').textContent = desc || '请确认对方看不到手牌。';
      $('btnPassOk').textContent = btn || '开始行动';
    }
  };

  G.renderAch = function () {
    $('achGrid').innerHTML = G.ACHS.map(function (a) {
      var got = !!G.S.ach[a.id];
      return '<div class="ach-item ' + (got ? '' : 'locked') + '">' +
        '<div class="ai">' + a.icon + '</div>' +
        '<div class="an">' + a.name + '</div>' +
        '<div class="ad">' + a.desc + '</div>' +
        (got ? '<div class="ad" style="color:#4ade80">✓ 已解锁</div>' : '') +
        '</div>';
    }).join('');
  };

  G.renderDaily = function () {
    var rule = G.todayRule();
    var doneToday = G.S.dailyDate === G.dayKey() && G.S.dailyDone;
    $('dailyBody').innerHTML =
      '<p>每天 X 都会定一条<b>特殊规则</b>。今日规则：</p>' +
      '<div class="daily-rule"><div class="dr-icon">' + rule.icon + '</div>' +
      '<div class="dr-name">' + rule.name + '</div><div class="dr-desc">' + rule.desc + '</div></div>' +
      '<p style="color:var(--ink-dim);font-size:13px">完成挑战（胜利）可得 <b style="color:var(--c-gold)">+20声望</b>，每日首胜再 <b style="color:var(--c-gold)">+10</b>。</p>' +
      (doneToday ? '<div class="daily-done">✓ 今日挑战已完成，明天再来！</div>' : '');
    $('btnDailyStart').style.display = doneToday ? 'none' : 'block';
  };

  G.playEvents = function (events) {
    events = events || [];
    var i = 0;
    function next() {
      if (i >= events.length) return Promise.resolve();
      var e = events[i++];
      if (!e || !e.type) return next();
      if (e.type === 'legendary') {
        G.SFX.legendary();
        G.burst(210, 360, 70);
        G.xTalk(G.pick(G.X_LINES.legendary));
        return G.showBanner('✦ 图腾 ' + e.card.num + ' 降临！', 'gold').then(next);
      }
      if (e.type === 'coin') {
        G.xTalk(G.pick(G.X_LINES.coin));
        return G.showCoin(e.attackerWins ? '正面！进攻方存活' : '反面！防守方存活').then(next);
      }
      if (e.type === 'face' || e.type === 'trade') {
        G.SFX.attack();
        G.attackTrail(210, 520, 210, 180, '#fbbf24');
        return G.sleep(280).then(next);
      }
      if (e.type === 'play') {
        G.SFX.play();
        return G.sleep(220).then(next);
      }
      if (e.type === 'upgrade') {
        G.SFX.upgrade();
        G.xTalk(G.pick(G.X_LINES.upgrade));
        return G.sleep(280).then(next);
      }
      if (e.type === 'skill') {
        G.SFX.skill();
        G.xTalk(e.camp === '102' ? G.X_LINES.skill102 : G.X_LINES.skill201);
        return G.sleep(240).then(next);
      }
      if (e.type === 'fatigue') {
        G.xTalk(G.X_LINES.fatigue);
        return G.sleep(200).then(next);
      }
      if (e.type === 'draw') {
        G.SFX.draw();
        return G.sleep(120).then(next);
      }
      if (e.type === 'death') {
        return G.sleep(160).then(next);
      }
      return next();
    }
    G.renderMatch();
    return next().then(function () { G.renderMatch(); });
  };
})(window.G102 = window.G102 || {});
