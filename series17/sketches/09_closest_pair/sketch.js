// ============================================
// 09 最近点対：分割統治法
// いちばん近い 2 点を探す。全部の組を調べると n(n−1)/2 回
// ① 縦線で左右半分に分け、それぞれで最近点対を探す（再帰）
// ② 左右の答えの近い方を δ として、縦線から幅 δ の帯の中だけ「境目をまたぐ組」を調べる
//    帯の中では y の順に並べると、各点は次の 7 点までと比べれば十分 → O(n log n)
// 操作：クリック = 点を追加 / スペース = 再生・停止 / → = 1 ステップ / ↑↓ = 速さ
//       R = ランダム / C = 全部消す / 1〜3 = お手本（ランダム・格子・かたまり）
// ============================================

let pts = [];
let N = 48;             // ★ ランダムに置く点の数
let stepsPerFrame = 1;  // ★ 1 フレームに何ステップ
let auto = true, slow = 0;
let gen = null, frames = [], strip = null, cmp = null, best = null, comps = 0, msg = '';

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  pts = [];
  let W = width - 300;
  for (let i = 0; i < N; i++) {
    if (k === 1) pts.push(createVector(random(60, W - 40), random(130, height - 50)));
    if (k === 2) pts.push(createVector(80 + (i % 8) * (W - 160) / 7 + random(-6, 6), 150 + floor(i / 8) * (height - 220) / 5 + random(-6, 6)));
    if (k === 3) { let c = i % 3; pts.push(createVector(W * (0.25 + c * 0.25) + randomGaussian() * 50, height * 0.55 + randomGaussian() * 80)); }
  }
  restart();
}

function restart() {
  frames = []; strip = null; cmp = null; best = null; comps = 0;
  let X = [...pts.keys()].sort((a, b) => pts[a].x - pts[b].x);
  let Y = [...pts.keys()].sort((a, b) => pts[a].y - pts[b].y);
  gen = pts.length >= 2 ? (function* () { best = yield* rec(X, Y, 0); cmp = null; strip = null; msg = `完成！ いちばん近い 2 点の距離 ${best.d.toFixed(1)}`; })() : null;
  msg = pts.length >= 2 ? '' : '点を 2 つ以上置いてください';
}

function d(a, b) { return dist(pts[a].x, pts[a].y, pts[b].x, pts[b].y); }
function better(p, q) { return !p ? q : !q ? p : p.d <= q.d ? p : q; }

// ★ 分割統治（yield のたびに 1 ステップ止まる）
function* rec(X, Y, depth) {
  let frame = { x0: pts[X[0]].x, x1: pts[X[X.length - 1]].x, depth, mid: null, res: null };
  frames.push(frame);
  let res = null;
  if (X.length <= 3) {
    // 3 点以下は全部の組を調べる
    for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
      comps++; cmp = [X[i], X[j]];
      res = better(res, { d: d(X[i], X[j]), a: X[i], b: X[j] });
      msg = `小さい部分（${X.length} 点）は全部の組を調べる`;
      yield;
    }
  } else {
    let m = floor(X.length / 2);
    let midX = (pts[X[m - 1]].x + pts[X[m]].x) / 2;
    frame.mid = midX;
    let left = new Set(X.slice(0, m));
    let XL = X.slice(0, m), XR = X.slice(m);
    let YL = Y.filter((i) => left.has(i)), YR = Y.filter((i) => !left.has(i));
    msg = `${X.length} 点を縦線で ${XL.length} 点と ${XR.length} 点に分ける`; yield;
    let rl = yield* rec(XL, YL, depth + 1);
    let rr = yield* rec(XR, YR, depth + 1);
    res = better(rl, rr);
    let delta = res.d;
    // 帯の中の点（y の順）
    let S = Y.filter((i) => abs(pts[i].x - midX) < delta);
    strip = { midX, delta };
    msg = `左右の答えの小さい方 δ = ${delta.toFixed(1)}。幅 2δ の帯（${S.length} 点）だけ調べる`; yield;
    for (let i = 0; i < S.length; i++) {
      for (let j = i + 1; j < S.length && j <= i + 7 && pts[S[j]].y - pts[S[i]].y < delta; j++) {
        comps++; cmp = [S[i], S[j]];
        let c = { d: d(S[i], S[j]), a: S[i], b: S[j] };
        if (c.d < res.d) { res = c; msg = `境目をまたぐもっと近い組を発見！ ${c.d.toFixed(1)}`; }
        yield;
      }
    }
    strip = null;
  }
  frame.res = res;
  best = better(best, res);
  frames.pop();
  return res;
}

