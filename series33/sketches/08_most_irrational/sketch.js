// ============================================
// 08 最も無理な数 ─ 分数で近似しにくい数
// 分母 q の分数 p/q で x を近似したときの「誤差 × q²」= q²·|x − p/q| を、q = 1, 2, 3 … について点で打つ
// フルヴィッツの定理：どんな無理数も q²|x − p/q| < 1/√5 を無限回みたす。φ は 1/√5 より良くならない = いちばん近似しにくい
// 貴金属比 φn では下限が 1/√(n²+4) に近づく。π は 355/113 で急に 0 近くまで落ちる
// マウスを点に重ねる = その分数 / スペース = 一時停止 / ↑↓ = 分母の上限 / R = やり直す
// ============================================

let Qmax = 3000;          // ★ 分母の上限
let q = 1;                // いま何番目の分母まで調べたか
let paused = false;
let layer;                // 点を描きためる層
let bands = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bands = [
    { name: 'φ1 黄金比', v: metallic(1), hue: 45, bound: 1 / Math.sqrt(5) },
    { name: 'φ2 白銀比 1+√2', v: metallic(2), hue: 200, bound: 1 / Math.sqrt(8) },
    { name: 'φ3 青銅比', v: metallic(3), hue: 25, bound: 1 / Math.sqrt(13) },
    { name: 'e', v: Math.E, hue: 120, bound: -1 },
    { name: 'π', v: Math.PI, hue: 330, bound: -1 },
  ];
  restart();
}

function restart() {
  if (layer) layer.remove();
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.noStroke();
  q = 1;
  for (let b of bands) b.best = [];
}

// 帯 i の位置
function bandRect(i) {
  let top = 100, h = (height - top - 30) / bands.length;
  return { x: 230, y: top + i * h, w: width - 260, h: h - 12 };
}
function qToX(r, qq) { return r.x + (Math.log(qq) / Math.log(Qmax)) * r.w; }
function vToY(r, v) { return r.y + r.h - constrain(v / 0.5, 0, 1) * r.h; }

function draw() {
  background(260, 25, 9);
  // 1 フレームに 40 個ずつ分母を増やし、層に点を打つ
  if (!paused) {
    for (let s = 0; s < 40 && q <= Qmax; s++, q++) {
      for (let i = 0; i < bands.length; i++) {
        let b = bands[i], r = bandRect(i);
        let p = Math.round(q * b.v);
        let e = q * q * Math.abs(b.v - p / q);
        if (e < 0.5) {
          layer.fill(b.hue, 70, 100, 90);
          layer.circle(qToX(r, q), vToY(r, e), 6);
        }
        // 記録更新（それまでで一番よい近似）
        let last = b.best.length ? b.best[b.best.length - 1] : null;
        if (!last || Math.abs(b.v - p / q) < Math.abs(b.v - last.p / last.q)) b.best.push({ p, q, e });
      }
    }
  }
  // 帯の枠と基準線
  for (let i = 0; i < bands.length; i++) {
    let b = bands[i], r = bandRect(i);
    noFill();
    stroke(0, 0, 100, 15);
    rect(r.x, r.y, r.w, r.h, 4);
    stroke(0, 0, 100, 40);
    drawingContext.setLineDash([4, 6]);
    line(r.x, vToY(r, 1 / Math.sqrt(5)), r.x + r.w, vToY(r, 1 / Math.sqrt(5)));
    if (b.bound > 0) { stroke(b.hue, 80, 100, 80); line(r.x, vToY(r, b.bound), r.x + r.w, vToY(r, b.bound)); }
    drawingContext.setLineDash([]);
    noStroke();
    fill(b.hue, 60, 100);
    textSize(16);
    text(b.name, 20, r.y + 24);
    fill(0, 0, 70);
    textSize(13);
    text('x = ' + nf(b.v, 1, 6), 20, r.y + 44);
    if (b.bound > 0) text('下限 1/√(n²+4) = ' + nf(b.bound, 1, 3), 20, r.y + 62);
    let last = b.best[b.best.length - 1];
    if (last) text('最良 ' + last.p + '/' + last.q, 20, r.y + (b.bound > 0 ? 80 : 62));
  }
  image(layer, 0, 0);

  // マウスの下の点を調べる
  for (let i = 0; i < bands.length; i++) {
    let r = bandRect(i);
    if (mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h) {
      let qq = round(Math.exp(((mouseX - r.x) / r.w) * Math.log(Qmax)));
      qq = constrain(qq, 1, Qmax);
      let b = bands[i], p = Math.round(qq * b.v), e = qq * qq * Math.abs(b.v - p / qq);
      stroke(0, 0, 100, 60);
      line(qToX(r, qq), r.y, qToX(r, qq), r.y + r.h);
      noStroke();
      fill(0, 0, 100);
      textSize(14);
      text(p + '/' + qq + '　q²|x − p/q| = ' + nf(e, 1, 4), min(mouseX + 10, width - 260), r.y + 18);
    }
  }

  fill(0, 0, 100);
  textSize(18);
  text('q = 1 〜 ' + min(q, Qmax) + '（上限 ' + Qmax + '、↑↓）　横軸 = 分母 q（対数）、縦軸 = q²·|x − p/q|（0〜0.5）　スペース：停止　R：やり直す', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('白の点線 = 1/√5 ≈ 0.447（フルヴィッツの限界）。下に落ちる点が多いほど分数で近似しやすい数。φ の点は 0.447 の線にはりついて、それより下へはほとんど行けない', 20, 68);
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) { Qmax = min(20000, Qmax * 2); restart(); }
  if (key === DOWN_ARROW) { Qmax = max(200, floor(Qmax / 2)); restart(); }
  if (key === 'r' || key === 'R') restart();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); restart(); }

// ---------- やってみよう ----------
// 1. π の帯で 0 近くまで落ちる点を探し、マウスで分数を読もう（22/7、355/113）
// 2. e の帯は点がだんだん 0 に近づいていく。e の連分数 [2; 1, 2, 1, 1, 4, 1, 1, 6, …] と関係がある
// 3. bands に √3 や (1+√5)/2 + 1 を足すと、φ と同じ下限になるのはどれ？（連分数がいつか 1 ばかりになる数）
// 4. 07 のひまわり：角度が「近似しにくい」ほど種がすき間なく並ぶ理由を説明してみよう

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
