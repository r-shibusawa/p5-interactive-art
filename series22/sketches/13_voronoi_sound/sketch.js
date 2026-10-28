// ============================================
// 13 ボロノイを聞く
// セル 1 つ 1 つが「鍵盤」。動くカーソルが新しいセルに入るたびに、そのセルの音が鳴る
//   音の高さ：1 = サイトの高さ（上ほど高い音）/ 2 = セルの面積（広いほど低い音）。サイトはゆっくり漂うので、メロディが変わり続ける
// クリックで音をスタート（もう一度クリック = サイトを追加）/ M = マウスで弾く ⇄ 自動 / 1・2 = 音の決め方 / ↑↓ = カーソルの速さ / スペース = 漂う ON/OFF / R = やり直し
// ============================================

let sites = [];
let nSites = 14;          // ★ セルの数
let cells = [];
let pen = { x: 0, y: 0 }, cur = -1;   // カーソルと、今いるセル
let useMouse = false;
let pitchMode = 1;
let tSpeed = 1;           // ★ 自動カーソルの速さ
let tt = 0;
let drift = true;
let glow = [];            // セルの光り具合
let trail = [];
let bounds;
let penta = [0, 2, 4, 7, 9];   // ★ 音階（ペンタトニック：どう弾いてもきれいに聞こえる）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bounds = { x0: 0, y0: 90, x1: width, y1: height };
  reset();
}
function reset() {
  sites = [];
  for (let i = 0; i < nSites; i++) addSite(random(bounds.x0 + 40, bounds.x1 - 40), random(bounds.y0 + 40, bounds.y1 - 40));
}
function addSite(x, y) {
  let a = random(TWO_PI);
  sites.push({ x, y, vx: cos(a) * 0.4, vy: sin(a) * 0.4, hue: random(360) });
  glow.push(0);
}

// ★ セル i の音の高さ（Hz）
function noteFreq(i) {
  let k;
  if (pitchMode === 1) k = floor(map(sites[i].y, bounds.y1, bounds.y0, 0, 15));           // 上ほど高い
  else {
    let a = polyArea(cells[i]) / ((bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0));
    k = floor(constrain(map(log(a + 1e-6), log(0.2), log(0.005), 0, 15), 0, 15));    // 広いほど低い
  }
  k = constrain(k, 0, 15);
  let semi = 12 * floor(k / 5) + penta[k % 5];
  return 220 * pow(2, semi / 12);
}

function draw() {
  background(230, 25, 12);
  // サイトが漂う
  if (drift) for (let s of sites) {
    s.x += s.vx; s.y += s.vy;
    if (s.x < bounds.x0 + 20 || s.x > bounds.x1 - 20) s.vx *= -1;
    if (s.y < bounds.y0 + 20 || s.y > bounds.y1 - 20) s.vy *= -1;
    s.x = constrain(s.x, bounds.x0 + 20, bounds.x1 - 20); s.y = constrain(s.y, bounds.y0 + 20, bounds.y1 - 20);
  }
  cells = sites.map((s, i) => voronoiCell(sites, i, bounds.x0, bounds.y0, bounds.x1, bounds.y1));

  // カーソル：自動ならリサジュー曲線、M でマウス
  if (useMouse) { pen.x = mouseX; pen.y = constrain(mouseY, bounds.y0, bounds.y1); }
  else {
    tt += 0.008 * tSpeed;
    pen.x = width / 2 + (width / 2 - 60) * sin(tt * 1.3);
    pen.y = (bounds.y0 + bounds.y1) / 2 + ((bounds.y1 - bounds.y0) / 2 - 40) * sin(tt * 2.1 + 0.5);
  }
  // 今いるセル = いちばん近いサイト。変わったら音を鳴らす
  let best = -1, bd = Infinity;
  for (let i = 0; i < sites.length; i++) { let d = (pen.x - sites[i].x) ** 2 + (pen.y - sites[i].y) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best !== cur && best >= 0) {
    cur = best; glow[best] = 1;
    playNote(noteFreq(best), 0.6, 0.25, pitchMode === 1 ? 'triangle' : 'sine');
  }

  for (let i = 0; i < sites.length; i++) {
    glow[i] *= 0.94;
    fill(sites[i].hue, 50, 30 + 60 * glow[i]); stroke(0, 0, 100, 40 + 50 * glow[i]); strokeWeight(1.5 + 3 * glow[i]);
    beginShape(); for (let p of cells[i]) vertex(p.x, p.y); endShape(CLOSE);
    noStroke(); fill(0, 0, 100); circle(sites[i].x, sites[i].y, 7);
    fill(0, 0, 100, 60); textSize(12); text(nf(noteFreq(i), 1, 0) + 'Hz', sites[i].x + 6, sites[i].y - 6);
  }
  trail.push({ x: pen.x, y: pen.y });
  if (trail.length > 60) trail.shift();
  noFill(); stroke(50, 90, 100, 60); strokeWeight(2);
  beginShape(); for (let p of trail) vertex(p.x, p.y); endShape();
  noStroke(); fill(50, 90, 100); circle(pen.x, pen.y, 14);

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　M：' + (useMouse ? 'マウスで弾く' : '自動') + '　1・2：音の高さ = ' + (pitchMode === 1 ? 'サイトの高さ' : 'セルの面積') + '　↑↓：速さ　スペース：漂う ' + (drift ? 'ON' : 'off') + '　クリック：サイト追加　R：やり直し', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('黄色のカーソルが境界（2 つのサイトから等距離の線）をまたぐたびに 1 音。セルが小さい所は速いフレーズ、大きい所はゆったり。音階はペンタトニック', 20, 68);
}

