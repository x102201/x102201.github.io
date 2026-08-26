/* 对局状态机：抽牌 / 出牌 / 升级 / 攻击 / 技能 / 疲劳 / 胜负 */
(function (G) {
  'use strict';

  function emptyBoard() { return [null, null, null, null]; }

  function makePlayer(camp, isHuman, isAI) {
    return {
      camp: camp,
      hp: 20,
      mana: 0,
      manaMax: 0,
      deck: [],
      hand: [],
      board: emptyBoard(),
      fatigue: 0,
      heroPowerUsed: false,
      upgradesThisTurn: 0,
      invertNext: false,
      isHuman: !!isHuman,
      isAI: !!isAI,
      minHp: 20
    };
  }

  function fillDeck(p) {
    var list = G.shuffle(G.DECK_LIST);
    var i;
    p.deck = [];
    for (i = 0; i < list.length; i++) p.deck.push(G.makeCard(list[i], p.camp));
  }

  G.createMatch = function (opts) {
    opts = opts || {};
    var mode = opts.mode || 'normal';
    var camp = opts.camp || '102';
    var oppCamp = camp === '102' ? '201' : '102';
    var hotseat = mode === 'hotseat';
    var p0, p1, first;

    if (hotseat) {
      p0 = makePlayer('102', true, false);
      p1 = makePlayer('201', true, false);
      first = Math.random() < 0.5 ? 0 : 1;
    } else {
      p0 = makePlayer(camp, true, false);
      p1 = makePlayer(oppCamp, false, true);
      first = 0;
    }

    fillDeck(p0);
    fillDeck(p1);

    var M = {
      mode: mode,
      hotseat: hotseat,
      rule: mode === 'daily' ? G.todayRule() : null,
      players: [p0, p1],
      first: first,
      turn: first,
      phase: 'mulligan',
      winner: null,
      busy: false,
      selHand: -1,
      selMinion: -1,
      uiMode: '',
      mullReplace: [false, false, false],
      mullWho: first,
      mullDone: [false, false],
      stats: {
        upgrades: 0,
        minionsPlayed: 0,
        burstDamage: 0,
        turnHeroDmg: 0,
        synthesized102: false,
        synthesized201: false,
        lastKillCard: null,
        lastKillDmg: 0,
        flood: 0,
        upgrade: 0,
        damaged: false,
        lowHp: false
      },
      events: [],
      xLevel: G.xLevel(G.S ? G.S.wins : 0)
    };

    dealOpening(M, 0);
    dealOpening(M, 1);
    G.M = M;
    return M;
  };

  function dealOpening(M, idx) {
    var p = M.players[idx];
    var n = 3;
    var i;
    for (i = 0; i < n; i++) drawRaw(M, p);
    if (idx !== M.first) drawRaw(M, p);
    if (!M.hotseat && p.isAI && M.rule && M.rule.key === 'boostOpp') drawRaw(M, p);
  }

  function drawRaw(M, p) {
    if (!p.deck.length) {
      p.fatigue++;
      p.hp -= p.fatigue;
      if (p.hp < p.minHp) p.minHp = p.hp;
      if (p.isHuman && p.hp < 20) M.stats.damaged = true;
      if (p.isHuman && p.hp <= 5) M.stats.lowHp = true;
      return { type: 'fatigue', who: p, dmg: p.fatigue, hp: p.hp };
    }
    var card = p.deck.shift();
    var limit = G.handLimitFor(p, M);
    if (p.hand.length >= limit) {
      return { type: 'burn', who: p, card: card };
    }
    p.hand.push(card);
    return { type: 'draw', who: p, card: card };
  }

  G.drawCard = function (pIdx) {
    var M = G.M;
    var ev = drawRaw(M, M.players[pIdx]);
    checkWin(M);
    return ev;
  };

  G.getPlayCost = function (p, card) {
    var cost = card.cost;
    if (p.invertNext) cost = Math.max(0, cost - 1);
    return cost;
  };

  G.upgradeCost = function (p) {
    var M = G.M;
    if (M.rule && M.rule.key === 'tailwind' && p.isHuman && !M.hotseat) return 0;
    return 1;
  };

  G.emptySlot = function (p) {
    var i;
    for (i = 0; i < 4; i++) if (!p.board[i]) return i;
    return -1;
  };

  G.boardCount = function (p) {
    var n = 0, i;
    for (i = 0; i < 4; i++) if (p.board[i]) n++;
    return n;
  };

  G.hasTaunt = function (p) {
    var i;
    for (i = 0; i < 4; i++) if (p.board[i] && p.board[i].taunt) return true;
    return false;
  };

  function checkWin(M) {
    if (M.winner !== null) return M.winner;
    var a = M.players[0].hp <= 0;
    var b = M.players[1].hp <= 0;
    if (a && b) M.winner = 'draw';
    else if (a) M.winner = 1;
    else if (b) M.winner = 0;
    if (M.winner !== null) M.phase = 'result';
    return M.winner;
  }

  G.applyMulligan = function (pIdx, replaceFlags) {
    var M = G.M;
    var p = M.players[pIdx];
    var i, card, neu;
    for (i = 0; i < 3 && i < p.hand.length; i++) {
      if (replaceFlags[i]) {
        card = p.hand[i];
        p.deck.push(card);
        p.deck = G.shuffle(p.deck);
        neu = p.deck.shift();
        p.hand[i] = neu;
      }
    }
    M.mullDone[pIdx] = true;
  };

  G.beginMatch = function () {
    var M = G.M;
    M.phase = 'play';
    M.turn = M.first;
    M.selHand = -1;
    M.selMinion = -1;
    M.uiMode = '';
    return G.startTurn(M.turn);
  };

  G.startTurn = function (pIdx) {
    var M = G.M;
    var p = M.players[pIdx];
    var events = [];
    M.turn = pIdx;
    M.selHand = -1;
    M.selMinion = -1;
    M.uiMode = '';
    M.stats.turnHeroDmg = 0;
    p.manaMax = Math.min(6, p.manaMax + 1);
    p.mana = p.manaMax;
    p.heroPowerUsed = false;
    p.upgradesThisTurn = 0;
    p.invertNext = false;
    var i;
    for (i = 0; i < 4; i++) {
      if (p.board[i]) p.board[i].canAttack = true;
    }
    events.push(drawRaw(M, p));
    events.push({ type: 'turnStart', who: pIdx, mana: p.mana });
    checkWin(M);
    return events;
  };

  G.playCard = function (pIdx, handIndex, slot) {
    var M = G.M;
    var p = M.players[pIdx];
    var events = [];
    if (M.phase !== 'play' || M.turn !== pIdx || M.winner !== null) return { ok: false, reason: 'not-turn' };
    if (handIndex < 0 || handIndex >= p.hand.length) return { ok: false, reason: 'no-card' };
    var card = p.hand[handIndex];
    var cost = G.getPlayCost(p, card);
    if (p.mana < cost) return { ok: false, reason: 'mana' };
    var si = slot === undefined || slot < 0 ? G.emptySlot(p) : slot;
    if (si < 0 || p.board[si]) return { ok: false, reason: 'board' };
    p.mana -= cost;
    if (p.invertNext) p.invertNext = false;
    p.hand.splice(handIndex, 1);
    var minion = G.makeCard(card.num, p.camp);
    minion.id = card.id;
    minion.canAttack = !!minion.charge;
    if (p.isHuman) {
      M.stats.minionsPlayed++;
      M.stats.flood++;
    }
    p.board[si] = minion;
    events.push({ type: 'play', who: pIdx, card: minion, slot: si });
    if (minion.legendary) events.push({ type: 'legendary', card: minion, who: pIdx });
    M.selHand = -1;
    checkWin(M);
    return { ok: true, events: events };
  };

  G.upgradeCard = function (pIdx, handIndex, digit) {
    var M = G.M;
    var p = M.players[pIdx];
    if (M.phase !== 'play' || M.turn !== pIdx || M.winner !== null) return { ok: false, reason: 'not-turn' };
    if (handIndex < 0 || handIndex >= p.hand.length) return { ok: false, reason: 'no-card' };
    if (p.upgradesThisTurn >= 2) return { ok: false, reason: 'limit' };
    var card = p.hand[handIndex];
    if (!G.canUpgradeNum(card.num)) return { ok: false, reason: 'max' };
    var cost = G.upgradeCost(p);
    if (p.mana < cost) return { ok: false, reason: 'mana' };
    digit = String(digit);
    if (digit !== '0' && digit !== '1' && digit !== '2') return { ok: false, reason: 'digit' };
    p.mana -= cost;
    p.upgradesThisTurn++;
    var neu = G.makeCard(G.upgradeNum(card.num, digit), p.camp);
    neu.id = card.id;
    p.hand[handIndex] = neu;
    if (p.isHuman) {
      M.stats.upgrades++;
      M.stats.upgrade++;
      if (neu.num === '102') M.stats.synthesized102 = true;
      if (neu.num === '201') M.stats.synthesized201 = true;
    }
    M.selHand = handIndex;
    return { ok: true, events: [{ type: 'upgrade', who: pIdx, from: card, to: neu, digit: digit }] };
  };

  G.effectiveAtk = function (minion, ownerIdx, asAttacker) {
    var M = G.M;
    var atk = minion.atk;
    if (M.rule && M.rule.key === 'fog' && !M.hotseat) {
      if (ownerIdx === 1) atk = Math.max(1, atk - 1);
    }
    if (asAttacker && M.rule && M.rule.key === 'chaos') {
      atk = Math.max(1, atk + (Math.random() < 0.5 ? -1 : 1));
    }
    return atk;
  };

  function removeMinion(p, idx) {
    var m = p.board[idx];
    p.board[idx] = null;
    return m;
  }

  function triggerDeath(M, ownerIdx, minion, events) {
    events.push({ type: 'death', who: ownerIdx, card: minion });
    if (minion.deathrattle) {
      events.push(drawRaw(M, M.players[ownerIdx]));
      events.push({ type: 'deathrattle', who: ownerIdx, card: minion });
    }
  }

  G.attack = function (pIdx, minionIdx, target) {
    var M = G.M;
    var p = M.players[pIdx];
    var opp = M.players[1 - pIdx];
    var events = [];
    if (M.phase !== 'play' || M.turn !== pIdx || M.winner !== null) return { ok: false, reason: 'not-turn' };
    var atkM = p.board[minionIdx];
    if (!atkM || !atkM.canAttack) return { ok: false, reason: 'no-atk' };

    if (target.type === 'minion') {
      if (!opp.board[target.index]) return { ok: false, reason: 'no-target' };
    } else if (target.type !== 'hero') {
      return { ok: false, reason: 'bad-target' };
    }

    if (G.hasTaunt(opp)) {
      if (target.type === 'hero') return { ok: false, reason: 'taunt' };
      if (!opp.board[target.index].taunt) return { ok: false, reason: 'taunt' };
    }

    atkM.canAttack = false;
    var aAtk = G.effectiveAtk(atkM, pIdx, true);

    if (target.type === 'hero') {
      opp.hp -= aAtk;
      if (opp.hp < opp.minHp) opp.minHp = opp.hp;
      if (opp.isHuman && opp.hp < 20) M.stats.damaged = true;
      if (opp.isHuman && opp.hp <= 5) M.stats.lowHp = true;
      if (p.isHuman) {
        M.stats.turnHeroDmg += aAtk;
        if (M.stats.turnHeroDmg > M.stats.burstDamage) M.stats.burstDamage = M.stats.turnHeroDmg;
        M.stats.lastKillCard = atkM.num;
        M.stats.lastKillDmg = aAtk;
      }
      events.push({ type: 'face', who: pIdx, dmg: aAtk, card: atkM, hp: opp.hp });
      M.selMinion = -1;
      M.uiMode = '';
      checkWin(M);
      return { ok: true, events: events };
    }

    var defIdx = target.index;
    var defM = opp.board[defIdx];
    var dAtk = G.effectiveAtk(defM, 1 - pIdx, false);
    var defDies = aAtk >= defM.hp;
    var atkDies = dAtk >= atkM.hp;

    if (defDies && atkDies && aAtk === dAtk) {
      var attackerWins = Math.random() < 0.5;
      events.push({ type: 'coin', attackerWins: attackerWins, a: atkM, b: defM });
      if (attackerWins) {
        triggerDeath(M, 1 - pIdx, removeMinion(opp, defIdx), events);
      } else {
        triggerDeath(M, pIdx, removeMinion(p, minionIdx), events);
      }
    } else {
      defM.hp -= aAtk;
      atkM.hp -= dAtk;
      events.push({ type: 'trade', a: atkM, b: defM, aAtk: aAtk, dAtk: dAtk });
      if (defM.hp <= 0) triggerDeath(M, 1 - pIdx, removeMinion(opp, defIdx), events);
      if (atkM.hp <= 0) triggerDeath(M, pIdx, removeMinion(p, minionIdx), events);
    }

    M.selMinion = -1;
    M.uiMode = '';
    checkWin(M);
    return { ok: true, events: events };
  };

  G.canHeroPower = function (pIdx) {
    var M = G.M;
    var p = M.players[pIdx];
    if (M.phase !== 'play' || M.turn !== pIdx || M.winner !== null) return false;
    if (p.heroPowerUsed || p.mana < 2) return false;
    if (p.camp === '102') {
      if (!p.hand.length && !p.deck.length) return false;
    }
    return true;
  };

  G.heroPower = function (pIdx, extra) {
    var M = G.M;
    var p = M.players[pIdx];
    var events = [];
    if (!G.canHeroPower(pIdx)) return { ok: false, reason: 'no-skill' };
    if (p.camp === '102') {
      if (p.hand.length) {
        var di = extra && extra.handIndex !== undefined ? extra.handIndex : -1;
        if (di < 0 || di >= p.hand.length) return { ok: false, reason: 'pick-discard' };
        p.hand.splice(di, 1);
        events.push({ type: 'discard', who: pIdx });
      }
      p.mana -= 2;
      p.heroPowerUsed = true;
      events.push(drawRaw(M, p));
      events.push({ type: 'skill', who: pIdx, camp: '102' });
      checkWin(M);
      return { ok: true, events: events };
    }
    p.mana -= 2;
    p.heroPowerUsed = true;
    p.invertNext = true;
    events.push({ type: 'skill', who: pIdx, camp: '201' });
    return { ok: true, events: events };
  };

  G.endTurn = function (pIdx) {
    var M = G.M;
    if (M.phase !== 'play' || M.turn !== pIdx || M.winner !== null) return { ok: false };
    M.selHand = -1;
    M.selMinion = -1;
    M.uiMode = '';
    var next = 1 - pIdx;
    var events = G.startTurn(next);
    return { ok: true, events: events, next: next };
  };

  G.checkWin = checkWin;
})(window.G102 = window.G102 || {});
