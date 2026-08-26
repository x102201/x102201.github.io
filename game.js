/* ============================================================
   田忌赛马 · 102 vs 201 · 裁判X
   单屏舞台 · 纯前端 · localStorage 存档
   ============================================================ */
(function () {
  'use strict';

  /* ===================== 数据 ===================== */
  var TIER_VAL = { top: 3, mid: 2, bottom: 1 };

  var HORSES = {
    top:    { id: 'top',    tier: 'top',    emoji: '🦄', speed: 3, cn: '上等马' },
    mid:    { id: 'mid',    tier: 'mid',    emoji: '🐎', speed: 2, cn: '中等马' },
    bottom: { id: 'bottom', tier: 'bottom', emoji: '🐴', speed: 1, cn: '下等马' }
  };

  var CAMP_HORSE_NAMES = {
    '102': { top: '蓝焰', mid: '青电', bottom: '小蓝' },
    '201': { top: '赤焰', mid: '橙电', bottom: '小红' }
  };

  var RANKS = [
    { icon: '🥉', name: '青铜军师', min: 0 },
    { icon: '🥈', name: '白银军师', min: 120 },
    { icon: '🥇', name: '黄金军师', min: 320 },
    { icon: '💠', name: '铂金军师', min: 680 },
    { icon: '💎', name: '钻石军师', min: 1200 },
    { icon: '👑', name: '最强军师', min: 1900 }
  ];

  var X_LEVELS = [
    { name: '新晋裁判', counter: 0 },
    { name: '正式裁判', counter: 0.35 },
    { name: '资深裁判', counter: 0.6 },
    { name: '传奇裁判', counter: 0.85 }
  ];

  var X_LINES = {
    open: [
      '欢迎来到102 vs 201的赛场！我是裁判X。',
      '还记得田忌赛马吗？孙膑献计，下驷对王上驷——今天轮到你了！',
      '三场对阵，三局两胜。排阵之前，先想想孙膑会怎么下这盘棋！'
    ],
    roundStart: [
      '放马！谁先到谁说话！',
      '这一场，全看你的布阵眼光！',
      '同时亮马，胜负交给速度！'
    ],
    myRoundWin: ['好马！这一场你赢！', '漂亮，这匹马没白养！', '哼，算你走运，判你赢。'],
    oppRoundWin: ['这一场，对方赢了！', '哈哈哈，你的马是不是跑反了？', '看来对方军师有两下子。'],
    coin: ['势均力敌！交给硬币裁决！', '同时冲线？X最擅长这种判罚！', '五五开？那就看X的硬币！'],
    coinMy: ['硬币正面！这一场你赢！', 'X心证：你胜！'],
    coinOpp: ['硬币反面！对方赢了。', 'X心证：对方胜。'],
    matchWin: [
      '本场对决，X宣布你获胜！',
      '不错嘛，X记住你了！',
      '三局两胜，田忌式翻盘！X宣布你获胜！'
    ],
    matchLose: [
      '本场对决，对方获胜！',
      '输得漂亮……才怪！再来！',
      '输在阵型，不在马——想想孙膑会怎么排！'
    ],
    streak: ['{n}连胜！X都开始欣赏你了！', '连胜{n}场，这是要挑战X吗？', '火热！{n}连胜，继续别停！'],
    hotseat: ['本地对决！102营对201营，X只负责公平裁决！', '热座赛开始——把阵型藏好，别让对方看见！'],
    fog: ['迷雾日！第二场强弱颠倒！', '低级马今天要翻身了！'],
    chaos: ['混沌日！每场都交给硬币！', 'X今天心情好，全部听天由命！']
  };

  var DAILY_RULES = [
    { icon: '🌫️', name: '迷雾日', desc: '第2场强弱颠倒：低级马获胜！', key: 'fog' },
    { icon: '🌬️', name: '顺风日', desc: '你的第3场马匹速度 +1', key: 'tailwind' },
    { icon: '🌀', name: '逆风日', desc: '你的第1场马匹速度 -1', key: 'headwind' },
    { icon: '🎲', name: '混沌日', desc: '每场都由X掷硬币决定胜负！', key: 'chaos' },
    { icon: '💪', name: '强敌日', desc: '对方第3场马匹速度 +1', key: 'boostOpp' },
    { icon: '💰', name: '双倍日', desc: '本日获胜积分翻倍！', key: 'double' }
  ];

  var ACHS = [
    { id: 'first_win',  icon: '🏆', name: '首战告捷',     desc: '赢得第一场比赛', cond: function (s) { return s.wins >= 1; } },
    { id: 'streak3',    icon: '🔥', name: '三连胜',       desc: '连胜达到3场', cond: function (s) { return s.bestStreak >= 3; } },
    { id: 'streak5',    icon: '⚡', name: '五连胜',       desc: '连胜达到5场', cond: function (s) { return s.bestStreak >= 5; } },
    { id: 'tianji',     icon: '🧠', name: '田忌传人',     desc: '用经典田忌阵（下上中）获胜', cond: function (s) { return s.flags.tianji; } },
    { id: 'perfect',    icon: '💯', name: '完胜',         desc: '以 3:0 零封对手', cond: function (s) { return s.flags.perfect; } },
    { id: 'master',     icon: '👑', name: '大师克星',     desc: '击败传奇裁判X', cond: function (s) { return s.flags.beatMaster; } },
    { id: 'wins10',     icon: '🎖️', name: '常胜将军',    desc: '累计赢得10场', cond: function (s) { return s.wins >= 10; } },
    { id: 'matches100', icon: '⚔️', name: '百战之师',    desc: '累计进行100场对决', cond: function (s) { return s.matches >= 100; } },
    { id: 'daily',      icon: '📅', name: '每日军师',     desc: '完成一次每日挑战', cond: function (s) { return s.dailyDoneCount >= 1; } },
    { id: 'surprise',   icon: '🎲', name: '出其不意',     desc: '换阵后立刻获胜', cond: function (s) { return s.flags.surprise; } },
    { id: 'comeback',   icon: '🔄', name: '绝地翻盘',     desc: '首场失利后逆转取胜', cond: function (s) { return s.flags.comeback; } },
    { id: 'loyal',      icon: '🛡️', name: '忠诚卫士',    desc: '同一阵营累计获胜10场', cond: function (s) { return Math.max(s.campWins['102'] || 0, s.campWins['201'] || 0) >= 10; } }
  ];

  var LAYER_TALK = {
    home: '我是裁判X，规则我来定！',
    camp: '选哪边都行，X只负责公平！',
    lineup: '秘密布阵，别让对手看见！',
    match: '三场对阵，放马！',
    result: '本场对决，听X宣布结果！'
  };

  /* ===================== 工具 ===================== */
  function $(id) { return document.getElementById(id); }
  function sleep(ms) {
    return new Promise(function (res) {
      setTimeout(res, fast ? Math.max(120, ms / 3) : ms);
    });
  }
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dayIdx(d) {
    d = d || new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 864e5);
  }
  function todayRule() { return DAILY_RULES[dayIdx() % DAILY_RULES.length]; }
  function rankOf(points) {
    var r = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) if (points >= RANKS[i].min) r = RANKS[i];
    return r;
  }

  /* ===================== 存档 ===================== */
  var STORE_KEY = 'tj102201_v1';
  var S = null;

  function defaults() {
    return {
      camp: null,
      lastCamp: null,
      points: 0,
      wins: 0, losses: 0, matches: 0,
      streak: 0, bestStreak: 0,
      campWins: { '102': 0, '201': 0 },
      recent: [],
      ach: {},
      lastPlayerArr: null,
      dailyDate: '', dailyDone: false, dailyDoneCount: 0,
      sound: true,
      flags: { tianji: false, perfect: false, beatMaster: false, surprise: false, comeback: false }
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      var base = defaults();
      for (var k in base) if (d[k] !== undefined) base[k] = d[k];
      if (d.flags) for (var f in base.flags) if (d.flags[f] !== undefined) base.flags[f] = d.flags[f];
      return base;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ===================== 音效 (WebAudio) ===================== */
  var AC = null;
  function ensureAudio() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function tone(freq, dur, type, vol, delay) {
    if (!AC || !S.sound) return;
    var t0 = AC.currentTime + (delay || 0);
    var osc = AC.createOscillator();
    var g = AC.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(AC.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  var SFX = {
    click: function () { tone(660, 0.08, 'square', 0.05); },
    whistle: function () { tone(2350, 0.12, 'square', 0.06); tone(2350, 0.12, 'square', 0.06, 0.16); },
    gallop: function () { for (var i = 0; i < 5; i++) tone(120 + i * 40, 0.06, 'triangle', 0.07, i * 0.07); },
    coin: function () { tone(880, 0.1, 'sine', 0.1); tone(1320, 0.14, 'sine', 0.1, 0.1); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'triangle', 0.1, i * 0.12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.18, 'sine', 0.09, i * 0.15); }); },
    ach: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, 0.12, 'square', 0.05, i * 0.09); }); }
  };

  /* ===================== 舞台缩放 ===================== */
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
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitStage);
  }

  /* 禁止页面滚动（弹窗内部除外） */
  function allowPageScroll(target) {
    return !!(target && target.closest && target.closest('.modal'));
  }
  document.addEventListener('wheel', function (e) {
    if (!allowPageScroll(e.target)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    if (!allowPageScroll(e.target)) e.preventDefault();
  }, { passive: false });

  /* ===================== 背景星空 ===================== */
  var bgCv = $('bg'), bgCtx = bgCv.getContext('2d');
  var stars = [], drifts = [];
  (function initBg() {
    var w, h, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      bgCv.width = w * dpr; bgCv.height = h * dpr;
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 640 ? 60 : 130;
      stars = []; drifts = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, r: 0.5 + Math.random() * 1.6, tw: 0.4 + Math.random() * 1.6, ph: Math.random() * 6.28 });
      for (var j = 0; j < 10; j++) drifts.push({ x: Math.random() * w, y: Math.random() * h, s: 14 + Math.random() * 30, vy: 0.15 + Math.random() * 0.4, ch: pick(['1', '0', '2', '2', '0', '1']) });
    }
    resize();
    window.addEventListener('resize', resize);
    (function draw(now) {
      bgCtx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.001 * st.tw + st.ph));
        bgCtx.globalAlpha = a;
        bgCtx.fillStyle = '#cfe4ff';
        bgCtx.beginPath(); bgCtx.arc(st.x, st.y, st.r, 0, 6.28); bgCtx.fill();
      }
      bgCtx.globalAlpha = 0.14;
      bgCtx.font = '700 20px "Space Mono", monospace';
      for (var j = 0; j < drifts.length; j++) {
        var dr = drifts[j];
        dr.y -= dr.vy;
        if (dr.y < -40) { dr.y = h + 40; dr.x = Math.random() * w; }
        bgCtx.fillText(dr.ch, dr.x, dr.y);
      }
      bgCtx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })(0);
  })();

  /* ===================== 特效画布（彩带，舞台内） ===================== */
  var fxCv = $('fx'), fxCtx = fxCv.getContext('2d');
  var confetti = [];
  (function initFx() {
    var w = 420, h = 800, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = 420; h = 800;
      fxCv.width = w * dpr; fxCv.height = h * dpr;
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    (function loop() {
      fxCtx.clearRect(0, 0, w, h);
      for (var i = confetti.length - 1; i >= 0; i--) {
        var c = confetti[i];
        c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.rot += c.vr;
        if (c.y > h + 30) { confetti.splice(i, 1); continue; }
        fxCtx.save();
        fxCtx.translate(c.x, c.y); fxCtx.rotate(c.rot);
        fxCtx.globalAlpha = c.a;
        fxCtx.fillStyle = c.col;
        fxCtx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
        fxCtx.restore();
      }
      fxCtx.globalAlpha = 1;
      requestAnimationFrame(loop);
    })();
  })();
  function burst(x, y, n) {
    var cols = ['#38bdf8', '#22d3ee', '#fb923c', '#f97316', '#e879f9', '#fbbf24', '#4ade80'];
    var cx = x !== undefined ? x : 210;
    var cy = y !== undefined ? y : 320;
    for (var i = 0; i < (n || 90); i++) {
      var ang = Math.random() * 6.28;
      var sp = 2 + Math.random() * 7;
      confetti.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 8, a: 0.9 + Math.random() * 0.1, col: pick(cols) });
    }
  }

  /* ===================== 图层状态机 ===================== */
  var LAYERS = ['home', 'camp', 'lineup', 'match', 'result'];
  var currentLayer = 'home';

  function showLayer(name) {
    currentLayer = name;
    for (var i = 0; i < LAYERS.length; i++) {
      var el = $('layer-' + LAYERS[i]);
      if (el) el.classList.toggle('active', LAYERS[i] === name);
    }
    var talk = LAYER_TALK[name] || LAYER_TALK.home;
    if (name === 'lineup' && $('xHint') && $('xHint').textContent) talk = $('xHint').textContent;
    setHeroTalk(talk);
  }

  function setHeroTalk(text) {
    var el = $('heroTalk');
    if (!el || el.textContent === text) return;
    el.textContent = text;
    el.classList.remove('bubble');
    void el.offsetWidth;
    el.classList.add('bubble');
  }

  function goHome() {
    pendingMode = 'normal';
    showLayer('home');
    renderHome();
  }

  /* ===================== 裁判X ===================== */
  function xTalk(text) {
    var el = $('xTalk');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('bubble');
    void el.offsetWidth;
    el.classList.add('bubble');
    setHeroTalk(text);
  }

  /* ===================== Toast ===================== */
  function toast(msg) {
    var wrap = $('toast-wrap');
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, 2600);
  }

  /* ===================== 主页数据 ===================== */
  function renderHome() {
    var r = rankOf(S.points);
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

    var dots = '';
    for (var i = 7; i >= 0; i--) {
      var r2 = S.recent[S.recent.length - 1 - i];
      dots += r2 ? '<div class="recent-dot ' + r2 + '">' + (r2 === 'w' ? '胜' : '负') + '</div>'
                  : '<div class="recent-dot empty">·</div>';
    }
    $('recentRow').innerHTML = '<span class="r-label">最近战报</span>' + dots;

    var rule = todayRule();
    var dailyBtn = $('btnDaily');
    if (S.dailyDate === dayKey() && S.dailyDone) {
      dailyBtn.textContent = '📅 每日挑战 ✓ 已完成';
      dailyBtn.disabled = true;
    } else {
      dailyBtn.textContent = '📅 每日挑战 · ' + rule.name;
      dailyBtn.disabled = false;
    }

    renderArenaNames();
  }

  function myCampKey() {
    if (M && M.mode === 'hotseat') return '102';
    return S.camp;
  }
  function oppCampKey() {
    if (M && M.mode === 'hotseat') return '201';
    return S.camp === '102' ? '201' : '102';
  }
  function oppCampName() { return oppCampKey() + '营'; }

  function renderArenaNames() {
    var mine = myCampKey();
    if (!mine) return;
    $('myCampName').textContent = mine + '营';
    $('oppCampName').textContent = oppCampName();
  }

  /* ===================== 三场对阵表 ===================== */
  function initMatchup() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<div class="mu-row" id="muRow' + i + '">' +
        '<div class="mu-no">第' + (i + 1) + '场</div>' +
        '<div class="mu-side mu-my"><span class="mu-emoji">🐴</span><div class="mu-info"><div class="mu-name">？</div><div class="mu-tier">待出战</div></div></div>' +
        '<div class="mu-vs">VS</div>' +
        '<div class="mu-side mu-opp"><span class="mu-emoji">🐴</span><div class="mu-info"><div class="mu-name">？</div><div class="mu-tier">待出战</div></div></div>' +
        '<div class="mu-result pending">…</div>' +
        '</div>';
    }
    $('matchupTable').innerHTML = html;
  }

  function setMatchupRow(i, myTier, oppTier, res) {
    var row = $('muRow' + i);
    if (!row) return;
    var myH = HORSES[myTier], oppH = HORSES[oppTier];
    var myName = CAMP_HORSE_NAMES[myCampKey()][myTier];
    var oppName = CAMP_HORSE_NAMES[oppCampKey()][oppTier];
    var resHtml = '…', cls = 'pending';
    if (res === 'w') { resHtml = '胜'; cls = 'w'; }
    else if (res === 'l') { resHtml = '负'; cls = 'l'; }
    else if (res === 'coinW') { resHtml = '🪙胜'; cls = 'coin'; }
    else if (res === 'coinL') { resHtml = '🪙负'; cls = 'coin'; }
    row.innerHTML =
      '<div class="mu-no">第' + (i + 1) + '场</div>' +
      '<div class="mu-side mu-my"><span class="mu-emoji">' + myH.emoji + '</span><div class="mu-info"><div class="mu-name">' + myName + '</div><div class="mu-tier">' + myH.cn + '</div></div></div>' +
      '<div class="mu-vs">VS</div>' +
      '<div class="mu-side mu-opp"><span class="mu-emoji">' + oppH.emoji + '</span><div class="mu-info"><div class="mu-name">' + oppName + '</div><div class="mu-tier">' + oppH.cn + '</div></div></div>' +
      '<div class="mu-result ' + cls + '">' + resHtml + '</div>';
  }

  function markMatchupRow(i, current) {
    for (var k = 0; k < 3; k++) {
      var row = $('muRow' + k);
      if (row) row.classList.toggle('current', current && k === i);
    }
  }

  /* ===================== 布阵 ===================== */
  var M = null;
  var lineup = [null, null, null];
  var pendingMode = 'normal';
  var matching = false;

  function horseCard(tier, name, opts) {
    var h = HORSES[tier];
    var camp = (M && M.mode === 'hotseat' && M.hotseatStep === '201') ? '201' : (S.camp || '102');
    var nm = name || CAMP_HORSE_NAMES[camp][tier];
    return '<div class="horse-card t' + h.speed + '" data-tier="' + tier + '" ' + (opts || '') + '>' +
      '<span class="hc-emoji">' + h.emoji + '</span>' +
      '<span><span class="hc-name">' + nm + '</span><br><span class="hc-tier">' + h.cn + '</span></span>' +
      '<span class="hc-speed">速' + h.speed + '</span></div>';
  }

  function lineupCamp() {
    if (M && M.mode === 'hotseat') return M.hotseatStep === '201' ? '201' : '102';
    return S.camp;
  }

  function renderLineup() {
    var camp = lineupCamp();
    var isHs = M && M.mode === 'hotseat';
    $('lineupTitle').textContent = camp + '营 · ' + (isHs ? '秘密布阵' : '排兵布阵');

    var lvl = X_LEVELS[xLevel()];
    var hints = [];
    if (isHs) {
      hints.push(camp === '102' ? '请秘密布阵，不要让201营看到' : '请秘密布阵，不要让102营看到');
    } else {
      if (M && M.rule) hints.push('今日规则：' + M.rule.name + ' ' + M.rule.icon);
      if (xLevel() >= 1 && S.lastPlayerArr) hints.push('⚠️ X已记住你上一场的阵型');
      hints.push('裁判X Lv.' + xLevel() + '「' + lvl.name + '」');
    }
    $('xHint').textContent = hints.join(' · ') || 'X正在暗中观察你……';
    setHeroTalk($('xHint').textContent);

    var lanesHtml = lineup.map(function (tier, i) {
      var h = tier ? HORSES[tier] : null;
      var nm = tier ? CAMP_HORSE_NAMES[camp][tier] : '';
      var inner = h
        ? '<div class="horse-card t' + h.speed + '" data-lane="' + i + '">' +
          '<span class="hc-emoji">' + h.emoji + '</span>' +
          '<span><span class="hc-name">' + nm + '</span><br><span class="hc-tier">' + h.cn + '</span></span></div>'
        : '<div class="lane-mount">点击下方马匹放入</div>';
      return '<div class="lane-slot ' + (h ? 'filled' : '') + '" data-lane="' + i + '">' +
        '<div class="lane-no">第<b>' + (i + 1) + '</b>场</div>' + inner + '</div>';
    }).join('');
    $('lanes').innerHTML = lanesHtml;

    var poolHtml = '';
    var tiers = ['top', 'mid', 'bottom'];
    for (var i = 0; i < 3; i++) {
      var t = tiers[i];
      if (lineup.indexOf(t) === -1) poolHtml += horseCard(t);
    }
    $('pool').innerHTML = poolHtml || '<span style="color:var(--ink-dim);font-size:12px">所有马匹已就位</span>';

    $('btnStart').disabled = lineup.indexOf(null) !== -1;
    $('btnStart').textContent = (isHs && M.hotseatStep === '102') ? '确认布阵 →' : '开赛！';
  }

  function showPass(on) {
    $('lineupPanel').hidden = !!on;
    $('passPanel').hidden = !on;
  }

  function openLineup(mode) {
    M = {
      mode: mode,
      rule: mode === 'daily' ? todayRule() : null,
      myLineup: null, oppLineup: null,
      lineup102: null, lineup201: null,
      hotseatStep: mode === 'hotseat' ? '102' : null,
      rounds: [], myScore: 0, oppScore: 0
    };
    lineup = [null, null, null];
    matching = false;
    showPass(false);
    renderArenaNames();
    var rb = $('resultBtns');
    if (rb) rb.classList.toggle('hotseat', mode === 'hotseat');
    showLayer('lineup');
    renderLineup();
  }

  function openCampView() {
    showLayer('camp');
  }

  function xLevel() { return Math.min(3, Math.floor(S.wins / 2)); }

  /* ===================== AI：X 布阵 ===================== */
  var PERMS = [
    ['top', 'mid', 'bottom'], ['top', 'bottom', 'mid'],
    ['mid', 'top', 'bottom'], ['mid', 'bottom', 'top'],
    ['bottom', 'top', 'mid'], ['bottom', 'mid', 'top']
  ];

  function bestCounter(arr) {
    var best = [], bestScore = -1;
    for (var p = 0; p < PERMS.length; p++) {
      var perm = PERMS[p], score = 0;
      for (var i = 0; i < 3; i++) {
        if (TIER_VAL[perm[i]] > TIER_VAL[arr[i]]) score++;
      }
      if (score > bestScore) { bestScore = score; best = [perm]; }
      else if (score === bestScore) best.push(perm);
    }
    return pick(best);
  }

  function oppLineup() {
    var lvl = xLevel();
    var p = X_LEVELS[lvl].counter;
    if (p > 0 && S.lastPlayerArr && Math.random() < p) {
      return bestCounter(S.lastPlayerArr);
    }
    var arr = PERMS.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr[0];
  }

  /* ===================== 开赛 ===================== */
  function startMatch() {
    if (matching) return;
    if (M.mode === 'hotseat') {
      M.myLineup = M.lineup102.slice();
      M.oppLineup = M.lineup201.slice();
    } else {
      M.myLineup = lineup.slice();
      M.oppLineup = oppLineup();
      M.prevArr = S.lastPlayerArr;
      S.lastPlayerArr = M.myLineup.slice();
      save();
    }
    M.rounds = []; M.myScore = 0; M.oppScore = 0;
    M.oppLv = xLevel();
    matching = true;

    resetArena();
    SFX.click();
    showLayer('match');
    runMatch();
  }

  function resetArena() {
    $('myScore').textContent = '0';
    $('oppScore').textContent = '0';
    $('roundBanner').className = 'round-banner';
    $('coinOverlay').classList.remove('show');
    $('coinText').textContent = '';
    $('btnFast').textContent = fast ? '⏩ 快进中' : '⏩ 快进';
    initMatchup();
    renderRoundDots();
    setHorse('my', 'bottom');
    setHorse('opp', 'bottom');
    renderArenaNames();
    xTalk(M.mode === 'hotseat' ? pick(X_LINES.hotseat) : '第1场放马前，X先说一句：孙膑靠布阵赢，你也一样！');
  }

  function renderRoundDots() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      var cls = '';
      if (M.rounds[i]) {
        var w = M.rounds[i].winner;
        cls = w === 'my' ? 'w' : (w === 'opp' ? 'l' : 'd');
      }
      html += '<div class="r-dot ' + cls + '"></div>';
    }
    $('roundDots').innerHTML = html;
  }

  function effSpeed(h, camp, i) {
    var s = h.speed;
    if (M.rule) {
      if (M.rule.key === 'tailwind' && camp === 'my' && i === 2) s += 1;
      if (M.rule.key === 'headwind' && camp === 'my' && i === 0) s -= 1;
      if (M.rule.key === 'boostOpp' && camp === 'opp' && i === 2) s += 1;
    }
    return s;
  }

  function resolveRound(myH, oppH, i) {
    if (M.rule && M.rule.key === 'chaos') {
      return { winner: Math.random() < 0.5 ? 'my' : 'opp', coin: true };
    }
    var ms = effSpeed(myH, 'my', i), os = effSpeed(oppH, 'opp', i);
    var winner = ms > os ? 'my' : (os > ms ? 'opp' : null);
    var coin = false;
    if (winner === null) {
      coin = true;
      winner = Math.random() < 0.5 ? 'my' : 'opp';
    } else if (M.rule && M.rule.key === 'fog' && i === 1) {
      winner = winner === 'my' ? 'opp' : 'my';
    }
    return { winner: winner, coin: coin };
  }

  /* ===================== 赛程动画 ===================== */
  var fast = false;

  function setHorse(side, tier) {
    var h = HORSES[tier];
    var el = $(side === 'my' ? 'horseMy' : 'horseOpp');
    var camp = side === 'my' ? myCampKey() : oppCampKey();
    el.querySelector('.h-emoji').textContent = h.emoji;
    el.querySelector('.h-name').textContent = CAMP_HORSE_NAMES[camp][tier];
    el.querySelector('.h-speed').textContent = '速' + h.speed;
    el.style.transition = 'none';
    el.style.transform = 'translate(0px, -50%)';
    void el.offsetWidth;
    el.classList.remove('win', 'lose', 'running');
  }

  function runHorse(side, durMs) {
    var el = $(side === 'my' ? 'horseMy' : 'horseOpp');
    var lane = el.parentElement;
    var dist = lane.clientWidth - el.offsetWidth - lane.clientWidth * 0.05 - 12;
    if (dist < 20) dist = 200;
    el.classList.add('running');
    el.style.transition = 'transform ' + durMs + 'ms cubic-bezier(.2,.6,.3,1)';
    void el.offsetWidth;
    el.style.transform = 'translate(' + dist + 'px, -50%)';
    return new Promise(function (res) { setTimeout(res, durMs + 80); });
  }

  async function runMatch() {
    var i, res;
    xTalk(M.mode === 'hotseat' ? pick(X_LINES.hotseat) : pick(X_LINES.open));
    SFX.whistle();
    await sleep(900);

    for (i = 0; i < 3; i++) {
      var myH = HORSES[M.myLineup[i]];
      var oppH = HORSES[M.oppLineup[i]];

      setMatchupRow(i, myH.tier, oppH.tier, null);
      markMatchupRow(i, true);

      $('laneMyTag').textContent = myCampKey() + '营 · 第' + (i + 1) + '场';
      $('laneOppTag').textContent = oppCampName() + ' · 第' + (i + 1) + '场';
      setHorse('my', myH.tier);
      setHorse('opp', oppH.tier);

      var myNm = CAMP_HORSE_NAMES[myCampKey()][myH.tier];
      var oppNm = CAMP_HORSE_NAMES[oppCampKey()][oppH.tier];
      xTalk('第' + (i + 1) + '场：' + myNm + '(' + myH.cn + ') vs ' + oppNm + '(' + oppH.cn + ')！' + pick(X_LINES.roundStart));
      SFX.whistle();
      await sleep(900);

      res = resolveRound(myH, oppH, i);
      M.rounds.push(res);
      if (res.winner === 'my') M.myScore++; else M.oppScore++;
      renderRoundDots();

      var durMy = durFor(effSpeed(myH, 'my', i));
      var durOpp = durFor(effSpeed(oppH, 'opp', i));
      SFX.gallop();
      var pMy = runHorse('my', durMy);
      var pOpp = runHorse('opp', durOpp);

      if (res.coin) {
        await Promise.all([pMy, pOpp]);
        $('coinOverlay').classList.add('show');
        SFX.coin();
        xTalk(pick(X_LINES.coin));
        await sleep(900);
        $('coinText').textContent = res.winner === 'my'
          ? ('正面！' + (M.mode === 'hotseat' ? '102营赢了！' : '你赢了！'))
          : ('反面！' + (M.mode === 'hotseat' ? '201营赢了！' : '对方赢了！'));
        await sleep(950);
        $('coinOverlay').classList.remove('show');
      } else {
        await Promise.all([pMy, pOpp]);
      }

      $(res.winner === 'my' ? 'horseMy' : 'horseOpp').classList.add('win');
      $(res.winner === 'opp' ? 'horseMy' : 'horseOpp').classList.add('lose');

      var banner = $('roundBanner');
      var hs = M.mode === 'hotseat';
      if (res.coin) {
        setMatchupRow(i, myH.tier, oppH.tier, res.winner === 'my' ? 'coinW' : 'coinL');
        banner.className = 'round-banner tie show';
        banner.innerHTML = '🪙 X心证：' + (res.winner === 'my' ? (hs ? '102营赢下此场！' : '你赢下此场！') : (hs ? '201营赢下此场！' : '对方赢下此场！'));
        xTalk(res.winner === 'my' ? pick(X_LINES.coinMy) : pick(X_LINES.coinOpp));
        SFX.coin();
      } else if (res.winner === 'my') {
        setMatchupRow(i, myH.tier, oppH.tier, 'w');
        banner.className = 'round-banner win show';
        banner.innerHTML = hs ? '🏇 102营本场获胜！' : '🏇 本场获胜！';
        xTalk(pick(X_LINES.myRoundWin));
        SFX.click();
      } else {
        setMatchupRow(i, myH.tier, oppH.tier, 'l');
        banner.className = 'round-banner lose show';
        banner.innerHTML = hs ? '💨 201营本场获胜！' : '💨 本场失利！';
        xTalk(pick(X_LINES.oppRoundWin));
        SFX.lose();
      }
      if (M.rule && M.rule.key === 'fog' && i === 1) xTalk(pick(X_LINES.fog));
      if (M.rule && M.rule.key === 'chaos') xTalk(pick(X_LINES.chaos));

      markMatchupRow(i, false);
      $('muRow' + i).classList.add('done');
      $('myScore').textContent = M.myScore;
      $('oppScore').textContent = M.oppScore;
      await sleep(1500);
      banner.className = 'round-banner';
    }

    finishMatch();
  }

  function durFor(speed) {
    var base = speed >= 3 ? 850 : speed === 2 ? 1250 : 1700;
    var j = rand(150);
    return fast ? Math.max(220, (base + j) / 3) : base + j;
  }

  /* ===================== 结算 ===================== */
  function finishMatch() {
    matching = false;
    var won = M.myScore > M.oppScore;
    var perfect = M.myScore === 3;
    var hs = M.mode === 'hotseat';
    var box = $('resultBox');
    box.classList.remove('win', 'lose');
    box.classList.add(won ? 'win' : 'lose');

    if (hs) {
      var winCamp = won ? '102' : '201';
      $('resultBadge').textContent = '🏆';
      $('resultTitle').textContent = winCamp + '营获胜！';
      box.classList.remove('lose');
      box.classList.add('win');
    } else {
      $('resultBadge').textContent = won ? '🏆' : '💔';
      $('resultTitle').textContent = won ? '胜 利 ！' : '惜 败 …';
    }
    $('resultScore').textContent = M.myScore + ' : ' + M.oppScore;

    var rb = $('resultBtns');
    if (rb) rb.classList.toggle('hotseat', hs);

    var pts = 0, breakdown = [];
    var rankUp = false;
    var newRank = rankOf(S.points);

    if (!hs) {
      var xl = M.oppLv;
      var oldRank = rankOf(S.points);
      S.matches++;
      var isDaily = M.mode === 'daily';

      if (won) {
        S.wins++;
        S.streak++;
        S.bestStreak = Math.max(S.bestStreak, S.streak);
        S.campWins[S.camp] = (S.campWins[S.camp] || 0) + 1;

        var dailyBonus = 0;
        if (isDaily) {
          pts = 20;
          breakdown.push('每日挑战胜利 +20');
          if (S.dailyDate !== dayKey() || !S.dailyDone) {
            S.dailyDoneCount++;
            S.dailyDone = true; S.dailyDate = dayKey();
            dailyBonus = 10;
            breakdown.push('每日首胜额外 +10');
          }
        } else {
          pts = 10; breakdown.push('胜利 +10');
          if (perfect) { pts += 5; breakdown.push('完胜 3:0 +5'); }
          if (S.streak >= 3) { pts += 2; breakdown.push('连胜加成(≥3) +2'); }
          if (S.camp === S.lastCamp) { pts += 2; breakdown.push('忠诚加成 +2'); }
        }
        pts += dailyBonus;
        if (M.rule && M.rule.key === 'double') { pts *= 2; breakdown.push('双倍日 ×2'); }

        if (JSON.stringify(M.myLineup) === JSON.stringify(['bottom', 'top', 'mid'])) S.flags.tianji = true;
        if (perfect) S.flags.perfect = true;
        if (xl >= 3) S.flags.beatMaster = true;
        if (M.prevArr && JSON.stringify(M.prevArr) !== JSON.stringify(M.myLineup)) S.flags.surprise = true;
        if (M.rounds[0] && M.rounds[0].winner === 'opp') S.flags.comeback = true;
      } else {
        S.losses++;
        S.streak = 0;
        pts = 3;
        breakdown.push('参与 +3');
      }

      S.points += pts;
      S.lastCamp = S.camp;
      S.recent.push(won ? 'w' : 'l');
      if (S.recent.length > 8) S.recent.shift();

      newRank = rankOf(S.points);
      rankUp = newRank !== oldRank && newRank.min > oldRank.min;
      save();
    }

    if (hs) {
      $('ptsLine').textContent = '友谊赛 · 不计声望 · 不触发X学习';
      $('streakLine').textContent = '';
      $('rankLine').textContent = '';
      $('xVerdict').textContent = '⚖️ X：' + (won ? '102营三局两胜！' : '201营三局两胜！') + ' 本地热座，下次换你布阵？';
    } else {
      $('ptsLine').textContent = '+' + pts + ' 声望：' + breakdown.join(' · ');
      $('streakLine').textContent = S.streak >= 2 ? '🔥 当前连胜 ' + S.streak + ' 场 · 最佳 ' + S.bestStreak + ' 场' : '';
      $('rankLine').textContent = rankUp ? '🎉 晋升！' + newRank.icon + ' ' + newRank.name + '！' : '';

      var verdict = '';
      if (won) {
        verdict = pick(X_LINES.matchWin);
        if (S.streak >= 2) verdict += ' ' + pick(X_LINES.streak).replace('{n}', S.streak);
        if (M.oppLv >= 3) verdict += ' （你打败了传奇裁判！）';
      } else {
        verdict = pick(X_LINES.matchLose);
        if (M.oppLv >= 1) verdict += ' X又开始研究了……';
      }
      $('xVerdict').textContent = '⚖️ X：' + verdict;
    }

    var tN = function (t) { return HORSES[t].emoji + HORSES[t].cn; };
    $('formations').innerHTML =
      '<div class="f-box"><div class="fb-title">' + myCampKey() + '营</div><div class="fb-tiers">' + M.myLineup.map(tN).join(' → ') + '</div></div>' +
      '<div class="f-box"><div class="fb-title">' + oppCampName() + '</div><div class="fb-tiers">' + M.oppLineup.map(tN).join(' → ') + '</div></div>';

    if (!hs) checkAch();

    if (won || hs) { SFX.win(); burst(); } else { SFX.lose(); }
    showLayer('result');
    setHeroTalk(hs
      ? (won ? '102营获胜！友谊赛圆满结束。' : '201营获胜！友谊赛圆满结束。')
      : $('xVerdict').textContent.replace(/^⚖️ X：/, ''));
    renderHome();
  }

  function checkAch() {
    var unlocked = 0;
    for (var i = 0; i < ACHS.length; i++) {
      var a = ACHS[i];
      if (!S.ach[a.id] && a.cond(S)) {
        S.ach[a.id] = true;
        unlocked++;
        setTimeout((function (name) {
          return function () { toast('🏅 成就解锁：' + name); SFX.ach(); burst(210, 240, 40); };
        })(a.name), unlocked * 700);
      }
    }
    if (unlocked) save();
  }

  /* ===================== 成就 / 每日 ===================== */
  function renderAch() {
    $('achGrid').innerHTML = ACHS.map(function (a) {
      var got = !!S.ach[a.id];
      return '<div class="ach-item ' + (got ? '' : 'locked') + '">' +
        '<div class="ai">' + a.icon + '</div>' +
        '<div class="an">' + a.name + '</div>' +
        '<div class="ad">' + a.desc + '</div>' +
        (got ? '<div class="ad" style="color:#4ade80">✓ 已解锁</div>' : '') +
        '</div>';
    }).join('');
  }

  function renderDaily() {
    var rule = todayRule();
    var doneToday = S.dailyDate === dayKey() && S.dailyDone;
    $('dailyBody').innerHTML =
      '<p>每天X都会定一条<b>特殊规则</b>。今日规则：</p>' +
      '<div class="daily-rule"><div class="dr-icon">' + rule.icon + '</div>' +
      '<div class="dr-name">' + rule.name + '</div><div class="dr-desc">' + rule.desc + '</div></div>' +
      '<p style="color:var(--ink-dim);font-size:13px">完成挑战（胜利）可得 <b style="color:var(--c-gold)">+20声望</b>，每日首胜再 <b style="color:var(--c-gold)">+10</b>；失败也可重试哦。</p>' +
      (doneToday ? '<div class="daily-done">✓ 今日挑战已完成，明天再来！</div>' : '');
    $('btnDailyStart').style.display = doneToday ? 'none' : 'block';
  }

  /* ===================== 弹窗 + 焦点 ===================== */
  var lastFocus = null;
  function openModal(id) {
    if (id === 'modalAch') renderAch();
    if (id === 'modalDaily') renderDaily();
    lastFocus = document.activeElement;
    $(id).classList.add('show');
    var first = $(id).querySelector('button, [href], input');
    if (first) first.focus();
  }
  function closeModal(id) {
    $(id).classList.remove('show');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ===================== 事件绑定 ===================== */
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal-mask')) {
      closeModal(e.target.id);
      SFX.click();
      return;
    }
    var cl = e.target.closest('[data-close]');
    if (cl) { closeModal(cl.getAttribute('data-close')); SFX.click(); return; }

    var bk = e.target.closest('[data-back]');
    if (bk) {
      if (bk.getAttribute('data-back') === 'home') goHome();
      SFX.click();
      return;
    }

    var t = e.target.closest('button') || e.target;

    if (t.id === 'btnPlay') {
      SFX.click();
      pendingMode = 'normal';
      if (!S.camp) { openCampView(); return; }
      openLineup('normal');
    }
    if (t.id === 'btnDaily') {
      SFX.click();
      openModal('modalDaily');
    }
    if (t.id === 'btnDual') {
      SFX.click();
      pendingMode = 'hotseat';
      openLineup('hotseat');
    }
    if (t.id === 'btnAch' || t.id === 'btnRule2') {
      SFX.click();
      openModal(t.id === 'btnAch' ? 'modalAch' : 'modalRule');
    }

    var cc = t.closest ? t.closest('.camp-card') : null;
    if (cc) {
      SFX.click();
      S.camp = cc.getAttribute('data-camp');
      save();
      openLineup(pendingMode === 'daily' ? 'daily' : 'normal');
    }

    if (currentLayer === 'lineup' && $('passPanel').hidden) {
      var pc = t.closest ? t.closest('#pool .horse-card') : null;
      if (pc) {
        var tier = pc.getAttribute('data-tier');
        var idx = lineup.indexOf(null);
        if (idx !== -1) { lineup[idx] = tier; SFX.click(); renderLineup(); }
        return;
      }
      var ls = t.closest ? t.closest('.lane-slot') : null;
      if (ls) {
        var li = +ls.getAttribute('data-lane');
        if (lineup[li]) { lineup[li] = null; SFX.click(); renderLineup(); }
        return;
      }
    }

    if (t.id === 'btnRandom') {
      SFX.click();
      var tiers = ['top', 'mid', 'bottom'];
      for (var i = tiers.length - 1; i > 0; i--) { var j = rand(i + 1); var x = tiers[i]; tiers[i] = tiers[j]; tiers[j] = x; }
      lineup = tiers; renderLineup();
    }
    if (t.id === 'btnTianji') {
      SFX.click();
      lineup = ['bottom', 'top', 'mid'];
      renderLineup();
      toast('🧠 田忌妙计：下等马对上等马、上等马对中等马、中等马对下等马');
    }
    if (t.id === 'btnClear') {
      SFX.click();
      lineup = [null, null, null]; renderLineup();
    }
    if (t.id === 'btnStart') {
      if (lineup.indexOf(null) !== -1) return;
      if (M && M.mode === 'hotseat' && M.hotseatStep === '102') {
        M.lineup102 = lineup.slice();
        M.hotseatStep = 'pass';
        showPass(true);
        setHeroTalk('把设备交给201营，X为你们保密！');
        SFX.click();
        return;
      }
      if (M && M.mode === 'hotseat' && M.hotseatStep === '201') {
        M.lineup201 = lineup.slice();
        startMatch();
        return;
      }
      startMatch();
    }
    if (t.id === 'btnPassOk') {
      SFX.click();
      M.hotseatStep = '201';
      lineup = [null, null, null];
      showPass(false);
      renderLineup();
    }
    if (t.id === 'btnPassCancel' || t.id === 'btnBackHome') {
      SFX.click();
      goHome();
    }

    if (t.id === 'btnFast') {
      fast = !fast;
      t.textContent = fast ? '⏩ 快进中' : '⏩ 快进';
      SFX.click();
    }

    if (t.id === 'btnAgain') {
      SFX.click();
      openLineup(M && M.mode === 'hotseat' ? 'hotseat' : 'normal');
    }
    if (t.id === 'btnSwitchCamp') {
      SFX.click();
      pendingMode = 'normal';
      openCampView();
    }
    if (t.id === 'btnHome') {
      SFX.click();
      goHome();
    }

    if (t.id === 'btnDailyStart') {
      SFX.click();
      closeModal('modalDaily');
      pendingMode = 'daily';
      if (!S.camp) { openCampView(); return; }
      openLineup('daily');
    }

    if (t.id === 'soundBtn') {
      S.sound = !S.sound; save();
      t.textContent = S.sound ? '🔊' : '🔇';
      t.setAttribute('aria-label', S.sound ? '关闭音效' : '开启音效');
      ensureAudio();
      if (S.sound) SFX.click();
    }
    if (t.id === 'ruleBtn') { SFX.click(); openModal('modalRule'); }
  });

  document.addEventListener('pointerdown', ensureAudio, { once: false });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var masks = document.querySelectorAll('.modal-mask.show');
      for (var i = 0; i < masks.length; i++) closeModal(masks[i].id);
    }
  });

  /* ===================== 启动 ===================== */
  S = load() || defaults();
  $('soundBtn').textContent = S.sound ? '🔊' : '🔇';
  $('soundBtn').setAttribute('aria-label', S.sound ? '关闭音效' : '开启音效');
  initMatchup();
  renderHome();
  showLayer('home');
})();
