/* 裁判 X：等级、tendency 衰减、嘲讽/抢血/斩杀预判 */
(function (G) {
  'use strict';

  function me() { return G.M.players[G.M.turn]; }
  function opp() { return G.M.players[1 - G.M.turn]; }

  function rushBias() {
    var t = G.S && G.S.tendency ? G.S.tendency : { flood: 0, upgrade: 0 };
    return t.upgrade > t.flood;
  }
  function stallBias() {
    var t = G.S && G.S.tendency ? G.S.tendency : { flood: 0, upgrade: 0 };
    return t.flood > t.upgrade;
  }
  function isLegend() {
    return !G.M.hotseat && G.M.xLevel >= 3;
  }

  function faceDamage() {
    var p = me(), o = opp(), i, dmg = 0;
    if (G.hasTaunt(o)) return 0;
    for (i = 0; i < 4; i++) {
      if (p.board[i] && p.board[i].canAttack) dmg += G.effectiveAtk(p.board[i], G.M.turn, false);
    }
    return dmg;
  }

  function firstCanAttack() {
    var p = me(), i;
    for (i = 0; i < 4; i++) if (p.board[i] && p.board[i].canAttack) return i;
    return -1;
  }

  function playableCards() {
    var p = me(), list = [], i, cost;
    var slot = G.emptySlot(p);
    for (i = 0; i < p.hand.length; i++) {
      cost = G.getPlayCost(p, p.hand[i]);
      if (cost <= p.mana && (slot !== -1 || false)) {
        list.push({ index: i, card: p.hand[i], cost: cost });
      }
    }
    if (slot === -1) return [];
    return list;
  }

  function scorePlay(item) {
    var c = item.card;
    var score = c.atk * 2 + c.hp + (c.charge ? 4 : 0) + (c.legendary ? 6 : 0);
    if (stallBias() && c.taunt) score += 8;
    if (rushBias() && c.charge) score += 6;
    if (rushBias()) score += c.atk;
    score -= item.cost * 0.3;
    return score;
  }

  function pickPlay() {
    var list = playableCards();
    if (!list.length) return null;
    list.sort(function (a, b) { return scorePlay(b) - scorePlay(a); });
    return { type: 'play', handIndex: list[0].index };
  }

  function pickUpgrade() {
    var p = me();
    if (p.upgradesThisTurn >= 2) return null;
    var cost = G.upgradeCost(p);
    if (p.mana < cost) return null;
    var i, c, want, digit;
    var prefer102 = p.camp === '102';
    for (i = 0; i < p.hand.length; i++) {
      c = p.hand[i];
      if (!G.canUpgradeNum(c.num)) continue;
      if (c.num === '10' && prefer102) return { type: 'upgrade', handIndex: i, digit: '2' };
      if (c.num === '20' && !prefer102) return { type: 'upgrade', handIndex: i, digit: '1' };
      if (c.num === '10') return { type: 'upgrade', handIndex: i, digit: '2' };
      if (c.num === '20') return { type: 'upgrade', handIndex: i, digit: '1' };
    }
    if (!rushBias() && !stallBias() && p.upgradesThisTurn > 0 && playableCards().length) return null;
    if (rushBias() && playableCards().length && p.mana - cost < 1) return null;
    for (i = 0; i < p.hand.length; i++) {
      c = p.hand[i];
      if (!G.canUpgradeNum(c.num)) continue;
      if (stallBias()) digit = '0';
      else if (rushBias()) digit = '2';
      else digit = c.num === '1' || c.num === '2' ? '0' : '2';
      return { type: 'upgrade', handIndex: i, digit: digit };
    }
    return null;
  }

  function pickSkill() {
    var p = me();
    if (!G.canHeroPower(G.M.turn)) return null;
    if (p.camp === '201') {
      var i, c;
      for (i = 0; i < p.hand.length; i++) {
        c = p.hand[i];
        if (c.cost === p.mana + 1 || (p.invertNext === false && c.cost > p.mana && c.cost - 1 <= p.mana)) {
          return { type: 'skill' };
        }
      }
      if (p.mana >= 3 && p.hand.length) return { type: 'skill' };
      return null;
    }
    if (p.hand.length >= 4 || (p.hand.length && p.mana >= 2 && !playableCards().length)) {
      var worst = 0, i, sc, best = 99;
      for (i = 0; i < p.hand.length; i++) {
        sc = p.hand[i].atk + p.hand[i].hp - p.hand[i].cost;
        if (p.hand[i].cost > p.mana + 1) sc -= 5;
        if (sc < best) { best = sc; worst = i; }
      }
      return { type: 'skill', handIndex: worst };
    }
    return null;
  }

  function tradeValue(my, en) {
    var a = G.effectiveAtk(my, G.M.turn, false);
    var d = G.effectiveAtk(en, 1 - G.M.turn, false);
    var kill = a >= en.hp;
    var die = d >= my.hp;
    if (kill && !die) return 12 + en.atk;
    if (kill && die) return en.atk + en.hp - my.atk;
    if (!kill && !die) return -2;
    return -6;
  }

  function pickAttack() {
    var p = me(), o = opp(), i, j, best = null, bestSc = -99, sc;
    var taunt = G.hasTaunt(o);
    var mi = [];
    for (i = 0; i < 4; i++) if (p.board[i] && p.board[i].canAttack) mi.push(i);
    if (!mi.length) return null;

    if ((isLegend() || rushBias()) && !taunt && faceDamage() >= o.hp) {
      return { type: 'attack', minionIndex: mi[0], target: { type: 'hero' } };
    }

    for (i = 0; i < mi.length; i++) {
      var mine = p.board[mi[i]];
      if (taunt) {
        for (j = 0; j < 4; j++) {
          if (!o.board[j] || !o.board[j].taunt) continue;
          sc = tradeValue(mine, o.board[j]);
          if (sc > bestSc) {
            bestSc = sc;
            best = { type: 'attack', minionIndex: mi[i], target: { type: 'minion', index: j } };
          }
        }
      } else {
        for (j = 0; j < 4; j++) {
          if (!o.board[j]) continue;
          sc = tradeValue(mine, o.board[j]);
          if (stallBias()) sc += 3;
          if (sc > bestSc) {
            bestSc = sc;
            best = { type: 'attack', minionIndex: mi[i], target: { type: 'minion', index: j } };
          }
        }
        var faceSc = rushBias() ? 8 + mine.atk : (o.hp <= 8 ? 6 : 1);
        if (faceSc > bestSc) {
          bestSc = faceSc;
          best = { type: 'attack', minionIndex: mi[i], target: { type: 'hero' } };
        }
      }
    }
    if (best && bestSc < 0 && !taunt && !stallBias()) {
      return { type: 'attack', minionIndex: mi[0], target: { type: 'hero' } };
    }
    return best;
  }

  G.aiDecide = function () {
    var M = G.M;
    if (!M || M.winner !== null || M.phase !== 'play') return { type: 'end' };
    var p = me();

    if (isLegend() && !G.hasTaunt(opp()) && faceDamage() >= opp().hp) {
      var idx = firstCanAttack();
      if (idx >= 0) return { type: 'attack', minionIndex: idx, target: { type: 'hero' } };
    }

    var play = pickPlay();
    var up = pickUpgrade();

    if (stallBias()) {
      if (play && playableCards()[0] && playableCards()[0].card.taunt) return play;
      if (up && G.emptySlot(p) === -1) return up;
      if (play) return play;
      if (up) return up;
    } else if (rushBias()) {
      if (play) return play;
      var atk = pickAttack();
      if (atk && atk.target && atk.target.type === 'hero') return atk;
      if (up && p.mana - G.upgradeCost(p) >= 0 && !play) return up;
    } else {
      if (play && p.mana >= playableCards()[0].cost) return play;
      if (up && p.upgradesThisTurn === 0 && p.mana >= 2) return up;
      if (play) return play;
    }

    var sk = pickSkill();
    if (sk) return sk;

    var atk2 = pickAttack();
    if (atk2) return atk2;

    if (up) return up;
    if (play) return play;
    return { type: 'end' };
  };

  G.applyTendency = function () {
    if (!G.S || !G.M || G.M.hotseat) return;
    var t = G.S.tendency;
    t.flood = t.flood * 0.8 + (G.M.stats.flood || 0);
    t.upgrade = t.upgrade * 0.8 + (G.M.stats.upgrade || 0);
  };
})(window.G102 = window.G102 || {});
