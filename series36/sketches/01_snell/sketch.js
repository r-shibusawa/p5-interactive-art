// ============================================
// 01 スネルの法則と全反射
// 上半分が屈折率 n1、下半分が n2 の 2 つの物質。境界で光は折れ曲がる
//   スネルの法則： n1 sin θ1 = n2 sin θ2    （θ は法線＝境界に垂直な線からはかる）
//   密→疎（n1 > n2）で θ1 が臨界角 sin θc = n2/n1 をこえると屈折光が消える（全反射）
// マウス = 光源の位置（上か下か、入射角） / ←→ = n1 / ↑↓ = n2 / W = 波面 / F = 反射率（フレネル） / 1〜3 = 組み合わせ / R = リセット
// ============================================

let n1 = 1.0, n2 = 1.5;   // ★ 屈折率（空気 1.0、水 1.33、ガラス 1.5、ダイヤ 2.42）
let showWave = true;      // 波面（光の進む速さが変わるのを見る）
let showFresnel = true;   // 反射光の強さをフレネルの式で計算する
let lambda0 = 26;         // ★ 真空中の波長（px）
let t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  let iy = height * 0.55, ox = width * 0.5;
  t += 0.6;
  // 物質を塗る（屈折率が大きいほど青く濃く）
  noStroke();
  fill(210, 20 + (n1 - 1) * 30, 25); rect(0, 0, width, iy);
  fill(210, 20 + (n2 - 1) * 30, 25); rect(0, iy, width, height - iy);
  stroke(0, 0, 100, 60); strokeWeight(1); line(0, iy, width, iy);
  stroke(0, 0, 100, 30); drawDashed(ox, iy - 300, ox, iy + 300);   // 法線

  // 光源 → 境界の点 O へ向かう光
  let fromTop = mouseY < iy;
  let na = fromTop ? n1 : n2, nb = fromTop ? n2 : n1;   // na = 入射側, nb = 透過側
  let sx = mouseX, sy = fromTop ? Math.min(mouseY, iy - 20) : Math.max(mouseY, iy + 20);
  let dx = ox - sx, dy = iy - sy, len = Math.hypot(dx, dy);
  dx /= len; dy /= len;
  let th1 = Math.atan2(Math.abs(dx), Math.abs(dy));     // 入射角（法線から）
  let sinT2 = na / nb * Math.sin(th1);
  let tir = sinT2 > 1;
  let th2 = tir ? 0 : Math.asin(sinT2);
  let sgnX = dx >= 0 ? 1 : -1, sgnY = fromTop ? 1 : -1;
  let rdx = sgnX * Math.sin(th2), rdy = sgnY * Math.cos(th2);   // 屈折光の向き
  let fdx = dx, fdy = -dy;                                       // 反射光の向き

  // フレネルの反射率（s 偏光と p 偏光の平均）
  let R = 1;
  if (!tir) {
    let c1 = Math.cos(th1), c2 = Math.cos(th2);
    let rs = (na * c1 - nb * c2) / (na * c1 + nb * c2);
    let rp = (na * c2 - nb * c1) / (na * c2 + nb * c1);
    R = (rs * rs + rp * rp) / 2;
  }
  if (!showFresnel) R = tir ? 1 : 0.25;

  // 光線を描く
  strokeWeight(3);
  stroke(45, 70, 100); line(sx, sy, ox, iy);
  stroke(45, 70, 100, 15 + 85 * R); line(ox, iy, ox + fdx * 2000, iy + fdy * 2000);
  if (!tir) { stroke(170, 70, 100, 15 + 85 * (1 - R)); line(ox, iy, ox + rdx * 2000, iy + rdy * 2000); }
  if (showWave) {
    drawWavefronts(sx, sy, dx, dy, len, lambda0 / na, t, 45);
    drawWavefronts(ox, iy, fdx, fdy, 500, lambda0 / na, t + len, 45);
    if (!tir) drawWavefronts(ox, iy, rdx, rdy, 500, lambda0 / nb, (t + len) * na / nb, 170);
  }

  // 角度の弧
  noFill(); strokeWeight(2);
  let nAng = fromTop ? -HALF_PI : HALF_PI;            // 入射側の法線の向き
  stroke(45, 90, 100); arcBetween(ox, iy, 60, nAng, Math.atan2(-dy, -dx));
  stroke(45, 90, 100, 60); arcBetween(ox, iy, 75, nAng, Math.atan2(fdy, fdx));
  if (!tir) { stroke(170, 90, 100); arcBetween(ox, iy, 60, -nAng, Math.atan2(rdy, rdx)); }
  noStroke(); fill(45, 20, 100); circle(sx, sy, 14);

  // 臨界角
  let crit = na > nb ? Math.asin(nb / na) : null;
  if (crit !== null) {
    stroke(0, 80, 100, 60); strokeWeight(1);
    let cx = -sgnX * Math.sin(crit), cy = -sgnY * Math.cos(crit);
    drawDashed(ox, iy, ox + cx * 400, iy + cy * 400);
  }

  // HUD
  noStroke(); fill(0, 0, 100); textSize(18);
  text('n1 = ' + nf(n1, 1, 2) + '（←→）　n2 = ' + nf(n2, 1, 2) + '（↑↓）　W：波面 ' + (showWave ? 'ON' : 'off') + '　F：フレネル ' + (showFresnel ? 'ON' : 'off') + '　1：空気→水　2：空気→ガラス　3：ガラス→空気', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('マウスで光源を動かす（境界の上と下どちらにも置ける）。黄 = 入射・反射光、水色 = 屈折光。赤の点線 = 臨界角', 20, 68);

  let px = width - 470, py = height - 200;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 455, 185, 10);
  fill(0, 0, 100); textSize(16);
  text('入射側 n = ' + nf(na, 1, 2) + '　θ1 = ' + nf(degrees(th1), 1, 1) + '°', px, py);
  if (tir) { fill(0, 80, 100); text('全反射！　n sin θ1 = ' + nf(na * Math.sin(th1), 1, 3) + ' > ' + nf(nb, 1, 2), px, py + 28); }
  else {
    text('透過側 n = ' + nf(nb, 1, 2) + '　θ2 = ' + nf(degrees(th2), 1, 1) + '°', px, py + 28);
    fill(45, 90, 100);
    text('n1 sin θ1 = ' + nf(na, 1, 2) + ' × ' + nf(Math.sin(th1), 1, 3) + ' = ' + nf(na * Math.sin(th1), 1, 3), px, py + 60);
    text('n2 sin θ2 = ' + nf(nb, 1, 2) + ' × ' + nf(Math.sin(th2), 1, 3) + ' = ' + nf(nb * Math.sin(th2), 1, 3), px, py + 84);
  }
  fill(0, 0, 70); textSize(14);
  text('反射率 R = ' + nf(R * 100, 1, 1) + '%　透過率 ' + nf((1 - R) * 100, 1, 1) + '%' + (crit !== null ? '　臨界角 θc = ' + nf(degrees(crit), 1, 1) + '°' : '　（疎→密では全反射しない）'), px, py + 116);
  text('光の速さ：入射側 c/' + nf(na, 1, 2) + '　透過側 c/' + nf(nb, 1, 2) + '　→ 波長も 1/n 倍（波面の間隔）', px, py + 140);
}