function draw() {
  background(BG);
  if (auto && (stepsPerFrame > 1 || frameCount % 5 === 0)) {   // 速さ 1 のときは 5 フレームに 1 ステップ
    for (let k = 0; k < stepsPerFrame; k++) if (gen && gen.next().done) gen = null;
  }
  // 再帰の枠
  for (let f of frames) {
    noStroke(); fill(240, 163, 255, 14 + f.depth * 6);
    rect(f.x0 - 8, 110, f.x1 - f.x0 + 16, height - 130, 6);
    if (f.mid !== null) { stroke(ORCHID); strokeWeight(f === frames[frames.length - 1] ? 2.5 : 1); line(f.mid, 110, f.mid, height - 20); }
  }
  // 帯
  if (strip) {
    noStroke(); fill(255, 207, 107, 40);
    rect(strip.midX - strip.delta, 110, strip.delta * 2, height - 130);
  }
  // 比べている 2 点
  if (cmp) { stroke(GOLD); strokeWeight(2); line(pts[cmp[0]].x, pts[cmp[0]].y, pts[cmp[1]].x, pts[cmp[1]].y); }
  // いままでの最良
  if (best) {
    stroke(MINT); strokeWeight(4); line(pts[best.a].x, pts[best.a].y, pts[best.b].x, pts[best.b].y);
    noFill(); strokeWeight(1); circle(pts[best.a].x, pts[best.a].y, best.d * 2);
  }
  noStroke();
  pts.forEach((p, i) => {
    fill(best && (i === best.a || i === best.b) ? MINT : cmp && cmp.includes(i) ? GOLD : FG);
    circle(p.x, p.y, 9);
  });

  // パネル
  let px = width - 270, n = pts.length;
  fill(PANEL); rect(px, 20, 250, 240, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17); text('比べた回数', px + 18, 36);
  textSize(15);
  text(`分割統治  ${comps} 回\n全部の組  ${(n * (n - 1)) / 2} 回\n\n再帰の深さ ${frames.length}`, px + 18, 70);
  let bw = 210 / max((n * (n - 1)) / 2, 1);
  fill(MINT); rect(px + 18, 190, comps * bw, 12, 3);
  fill('#4b3a6b'); rect(px + 18, 210, ((n * (n - 1)) / 2) * bw, 12, 3);

  fill(FG); textSize(22); text('最近点対：分けて、境目だけ調べる', 30, 24);
  fill(DIM); textSize(14); text(`クリック 追加   スペース 再生/停止   → 1 ステップ   ↑↓ 速さ（${stepsPerFrame}）   R ランダム   C 消す   1〜3 お手本`, 30, 56);
  fill(GOLD); textSize(17); text(msg, 30, 84);
}

function mousePressed() {
  if (mouseY > 110 && mouseX < width - 280) { pts.push(createVector(mouseX, mouseY)); restart(); }
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { if (gen && gen.next().done) gen = null; return false; }
  if (key === UP_ARROW) { stepsPerFrame = min(stepsPerFrame * 2, 64); return false; }
  if (key === DOWN_ARROW) { stepsPerFrame = max(stepsPerFrame / 2, 1); return false; }
  if (key === 'r' || key === 'R') preset(1);
  if (key === 'c' || key === 'C') { pts = []; restart(); }
  if ('123'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }
