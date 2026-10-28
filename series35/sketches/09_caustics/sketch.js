// ============================================
// 09 光のコースティクス
// コーヒーカップの底に見える明るい曲線や、プールの底でゆれる光の網目 = コースティクス（火線）
//   たくさんの光線が反射・屈折して「重なる」所が明るくなる。その線は折り目（fold）で、とがった点はカスプ
//   光の世界にもカタストロフィーがある（ベリー、ナイ）。光線の束 = 地形、明るい線 = 分岐集合
// 1 = カップ（反射） / 2 = 水面（屈折） / マウス = 光源の位置（1）・光の向き（2） / P = 平行光と点光源（1） / ↑↓ = 光線の数 / スペース = 波を止める（2）
// ============================================

let scene = 1;
let nRays = 500;            // ★ 光線の数
let parallel = true;        // カップ：平行光か点光源か
let waveOn = true;
let t = 0;
let n2 = 1.33;              // ★ 水の屈折率
let waveAmp = 18;           // ★ 波の高さ（px）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 6);
  if (waveOn) t += 0.02;
  blendMode(ADD);
  if (scene === 1) cup(); else water();
  blendMode(BLEND);
  noStroke(); fill(0, 0, 100); textSize(18);
  text((scene === 1 ? '1：カップ（反射）' : '2：水面（屈折）') + '　2 / 1：切りかえ　マウス = ' + (scene === 1 ? '光源' : '光の向き') + '　P：' + (parallel ? '平行光' : '点光源') + '　↑↓：光線 ' + nRays + ' 本　スペース：波 ' + (waveOn ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(scene === 1 ? '平行光ではネフロイド（腎臓形）、光源を縁に置くとカーディオイド（心臓形）。とがった点 = カスプ。光線が「折り返す」包絡線が明るい'
    : '水面のでこぼこがレンズになり、底で光線が交わる所が明るい網目になる。網目の線は折り目、交点の近くにカスプ。波の高さを変えるとどうなる？', 20, 68);
}

// ---- カップ：円の内側の鏡で 1 回反射
function cup() {
  let cx = width / 2, cy = height / 2 + 40, R = min(width, height - 120) * 0.42;
  noFill(); stroke(0, 0, 60); strokeWeight(3); circle(cx, cy, 2 * R);
  let ang = atan2(mouseY - cy, mouseX - cx);
  let S = { x: mouseX, y: mouseY };
  let dS = dist(S.x, S.y, cx, cy);
  if (dS > R * 0.98) { S.x = cx + (S.x - cx) / dS * R * 0.98; S.y = cy + (S.y - cy) / dS * R * 0.98; }
  strokeWeight(1);
  for (let i = 0; i < nRays; i++) {
    let o, d;
    if (parallel) {
      d = { x: -Math.cos(ang), y: -Math.sin(ang) };              // マウスの方から来る平行光
      let s = -R + 2 * R * (i + 0.5) / nRays;
      o = { x: cx - d.x * 2 * R - d.y * s, y: cy - d.y * 2 * R + d.x * s };
    } else {
      let th = TWO_PI * i / nRays;
      d = { x: Math.cos(th), y: Math.sin(th) }; o = { x: S.x, y: S.y };
    }
    // 円との交点（遠い方）= 鏡に当たる点 P
    let ox = o.x - cx, oy = o.y - cy;
    let bq = ox * d.x + oy * d.y, cq = ox * ox + oy * oy - R * R, disc = bq * bq - cq;
    if (disc <= 0) continue;
    let tq = -bq + Math.sqrt(disc);
    let P = { x: o.x + d.x * tq, y: o.y + d.y * tq };
    let tin = parallel ? -bq - Math.sqrt(disc) : 0;
    stroke(50, 30, 100, 4);
    line(o.x + d.x * tin, o.y + d.y * tin, P.x, P.y);
    // ★ 反射：r = d − 2(d・n)n
    let nx = (P.x - cx) / R, ny = (P.y - cy) / R, dn = d.x * nx + d.y * ny;
    let r = { x: d.x - 2 * dn * nx, y: d.y - 2 * dn * ny };
    // 反射した光は次に縁に当たるまで進む（弦の長さ = −2(P−C)・r）
    let L = -2 * ((P.x - cx) * r.x + (P.y - cy) * r.y);
    stroke(40, 70, 100, 9);
    line(P.x, P.y, P.x + r.x * L, P.y + r.y * L);
  }
  if (!parallel) { noStroke(); fill(50, 30, 100); circle(S.x, S.y, 10); }
}

// ---- 水面：上から来た光が波打つ水面で屈折し、底に届く
function water() {
  let top = 110, surfY = height * 0.32, floorY = height - 60;
  let tilt = constrain((mouseX - width / 2) / width, -0.5, 0.5) * 0.6;   // 光の向き
  let h = (x) => surfY + waveAmp * Math.sin(x * 0.012 + t) + waveAmp * 0.6 * Math.sin(x * 0.027 - t * 1.3) + waveAmp * 0.3 * Math.sin(x * 0.051 + t * 0.7);
  let bins = new Array(240).fill(0);
  noStroke(); fill(205, 70, 18); rect(0, surfY, width, floorY - surfY);
  strokeWeight(1);
  for (let i = 0; i < nRays * 2; i++) {
    let x0 = -100 + (width + 200) * (i + 0.5) / (nRays * 2);
    let d = { x: Math.sin(tilt), y: Math.cos(tilt) };
    let xs = x0 + d.x / d.y * (surfY - top), ys = h(xs);
    // 水面の法線（上向き）
    let slope = (h(xs + 0.5) - h(xs - 0.5));
    let nl = Math.hypot(slope, 1), nx = slope / nl, ny = -1 / nl;
    // ★ スネルの法則（ベクトル形）：n1 sinθ1 = n2 sinθ2
    let eta = 1 / n2, c1 = -(d.x * nx + d.y * ny), k = 1 - eta * eta * (1 - c1 * c1);
    if (k < 0) continue;
    let c2 = Math.sqrt(k);
    let rx = eta * d.x + (eta * c1 - c2) * nx, ry = eta * d.y + (eta * c1 - c2) * ny;
    let tt = (floorY - ys) / ry, xf = xs + rx * tt;
    stroke(55, 30, 100, 5); line(xs - d.x / d.y * (ys - top), top, xs, ys);
    stroke(190, 50, 100, 7); line(xs, ys, xf, floorY);
    let bi = Math.floor(xf / width * 240);
    if (bi >= 0 && bi < 240) bins[bi]++;
  }
  // 水面の線
  noFill(); stroke(190, 40, 100, 60); strokeWeight(2);
  beginShape(); for (let x = 0; x <= width; x += 8) vertex(x, h(x)); endShape();
  // 底の明るさ（光線が集まるほど明るい）
  noStroke();
  let mean = nRays * 2 / 240 * (width / (width + 200));
  for (let i = 0; i < 240; i++) {
    let b = min(1, bins[i] / (mean * 4));
    fill(55, 40, 100 * b, 100); rect(i * width / 240, floorY, width / 240 + 1, 40);
  }
}

function keyPressed() {
  if (key === '1') scene = 1;
  if (key === '2') scene = 2;
  if (key === 'p' || key === 'P') parallel = !parallel;
  if (key === ' ') waveOn = !waveOn;
  if (key === UP_ARROW) nRays = min(1500, nRays + 100);
  if (key === DOWN_ARROW) nRays = max(100, nRays - 100);
}

// ---------- やってみよう ----------
// 1. カップで点光源（P）にして、光源を円の縁にぴったり置くとカーディオイド。中心に近づけると？
// 2. 水面で waveAmp を 5 と 40 にして、網目の線がいつ現れるか比べよう（波が小さいと線は底より下で交わる）
// 3. n2 を 2.4（ダイヤモンド）にすると網目はどう変わる？
// 4. ガラスのコップ・スプーン・指輪に光を当てて、本物のコースティクスを探そう。写真と見比べる
