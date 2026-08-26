/* localStorage 存档 tj102201_v2 */
(function (G) {
  'use strict';

  var STORE_KEY = 'tj102201_v2';

  G.defaults = function () {
    return {
      camp: null,
      lastCamp: null,
      points: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      streak: 0,
      bestStreak: 0,
      campWins: { '102': 0, '201': 0 },
      recent: [],
      ach: {},
      flags: { totem: false, full: false, burst: false, perfect: false, beatMaster: false, comeback: false },
      tendency: { flood: 0, upgrade: 0 },
      dailyDate: '',
      dailyDone: false,
      dailyDoneCount: 0,
      sound: true,
      seenTutorial: false
    };
  };

  G.load = function () {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      var base = G.defaults();
      var k, f;
      for (k in base) {
        if (d[k] !== undefined && k !== 'flags' && k !== 'tendency' && k !== 'campWins' && k !== 'ach') {
          base[k] = d[k];
        }
      }
      if (d.flags) {
        for (f in base.flags) if (d.flags[f] !== undefined) base.flags[f] = d.flags[f];
      }
      if (d.tendency) {
        if (typeof d.tendency.flood === 'number') base.tendency.flood = d.tendency.flood;
        if (typeof d.tendency.upgrade === 'number') base.tendency.upgrade = d.tendency.upgrade;
      }
      if (d.campWins) {
        base.campWins['102'] = d.campWins['102'] || 0;
        base.campWins['201'] = d.campWins['201'] || 0;
      }
      if (d.ach && typeof d.ach === 'object') base.ach = d.ach;
      return base;
    } catch (e) {
      return null;
    }
  };

  G.save = function () {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(G.S));
    } catch (e) {}
  };

  G.S = null;
})(window.G102 = window.G102 || {});