function mousePressed() {
  let first = !audioCtx;
  startAudio();
  if (!first && mouseY > bounds.y0 && sites.length < 40) addSite(mouseX, mouseY);
}
function keyPressed() {
  startAudio();
  if (key === 'm' || key === 'M') useMouse = !useMouse;
  if (key === '1') pitchMode = 1;
  if (key === '2') pitchMode = 2;
  if (key === UP_ARROW) tSpeed = min(5, tSpeed + 0.5);
  if (key === DOWN_ARROW) tSpeed = max(0.5, tSpeed - 0.5);
  if (key === ' ') drift = !drift;
  if (key === 'r' || key === 'R') { glow = []; reset(); cur = -1; }
}

// ---------- やってみよう ----------
// 1. penta を [0, 2, 3, 7, 8]（和風の音階）や [0, 4, 7]（和音だけ）に変えてみよう
// 2. カーソルを 2 つにして、2 声のメロディにしよう（2 つ目は別の音色で）
// 3. 面積モード（2）で、06 のロイド緩和を少しずつかけると、セルの大きさがそろって同じ音ばかりになる？
// 4. カーソルではなく「サイト同士が近づいたら」鳴らすと、どんな音楽になる？


// ==================================================
// ここから下は「ボロノイ図の道具」（ほかのスケッチにもそのままコピーして使える）
//   voronoiCell(sites, i, x0, y0, x1, y1) … サイト i の領域（多角形）。長方形を垂直二等分線で切っていく（O(n²)）
//   delaunay(pts) … ドロネー三角形分割（Bowyer–Watson 法）。[[i, j, k], ...] を返す
//   circumcircle(a, b, c) … 外接円 {x, y, r2}（r2 = 半径の 2 乗）
//   polyArea(poly) / polyCentroid(poly) … 多角形の面積と重心
// ==================================================
function voronoiCell(sites, i, x0, y0, x1, y1) {
  let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  let a = sites[i];
  for (let j = 0; j < sites.length && poly.length > 2; j++) {
    if (j === i) continue;
    let b = sites[j];
    // a の側 ＝ (b − a)・p ≦ (|b|² − |a|²) / 2　（a と b の垂直二等分線で切る）
    poly = clipHalfPlane(poly, b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
  }
  return poly;
}
// nx·x + ny·y ≦ c の側だけ残す（Sutherland–Hodgman の 1 本分）
function clipHalfPlane(poly, nx, ny, c) {
  let out = [];
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length];
    let dp = nx * p.x + ny * p.y - c, dq = nx * q.x + ny * q.y - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      let t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
function polyArea(poly) {
  let s = 0;
  for (let k = 0; k < poly.length; k++) { let p = poly[k], q = poly[(k + 1) % poly.length]; s += p.x * q.y - q.x * p.y; }
  return Math.abs(s) / 2;
}
function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length], cr = p.x * q.y - q.x * p.y;
    a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0;
    for (let p of poly) { sx += p.x; sy += p.y; }
    return poly.length ? { x: sx / poly.length, y: sy / poly.length } : { x: 0, y: 0 };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
function circumcircle(a, b, c) {
  let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, r2: Infinity };
  let a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  let x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  let y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) };
}
// Bowyer–Watson：点を 1 つずつ入れ、「外接円の中に新しい点がある三角形」を消して穴を新しい点とつなぐ
function delaunay(pts) {
  let n = pts.length;
  if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  let m = Math.max(x1 - x0, y1 - y0, 1) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let P = pts.concat([{ x: cx - m, y: cy - m }, { x: cx + m, y: cy - m }, { x: cx, y: cy + m }]);   // 全部を囲む大きな三角形
  let mk = (i, j, k) => ({ v: [i, j, k], c: circumcircle(P[i], P[j], P[k]) });
  let tris = [mk(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let p = P[i], edges = new Map(), keep = [];
    for (let t of tris) {
      if ((p.x - t.c.x) * (p.x - t.c.x) + (p.y - t.c.y) * (p.y - t.c.y) < t.c.r2) {
        for (let e = 0; e < 3; e++) {
          let a = t.v[e], b = t.v[(e + 1) % 3], id = a < b ? a + '_' + b : b + '_' + a;
          if (edges.has(id)) edges.delete(id); else edges.set(id, [a, b]);   // 2 回出た辺 = 穴の内側なので消す
        }
      } else keep.push(t);
    }
    for (let [a, b] of edges.values()) keep.push(mk(a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.v[0] < n && t.v[1] < n && t.v[2] < n).map((t) => t.v);
}


// ==================================================
// ここから下は「音を鳴らすための道具」（Web Audio。p5.sound は使わない）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音だけ鳴らす：高さ freq（Hz）、長さ dur（秒）、大きさ vol（0〜1）、波形 type
function playNote(freq, dur, vol, type) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.value = constrain(freq, 30, 4000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(constrain(vol, 0.001, 1), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}