// 光線に直角な短い線（波面）を波長の間隔で描く
function drawWavefronts(x, y, dx, dy, len, lam, phase, hue) {
  stroke(hue, 40, 100, 50); strokeWeight(1.5);
  let off = ((phase % lam) + lam) % lam;
  for (let s = off; s < len; s += lam) {
    let px = x + dx * s, py = y + dy * s;
    line(px - dy * 10, py + dx * 10, px + dy * 10, py - dx * 10);
  }
}
function arcBetween(x, y, r, a1, a2) {
  let d = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
  beginShape();
  for (let k = 0; k <= 16; k++) { let a = a1 + d * k / 16; vertex(x + r * Math.cos(a), y + r * Math.sin(a)); }
  endShape();
}
function drawDashed(x1, y1, x2, y2) {
  let d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(d / 12));
  for (let i = 0; i < n; i += 2) line(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n);
}

function keyPressed() {
  if (key === LEFT_ARROW) n1 = Math.max(1, n1 - 0.05);
  if (key === RIGHT_ARROW) n1 = Math.min(2.5, n1 + 0.05);
  if (key === DOWN_ARROW) n2 = Math.max(1, n2 - 0.05);
  if (key === UP_ARROW) n2 = Math.min(2.5, n2 + 0.05);
  if (key === 'w' || key === 'W') showWave = !showWave;
  if (key === 'f' || key === 'F') showFresnel = !showFresnel;
  if (key === '1') { n1 = 1.0; n2 = 1.33; }
  if (key === '2') { n1 = 1.0; n2 = 1.5; }
  if (key === '3') { n1 = 1.5; n2 = 1.0; }
  if (key === 'r' || key === 'R') { n1 = 1.0; n2 = 1.5; }
}

// ---------- やってみよう ----------
// 1. 光源を下（ガラス側）に置いて、横へ動かすと屈折光が消える瞬間がある。そのときの θ1 と臨界角を比べよう
// 2. n1 = n2 にすると何が起きる？（境界が「ない」のと同じ）
// 3. 波面（W）を見る：密な物質の中では間隔が狭い = 進むのが遅い。屈折はこの速さの違いから生まれる
// 4. F を押して反射率を見る。θ1 = 90° に近づくと鏡のように反射する（夕方の水面がまぶしい理由）
