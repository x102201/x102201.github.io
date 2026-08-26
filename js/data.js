/* 牌库、数值公式、段位、成就、每日规则、台词 */
(function (G) {
  'use strict';

  G._uid = 1;
  G.uid = function () { return G._uid++; };

  G.rand = function (n) { return Math.floor(Math.random() * n); };
  G.pick = function (arr) { return arr[G.rand(arr.length)]; };
  G.shuffle = function (arr) {
    var a = arr.slice();
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = G.rand(i + 1);
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  G.dayKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };
  G.dayIdx = function (d) {
    d = d || new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 864e5);
  };

  G.DECK_LIST = [1, 1, 2, 2, 11, 12, 21, 22, 101, 102, 112, 121, 122, 201, 211, 222];

  G.cardStats = function (num) {
    num = String(num);
    var last = num.charAt(num.length - 1);
    var atk, hp, taunt = false;
    if (num.length === 1) {
      atk = parseInt(num, 10);
      hp = atk;
    } else {
      atk = parseInt(num.slice(0, -1), 10);
      hp = parseInt(last, 10);
    }
    if (last === '0') {
      hp = 1;
      taunt = true;
    }
    return {
      num: num,
      cost: num.length,
      atk: atk,
      hp: hp,
      taunt: taunt,
      charge: num === '11' || num === '101' || num === '211',
      deathrattle: num === '21' || num === '121',
      legendary: num === '102' || num === '201',
      peak: num === '222'
    };
  };

  G.makeCard = function (num, camp) {
    var s = G.cardStats(num);
    return {
      id: G.uid(),
      num: s.num,
      cost: s.cost,
      atk: s.atk,
      hp: s.hp,
      maxHp: s.hp,
      taunt: s.taunt,
      charge: s.charge,
      deathrattle: s.deathrattle,
      legendary: s.legendary,
      peak: s.peak,
      canAttack: false,
      camp: camp || '102'
    };
  };

  G.kwText = function (c) {
    var parts = [];
    if (c.legendary) parts.push(c.num === '102' ? '图腾·102' : '图腾·201');
    if (c.peak) parts.push('数字之巅');
    if (c.charge) parts.push('冲锋');
    if (c.taunt) parts.push('嘲讽');
    if (c.deathrattle) parts.push('亡语·分解');
    return parts.join(' · ') || '数字牌';
  };

  G.canUpgradeNum = function (num) {
    return String(num).length < 3;
  };

  G.upgradeNum = function (num, digit) {
    return String(num) + String(digit);
  };

  G.SKILLS = {
    '102': { name: '重组', desc: '弃1抽1', cost: 2 },
    '201': { name: '颠倒', desc: '下张费用-1', cost: 2 }
  };

  G.RANKS = [
    { icon: '🥉', name: '青铜军师', min: 0 },
    { icon: '🥈', name: '白银军师', min: 120 },
    { icon: '🥇', name: '黄金军师', min: 320 },
    { icon: '💠', name: '铂金军师', min: 680 },
    { icon: '💎', name: '钻石军师', min: 1200 },
    { icon: '👑', name: '传奇军师', min: 1900 }
  ];

  G.rankOf = function (points) {
    var r = G.RANKS[0];
    for (var i = 0; i < G.RANKS.length; i++) {
      if (points >= G.RANKS[i].min) r = G.RANKS[i];
    }
    return r;
  };

  G.X_LEVELS = [
    { name: '新晋裁判', minWins: 0 },
    { name: '正式裁判', minWins: 3 },
    { name: '资深裁判', minWins: 8 },
    { name: '传奇裁判', minWins: 15 }
  ];

  G.xLevel = function (wins) {
    var lv = 0;
    for (var i = 0; i < G.X_LEVELS.length; i++) {
      if (wins >= G.X_LEVELS[i].minWins) lv = i;
    }
    return lv;
  };

  G.DAILY_RULES = [
    { icon: '🌫️', name: '迷雾日', desc: '对方随从攻击力 -1（下限 1）', key: 'fog' },
    { icon: '🌬️', name: '顺风日', desc: '你的升级花费 0 水晶', key: 'tailwind' },
    { icon: '🌀', name: '逆风日', desc: '你的手牌上限 5→4', key: 'headwind' },
    { icon: '🎲', name: '混沌日', desc: '所有随从攻击随机 ±1', key: 'chaos' },
    { icon: '💪', name: '强敌日', desc: 'X 起手再多抽 1 张', key: 'boostOpp' },
    { icon: '💰', name: '双倍日', desc: '获胜声望 ×2', key: 'double' }
  ];

  G.todayRule = function () {
    return G.DAILY_RULES[G.dayIdx() % G.DAILY_RULES.length];
  };

  G.handLimitFor = function (player, match) {
    if (match && match.rule && match.rule.key === 'headwind' && player.isHuman && !match.hotseat) return 4;
    return 5;
  };

  G.ACHS = [
    { id: 'first_win', icon: '🏆', name: '首战告捷', desc: '赢得第一场对决', cond: function (s) { return s.wins >= 1; } },
    { id: 'streak3', icon: '🔥', name: '三连胜', desc: '连胜达到 3 场', cond: function (s) { return s.bestStreak >= 3; } },
    { id: 'streak5', icon: '⚡', name: '五连胜', desc: '连胜达到 5 场', cond: function (s) { return s.bestStreak >= 5; } },
    { id: 'totem', icon: '✨', name: '图腾达成', desc: '单局内合成出 102 与 201', cond: function (s) { return s.flags.totem; } },
    { id: 'full', icon: '🧱', name: '满编', desc: '4 随从位全满且获胜', cond: function (s) { return s.flags.full; } },
    { id: 'burst', icon: '💥', name: '秒杀', desc: '一回合对英雄造成 ≥10 伤害', cond: function (s) { return s.flags.burst; } },
    { id: 'perfect', icon: '💯', name: '无损', desc: '英雄未受伤获胜', cond: function (s) { return s.flags.perfect; } },
    { id: 'master', icon: '👑', name: '大师克星', desc: '击败传奇裁判 X', cond: function (s) { return s.flags.beatMaster; } },
    { id: 'wins10', icon: '🎖️', name: '常胜将军', desc: '累计赢得 10 场', cond: function (s) { return s.wins >= 10; } },
    { id: 'matches100', icon: '⚔️', name: '百战之师', desc: '累计进行 100 场对决', cond: function (s) { return s.matches >= 100; } },
    { id: 'daily', icon: '📅', name: '每日军师', desc: '完成一次每日挑战', cond: function (s) { return s.dailyDoneCount >= 1; } },
    { id: 'comeback', icon: '🔄', name: '绝地翻盘', desc: 'HP≤5 时逆转取胜', cond: function (s) { return s.flags.comeback; } }
  ];

  G.X_LINES = {
    home: '数字大陆只有 0、1、2——但顺序决定胜负！',
    camp: '选哪边都行——它们由同样的数字组成！',
    mulligan: '起手三张，换不换？想想你的曲线！',
    open: [
      '欢迎来到数字大陆！我是裁判 X。',
      '费用是位数，攻击与生命就是数字本身。出牌吧！',
      '小牌铺场，还是憋大升级？这局看你怎么选。'
    ],
    play: ['好牌！这是要养图腾吗？', '铺场不错，我可不会放水！', '数字会说话，出手吧。'],
    upgrade: ['追加数字？你在拼信仰之数。', '升级有代价，水晶可是稀缺的。', '0 是嘲讽，1 和 2 是锋刃。'],
    attack: ['算术结算，毫不留情。', '先解场还是打脸？军师的选择。', '同数相撞才轮到我掷硬币。'],
    coin: ['同归于尽？交给 X 的硬币！', '势均力敌，X 最擅长这种判罚。'],
    legendary: ['图腾降临！金色的数字在燃烧！', '102……201……信仰具现了！'],
    win: ['这一局，X 宣布你获胜！', '漂亮。数字站在你这边。', '斩杀成立，X 记下了。'],
    lose: ['对方获胜。再练练曲线吧。', '输在节奏，不在数字。再来。', 'X 不会放水，但欢迎再战。'],
    draw: ['同归于尽。X 判「和」，各得参与分。'],
    hotseat: ['本地热座！硬币决定先手，手牌各自保密。', '102 对 201，X 只负责公平。'],
    skill102: '重组：弃旧抽新，给升级腾位。',
    skill201: '颠倒：下一张牌费用 -1，下限 0。',
    fatigue: '牌库空了。疲劳会越来越疼。',
    end: '回合结束。轮到另一边了。'
  };

  G.LAYER_TALK = {
    home: G.X_LINES.home,
    camp: G.X_LINES.camp,
    mulligan: G.X_LINES.mulligan,
    match: '数字会说话。出牌、升级、攻击。',
    result: '本场对决，听 X 宣布结果！'
  };
})(window.G102 = window.G102 || {});
