/* 战绩分享：Web Share / 剪贴板 / Canvas 卡片 */
(function (G) {
  'use strict';

  G.shareText = function () {
    var M = G.M, S = G.S;
    if (!M) return '来玩 102 vs 201 数字对决！';
    var p0 = M.players[0], p1 = M.players[1];
    var won = M.winner === 0;
    var draw = M.winner === 'draw';
    var line;
    if (M.hotseat) {
      var wc = M.winner === 'draw' ? '平局' : (M.winner === 0 ? '102营' : '201营');
      line = '热座对决结束：' + wc + '！' + p0.hp + ' : ' + p1.hp;
    } else if (draw) {
      line = '我在 102vs201 与裁判 X 战成平局（' + p0.hp + ' : ' + p1.hp + '）';
    } else if (won) {
      var kill = M.stats.lastKillCard
        ? '用 ' + M.stats.lastKillCard + ' 造成 ' + M.stats.lastKillDmg + ' 点伤害'
        : '斩杀成功';
      line = '我在 102vs201 代表' + p0.camp + '营获胜！' + kill + '。';
    } else {
      line = '我在 102vs201 惜败裁判 X，再战一局！';
    }
    var r = G.rankOf(S.points);
    return line + ' 段位 ' + r.name + ' · ' + S.wins + '胜' + S.losses + '负。打开 x102201.github.io 来打一局！';
  };

  function drawCard(cb) {
    var M = G.M, S = G.S;
    var cv = document.createElement('canvas');
    cv.width = 420; cv.height = 800;
    var ctx = cv.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(1, '#060a1c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 420, 800);

    ctx.fillStyle = '#e879f9';
    ctx.font = '700 18px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('102  ✕  201', 210, 56);

    var won = M.winner === 0;
    var draw = M.winner === 'draw';
    var title = M.hotseat
      ? (draw ? '平 局' : ((M.winner === 0 ? '102' : '201') + '营获胜'))
      : (draw ? '平 局' : (won ? '胜 利' : '惜 败'));
    ctx.fillStyle = draw ? '#e879f9' : (won || M.hotseat ? '#fbbf24' : '#f87171');
    ctx.font = '800 42px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(title, 210, 130);

    var p0 = M.players[0], p1 = M.players[1];
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 28px "Space Mono", monospace';
    ctx.fillText(p0.camp + '  ' + Math.max(0, p0.hp), 210, 200);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 16px "Space Mono", monospace';
    ctx.fillText('VS', 210, 236);
    ctx.fillStyle = '#fb923c';
    ctx.font = '700 28px "Space Mono", monospace';
    ctx.fillText(p1.camp + '  ' + Math.max(0, p1.hp), 210, 280);

    ctx.fillStyle = '#eaf0f8';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    var kill = M.stats.lastKillCard
      ? ('关键一斩：' + M.stats.lastKillCard + ' · ' + M.stats.lastKillDmg + ' 点')
      : '本局统计：升级 ' + M.stats.upgrades + ' 次';
    ctx.fillText(kill, 210, 340);

    var r = G.rankOf(S.points);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 16px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(r.icon + ' ' + r.name + '  ·  声望 ' + S.points, 210, 390);

    ctx.fillStyle = 'rgba(176,196,220,.8)';
    ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('数字大陆只有 0、1、2', 210, 720);
    ctx.fillText('x102201.github.io', 210, 748);

    if (cv.toBlob) {
      cv.toBlob(function (blob) { cb(cv, blob); }, 'image/png');
    } else {
      cb(cv, null);
    }
  }

  G.shareResult = function () {
    var text = G.shareText();
    function copied() { G.toast('战绩文案已复制，去分享吧！'); }

    function fallbackCopy() {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(copied).catch(function () {
            window.prompt('复制战绩：', text);
          });
        } else {
          window.prompt('复制战绩：', text);
        }
      } catch (e) {
        G.toast(text);
      }
    }

    drawCard(function (cv, blob) {
      if (navigator.share) {
        var data = { title: '102 vs 201 · 数字对决', text: text };
        if (blob && navigator.canShare) {
          try {
            var file = new File([blob], '102vs201.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) data.files = [file];
          } catch (e) {}
        }
        navigator.share(data).catch(function () { fallbackCopy(); });
        return;
      }
      fallbackCopy();
    });
  };
})(window.G102 = window.G102 || {});
