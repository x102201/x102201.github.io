/* 引导、图层路由、热座、每日、启动 */
(function () {
  'use strict';
  var G = window.G102;

  function $(id) { return G.$(id); }

  var pendingMode = 'normal';
  var lastFocus = null;

  function fitStage() {
    var vp = $('viewport');
    var w = vp ? vp.clientWidth : window.innerWidth;
    var h = vp ? vp.clientHeight : window.innerHeight;
    var s = Math.min(w / 420, h / 800);
    if (s > 0) s = Math.floor(s * 10000) / 10000;
    document.documentElement.style.setProperty('--S', String(s));
  }
  fitStage();
  window.addEventListener('resize', fitStage);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);

  function allowPageScroll(target) {
    return !!(target && target.closest && (target.closest('.modal') || target.closest('.upgrade-box')));
  }
  document.addEventListener('wheel', function (e) {
    if (!allowPageScroll(e.target)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    if (!allowPageScroll(e.target)) e.preventDefault();
  }, { passive: false });

  /* 背景星空 */
  (function initBg() {
    var bgCv = $('bg');
    if (!bgCv) return;
    var bgCtx = bgCv.getContext('2d');
    var stars = [], drifts = [], w, h, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      bgCv.width = w * dpr; bgCv.height = h * dpr;
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 640 ? 50 : 110;
      stars = []; drifts = [];
      var i;
      for (i = 0; i < n; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: 0.5 + Math.random() * 1.6, tw: 0.4 + Math.random() * 1.6, ph: Math.random() * 6.28 });
      }
      for (i = 0; i < 10; i++) {
        drifts.push({ x: Math.random() * w, y: Math.random() * h, s: 14 + Math.random() * 30, vy: 0.15 + Math.random() * 0.4, ch: G.pick(['0', '1', '2']) });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    (function draw(now) {
      bgCtx.clearRect(0, 0, w, h);
      var i, st, dr;
      if (!G.reducedMotion()) {
        for (i = 0; i < stars.length; i++) {
          st = stars[i];
          bgCtx.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.001 * st.tw + st.ph));
          bgCtx.fillStyle = '#cfe4ff';
          bgCtx.beginPath(); bgCtx.arc(st.x, st.y, st.r, 0, 6.28); bgCtx.fill();
        }
        bgCtx.globalAlpha = 0.14;
        bgCtx.font = '700 20px "Space Mono", monospace';
        for (i = 0; i < drifts.length; i++) {
          dr = drifts[i];
          dr.y -= dr.vy;
          if (dr.y < -40) { dr.y = h + 40; dr.x = Math.random() * w; }
          bgCtx.fillText(dr.ch, dr.x, dr.y);
        }
      } else {
        for (i = 0; i < stars.length; i++) {
          st = stars[i];
          bgCtx.globalAlpha = 0.45;
          bgCtx.fillStyle = '#cfe4ff';
          bgCtx.beginPath(); bgCtx.arc(st.x, st.y, st.r, 0, 6.28); bgCtx.fill();
        }
      }
      bgCtx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })(0);
  })();

  function openModal(id) {
    if (id === 'modalAch') G.renderAch();
    if (id === 'modalDaily') G.renderDaily();
    lastFocus = document.activeElement;
    $(id).classList.add('show');
    var first = $(id).querySelector('button, [href], input');
    if (first) first.focus();
  }
  function closeModal(id) {
    $(id).classList.remove('show');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function goHome() {
    pendingMode = 'normal';
    G.showPass(false);
    G.hideUpgradeOverlay();
    G.showLayer('home');
    G.renderHome();
  }

  function openCamp() {
    G.showLayer('camp');
  }

  function startFromCamp(camp) {
    G.S.camp = camp;
    G.save();
    beginMulligan(pendingMode === 'daily' ? 'daily' : (pendingMode === 'hotseat' ? 'hotseat' : 'normal'));
  }

  function beginMulligan(mode) {
    var camp = G.S.camp || '102';
    G.createMatch({ mode: mode, camp: camp });
    var M = G.M;
    var rb = $('resultBtns');
    if (rb) rb.classList.toggle('hotseat', !!M.hotseat);

    if (M.hotseat) {
      G.showLayer('match');
      G.renderMatch();
      G.showPass(true, '硬币决定先手', '102营 vs 201营。正面 102 先手，反面 201 先手。', '掷硬币');
      M._awaitCoin = true;
      return;
    }

    M.mullWho = 0;
    M.mullReplace = [false, false, false];
    G.showLayer('mulligan');
    G.renderMulligan();
    G.xTalk(G.X_LINES.mulligan);
  }

  function afterHotseatCoin() {
    var M = G.M;
    M._awaitCoin = false;
    G.showPass(false);
    var firstCamp = M.players[M.first].camp;
    return G.showCoin(firstCamp + '营先手！').then(function () {
      M.mullWho = M.first;
      M.mullReplace = [false, false, false];
      G.showLayer('mulligan');
      G.renderMulligan();
    });
  }

  function finishMulligan() {
    var M = G.M;
    G.applyMulligan(M.mullWho, M.mullReplace);
    if (M.hotseat && !M.mullDone[1 - M.mullWho]) {
      var next = 1 - M.mullWho;
      var camp = M.players[next].camp;
      G.showPass(true, '把设备交给 ' + camp + '营', camp + '营请换牌。确认对方看不到手牌。', '我是' + camp + '营');
      M._passToMull = next;
      return;
    }
    enterMatch();
  }

  function enterMatch() {
    var events = G.beginMatch();
    G.showPass(false);
    G.showLayer('match');
    G.xTalk(G.M.hotseat ? G.pick(G.X_LINES.hotseat) : G.pick(G.X_LINES.open));
    G.playEvents(events).then(function () {
      if (G.M.winner !== null) return finishMatch();
      maybeAiTurn(false);
    });
  }

  function currentHuman() {
    var M = G.M;
    if (!M) return false;
    var p = M.players[M.turn];
    return p.isHuman && !p.isAI;
  }

  function maybeAiTurn(fromSwitch) {
    var M = G.M;
    if (!M || M.winner !== null) {
      if (M && M.winner !== null) finishMatch();
      return;
    }
    if (M.hotseat) {
      if (fromSwitch) {
        var board = $('matchBoard');
        if (board) board.classList.add('flipped');
        var p = M.players[M.turn];
        G.showPass(true, '把设备交给 ' + p.camp + '营', '轮到 ' + p.camp + '营。请把设备转交对方（界面已翻转）。', '我是' + p.camp + '营，开始');
        M._passToTurn = true;
      }
      G.renderMatch();
      return;
    }
    if (M.players[M.turn].isAI) runAi();
    else G.renderMatch();
  }

  function runAi() {
    var M = G.M;
    if (!M || M.busy) return;
    M.busy = true;
    G.xTalk(G.pick(G.X_LINES.play));
    G.renderMatch();

    var steps = 0;
    function step() {
      if (!G.M || G.M.winner !== null) {
        M.busy = false;
        finishMatch();
        return;
      }
      if (!G.M.players[G.M.turn].isAI) {
        M.busy = false;
        G.renderMatch();
        return;
      }
      steps++;
      var act = steps > 16 ? { type: 'end' } : G.aiDecide();
      if (!act || act.type === 'end') {
        var res = G.endTurn(G.M.turn);
        G.xTalk(G.X_LINES.end);
        G.playEvents((res && res.events) || []).then(function () {
          M.busy = false;
          if (G.M.winner !== null) finishMatch();
          else {
            G.xTalk('你的回合。出牌、升级、攻击，或结束回合。');
            G.renderMatch();
          }
        });
        return;
      }
      var r = applyAction(act);
      if (!r || !r.ok) {
        steps = 99;
        step();
        return;
      }
      G.playEvents(r.events || []).then(function () {
        if (G.M.winner !== null) {
          M.busy = false;
          finishMatch();
          return;
        }
        G.sleep(180).then(step);
      });
    }
    G.sleep(400).then(step);
  }

  function applyAction(act) {
    var t = G.M.turn;
    if (act.type === 'play') return G.playCard(t, act.handIndex, -1);
    if (act.type === 'upgrade') return G.upgradeCard(t, act.handIndex, act.digit);
    if (act.type === 'attack') return G.attack(t, act.minionIndex, act.target);
    if (act.type === 'skill') return G.heroPower(t, { handIndex: act.handIndex });
    return { ok: false, events: [] };
  }

  function playerAct(fn) {
    var M = G.M;
    if (!M || M.busy || M.winner !== null || M.phase !== 'play') return;
    if (!currentHuman()) return;
    var r = fn();
    if (!r || !r.ok) return;
    M.busy = true;
    G.playEvents(r.events || []).then(function () {
      M.busy = false;
      G.renderMatch();
      if (G.M.winner !== null) finishMatch();
    });
  }

  function finishMatch() {
    var M = G.M, S = G.S;
    if (!M || M._finished) return;
    M._finished = true;
    M.busy = false;
    G.hideUpgradeOverlay();
    G.showPass(false);

    var p0 = M.players[0], p1 = M.players[1];
    var won = M.winner === 0;
    var draw = M.winner === 'draw';
    var hs = M.hotseat;
    var box = $('resultBox');
    box.classList.remove('win', 'lose', 'draw');
    box.classList.add(draw ? 'draw' : (won || hs ? 'win' : 'lose'));

    if (hs) {
      $('resultBadge').textContent = draw ? '🤝' : '🏆';
      $('resultTitle').textContent = draw ? '平 局' : ((M.winner === 0 ? '102' : '201') + '营获胜！');
      box.classList.remove('lose');
      box.classList.add(draw ? 'draw' : 'win');
    } else {
      $('resultBadge').textContent = draw ? '🤝' : (won ? '🏆' : '💔');
      $('resultTitle').textContent = draw ? '平 局' : (won ? '胜 利 ！' : '惜 败 …');
    }
    $('resultScore').textContent = Math.max(0, p0.hp) + ' : ' + Math.max(0, p1.hp);

    var rb = $('resultBtns');
    if (rb) rb.classList.toggle('hotseat', hs);

    var pts = 0, breakdown = [], rankUp = false, newRank = G.rankOf(S.points);

    if (!hs) {
      var oldRank = G.rankOf(S.points);
      S.matches++;
      var isDaily = M.mode === 'daily';
      G.applyTendency();

      if (won) {
        S.wins++;
        S.streak++;
        S.bestStreak = Math.max(S.bestStreak, S.streak);
        S.campWins[p0.camp] = (S.campWins[p0.camp] || 0) + 1;
        if (isDaily) {
          pts = 20;
          breakdown.push('每日挑战胜利 +20');
          if (S.dailyDate !== G.dayKey() || !S.dailyDone) {
            S.dailyDoneCount++;
            S.dailyDone = true;
            S.dailyDate = G.dayKey();
            pts += 10;
            breakdown.push('每日首胜 +10');
          }
        } else {
          pts = 10;
          breakdown.push('胜利 +10');
          if (!M.stats.damaged) { pts += 5; breakdown.push('无损 +5'); }
          if (S.streak >= 3) { pts += 2; breakdown.push('连胜加成 +2'); }
          if (S.camp === S.lastCamp) { pts += 2; breakdown.push('忠诚加成 +2'); }
        }
        if (M.rule && M.rule.key === 'double') { pts *= 2; breakdown.push('双倍日 ×2'); }
        if (M.stats.synthesized102 && M.stats.synthesized201) S.flags.totem = true;
        if (G.boardCount(p0) === 4) S.flags.full = true;
        if (M.stats.burstDamage >= 10) S.flags.burst = true;
        if (!M.stats.damaged) S.flags.perfect = true;
        if (M.xLevel >= 3) S.flags.beatMaster = true;
        if (M.stats.lowHp) S.flags.comeback = true;
      } else {
        if (!draw) S.losses++;
        S.streak = 0;
        pts = 3;
        breakdown.push('参与 +3');
      }
      S.points += pts;
      S.lastCamp = S.camp;
      S.recent.push(won ? 'w' : 'l');
      if (S.recent.length > 8) S.recent.shift();
      newRank = G.rankOf(S.points);
      rankUp = newRank.min > oldRank.min;
      G.save();
    }

    if (hs) {
      $('ptsLine').textContent = '友谊赛 · 不计声望 · 不触发 X 学习';
      $('streakLine').textContent = '';
      $('rankLine').textContent = '';
      $('xVerdict').textContent = '⚖️ X：' + (draw ? G.pick(G.X_LINES.draw) : ((M.winner === 0 ? '102' : '201') + '营获胜！本地热座，下次换边？'));
    } else {
      $('ptsLine').textContent = '+' + pts + ' 声望：' + breakdown.join(' · ');
      $('streakLine').textContent = S.streak >= 2 ? '🔥 当前连胜 ' + S.streak + ' 场 · 最佳 ' + S.bestStreak + ' 场' : '';
      $('rankLine').textContent = rankUp ? '🎉 晋升！' + newRank.icon + ' ' + newRank.name + '！' : '';
      var verdict = draw ? G.pick(G.X_LINES.draw) : (won ? G.pick(G.X_LINES.win) : G.pick(G.X_LINES.lose));
      if (won && S.streak >= 2) verdict += ' 连胜 ' + S.streak + ' 场！';
      if (won && M.xLevel >= 3) verdict += ' （你打败了传奇裁判！）';
      $('xVerdict').textContent = '⚖️ X：' + verdict;
    }

    var kill = M.stats.lastKillCard
      ? ('关键一斩：' + M.stats.lastKillCard + '（' + M.stats.lastKillDmg + ' 点）')
      : '';
    $('formations').innerHTML =
      '<div class="f-box"><div class="fb-title">本局</div><div class="fb-tiers">升级 ' + M.stats.upgrades +
      ' 次 · 随从 ' + M.stats.minionsPlayed + ' 个</div></div>' +
      (kill ? '<div class="f-box"><div class="fb-title">高光</div><div class="fb-tiers">' + kill + '</div></div>' : '');

    if (!hs) checkAch();
    if (won || hs || draw) { G.SFX.win(); G.burst(210, 300, 80); } else { G.SFX.lose(); }
    G.showLayer('result');
    G.renderHome();
  }

  function checkAch() {
    var unlocked = 0;
    for (var i = 0; i < G.ACHS.length; i++) {
      var a = G.ACHS[i];
      if (!G.S.ach[a.id] && a.cond(G.S)) {
        G.S.ach[a.id] = true;
        unlocked++;
        setTimeout((function (name) {
          return function () { G.toast('🏅 成就解锁：' + name); G.SFX.ach(); G.burst(210, 240, 40); };
        })(a.name), unlocked * 700);
      }
    }
    if (unlocked) G.save();
  }

  /* 点击 */
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal-mask')) {
      if (e.target.id !== 'modalTutorial') {
        closeModal(e.target.id);
        G.SFX.click();
      }
      return;
    }
    var cl = e.target.closest('[data-close]');
    if (cl) { closeModal(cl.getAttribute('data-close')); G.SFX.click(); return; }

    var bk = e.target.closest('[data-back]');
    if (bk) {
      if (bk.getAttribute('data-back') === 'home') goHome();
      G.SFX.click();
      return;
    }

    var t = e.target.closest('button') || e.target;

    if (t.id === 'btnPlay') {
      G.SFX.click();
      pendingMode = 'normal';
      if (!G.S.camp) { openCamp(); return; }
      beginMulligan('normal');
    }
    if (t.id === 'btnDaily') { G.SFX.click(); openModal('modalDaily'); }
    if (t.id === 'btnDual') {
      G.SFX.click();
      pendingMode = 'hotseat';
      beginMulligan('hotseat');
    }
    if (t.id === 'btnAch' || t.id === 'btnRule2') {
      G.SFX.click();
      openModal(t.id === 'btnAch' ? 'modalAch' : 'modalRule');
    }
    if (t.id === 'btnTutOk') {
      G.SFX.click();
      G.S.seenTutorial = true;
      G.save();
      closeModal('modalTutorial');
    }

    var cc = t.closest ? t.closest('.camp-card') : null;
    if (cc) {
      G.SFX.click();
      startFromCamp(cc.getAttribute('data-camp'));
    }

    var mc = t.closest ? t.closest('[data-mull]') : null;
    if (mc && G.currentLayer === 'mulligan') {
      var mi = +mc.getAttribute('data-mull');
      G.M.mullReplace[mi] = !G.M.mullReplace[mi];
      G.SFX.click();
      G.renderMulligan();
      return;
    }
    if (t.id === 'btnMullGo') {
      G.SFX.click();
      finishMulligan();
    }
    if (t.id === 'btnMullBack') {
      G.SFX.click();
      goHome();
    }

    if (t.id === 'btnPassOk') {
      G.SFX.click();
      var M = G.M;
      if (M && M._awaitCoin) {
        afterHotseatCoin();
        return;
      }
      if (M && M._passToMull !== undefined && M._passToMull !== null) {
        M.mullWho = M._passToMull;
        M._passToMull = null;
        M.mullReplace = [false, false, false];
        G.showPass(false);
        G.showLayer('mulligan');
        G.renderMulligan();
        return;
      }
      if (M && M._passToTurn) {
        M._passToTurn = false;
        var board = $('matchBoard');
        if (board) board.classList.remove('flipped');
        G.showPass(false);
        G.renderMatch();
        return;
      }
      G.showPass(false);
    }
    if (t.id === 'btnPassCancel') {
      G.SFX.click();
      goHome();
    }

    if (t.id === 'btnUpgradeCancel') {
      G.SFX.click();
      G.hideUpgradeOverlay();
    }
    var ud = t.closest ? t.closest('[data-digit]') : null;
    if (ud && !$('upgradeOverlay').hidden) {
      var digit = ud.getAttribute('data-digit');
      G.hideUpgradeOverlay();
      playerAct(function () {
        return G.upgradeCard(G.M.turn, G.M.selHand, digit);
      });
      return;
    }

    if (G.currentLayer === 'match' && G.M && !G.M.busy && currentHuman()) {
      var handEl = t.closest ? t.closest('[data-hand]') : null;
      if (handEl) {
        var hi = +handEl.getAttribute('data-hand');
        if (G.M.uiMode === 'discard') {
          playerAct(function () { return G.heroPower(G.M.turn, { handIndex: hi }); });
          G.M.uiMode = '';
          return;
        }
        if (G.M.selHand === hi) {
          playerAct(function () { return G.playCard(G.M.turn, hi, -1); });
        } else {
          G.M.selHand = hi;
          G.M.selMinion = -1;
          G.M.uiMode = '';
          G.SFX.click();
          G.renderMatch();
        }
        return;
      }

      var myMin = t.closest ? t.closest('#myBoard .minion') : null;
      if (myMin) {
        var slot = +myMin.getAttribute('data-slot');
        var mm = G.M.players[G.M.turn].board[slot];
        if (mm && mm.canAttack) {
          G.M.selMinion = slot;
          G.M.uiMode = 'attack';
          G.M.selHand = -1;
          G.SFX.click();
          G.renderMatch();
        }
        return;
      }
      var mySlot = t.closest ? t.closest('#myBoard .slot') : null;
      if (mySlot && G.M.selHand >= 0) {
        var si = +mySlot.getAttribute('data-slot');
        playerAct(function () { return G.playCard(G.M.turn, G.M.selHand, si); });
        return;
      }
      var oppMin = t.closest ? t.closest('#oppBoard .minion') : null;
      if (oppMin && G.M.uiMode === 'attack') {
        playerAct(function () {
          return G.attack(G.M.turn, G.M.selMinion, { type: 'minion', index: +oppMin.getAttribute('data-slot') });
        });
        return;
      }
      if (t.closest && t.closest('#oppHero') && G.M.uiMode === 'attack') {
        playerAct(function () {
          return G.attack(G.M.turn, G.M.selMinion, { type: 'hero' });
        });
        return;
      }
    }

    if (t.id === 'btnUpgrade') {
      var M2 = G.M;
      if (M2 && M2.selHand >= 0) {
        var card = M2.players[M2.turn].hand[M2.selHand];
        if (card) {
          G.SFX.click();
          G.showUpgradeOverlay(card);
        }
      }
    }
    if (t.id === 'btnSkill') {
      var M3 = G.M;
      if (!M3 || !currentHuman()) return;
      G.SFX.click();
      var p = M3.players[M3.turn];
      if (p.camp === '102' && p.hand.length) {
        M3.uiMode = 'discard';
        M3.selHand = -1;
        G.toast('点选手牌弃掉');
        G.renderMatch();
        return;
      }
      playerAct(function () { return G.heroPower(M3.turn, {}); });
    }
    if (t.id === 'btnEnd') {
      if (!G.M || G.M.busy || !currentHuman()) return;
      G.SFX.click();
      G.M.busy = true;
      var er = G.endTurn(G.M.turn);
      G.xTalk(G.X_LINES.end);
      G.playEvents(er.events || []).then(function () {
        G.M.busy = false;
        if (G.M.winner !== null) finishMatch();
        else maybeAiTurn(true);
      });
    }
    if (t.id === 'btnFast') {
      G.fast = !G.fast;
      t.textContent = G.fast ? '⏩ 快进中' : '⏩ 快进';
      G.SFX.click();
    }

    if (t.id === 'btnAgain') {
      G.SFX.click();
      beginMulligan(G.M && G.M.mode === 'hotseat' ? 'hotseat' : (G.M && G.M.mode === 'daily' ? 'daily' : 'normal'));
    }
    if (t.id === 'btnShare') {
      G.SFX.click();
      G.shareResult();
    }
    if (t.id === 'btnSwitchCamp') {
      G.SFX.click();
      pendingMode = 'normal';
      openCamp();
    }
    if (t.id === 'btnHome') {
      G.SFX.click();
      goHome();
    }
    if (t.id === 'btnDailyStart') {
      G.SFX.click();
      closeModal('modalDaily');
      pendingMode = 'daily';
      if (!G.S.camp) { openCamp(); return; }
      beginMulligan('daily');
    }
    if (t.id === 'soundBtn') {
      G.S.sound = !G.S.sound;
      G.save();
      t.textContent = G.S.sound ? '🔊' : '🔇';
      t.setAttribute('aria-label', G.S.sound ? '关闭音效' : '开启音效');
      G.ensureAudio();
      if (G.S.sound) G.SFX.click();
    }
    if (t.id === 'ruleBtn') { G.SFX.click(); openModal('modalRule'); }
  });

  document.addEventListener('pointerdown', G.ensureAudio, { once: false });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      G.hideUpgradeOverlay();
      var masks = document.querySelectorAll('.modal-mask.show');
      for (var i = 0; i < masks.length; i++) {
        if (masks[i].id !== 'modalTutorial') closeModal(masks[i].id);
      }
    }
  });

  /* 启动 */
  G.S = G.load() || G.defaults();
  $('soundBtn').textContent = G.S.sound ? '🔊' : '🔇';
  $('soundBtn').setAttribute('aria-label', G.S.sound ? '关闭音效' : '开启音效');
  G.initFx();
  G.renderHome();
  G.showLayer('home');
  if (!G.S.seenTutorial) openModal('modalTutorial');
})();
