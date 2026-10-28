// ============================================
// 10 準結晶と貴金属比の置換 ─ フィボナッチ語
// 置換ルール A → A…AB（A が n 個）、B → A をくり返すと、周期のない（でも秩序のある）並びができる
//   n=1：A → AB, B → A（フィボナッチ語）/ n=2：A → AAB / n=3：A → AAAB
// 長いタイル A = φn、短いタイル B = 1 とすると 1 次元の準結晶。下の「回折像」には鋭いピークが立つ
// ←→ = n / ↑↓ = 置換の回数 / スペース = 1 段ずつ育つアニメーション / P = 周期的な並びと比べる
// ============================================

let n = 1;            // ★ 置換の n
let level = 7;        // ★ 何回置換するか
let words = [];       // 各段の文字列
let anim = 0;         // アニメーション（何段目まで表示するか）
let animating = true;
let periodic = false; // P：ABABAB… の周期的な並び
let diff = [];        // 回折像（計算は n・段が変わったときだけ）
let timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  words = ['A'];
  let rule = 'A'.repeat(n) + 'B';
  for (let i = 0; i < level; i++) {
    let w = words[i], out = '';
    for (let ch of w) out += ch === 'A' ? rule : 'A';
    if (out.length > 6000) break;
    words.push(out);
  }
  computeDiffraction();
}

function draw() {
  background(170, 30, 9);
  if (animating) { timer++; if (timer > 35) { timer = 0; anim = anim >= words.length - 1 ? 0 : anim + 1; } }
  else anim = words.length - 1;
  let phi = metallic(n);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('A → ' + 'A'.repeat(n) + 'B,  B → A　n = ' + n + '（←→）　置換 ' + (words.length - 1) + ' 回（↑↓）　スペース：アニメ ' + (animating ? 'ON' : 'off') + '　P：周期的な並びと比べる ' + (periodic ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('どの段も、横幅を φ 倍に広げてタイルを置きかえると次の段になる（自己相似）。A と B の数の比は φ' + n + ' = ' + nf(phi, 1, 5) + ' に近づく', 20, 68);

  // 各段をタイルで描く。段 i の全長を画面幅にそろえる（= 1 段ごとに 1/φ 倍に縮めて見ている）
  let x0 = 30, W = width - 290, rowH = min(34, (height * 0.5 - 100) / words.length);
  for (let i = 0; i <= anim && i < words.length; i++) {
    let w = words[i];
    let total = count(w, 'A') * phi + count(w, 'B');
    let s = W / total, x = x0, y = 100 + i * (rowH + 6);
    if (w.length > 2500) {
      // 長すぎる段は先頭だけを拡大して描く
      s = W / (phi * 600);
    }
    for (let j = 0; j < w.length && x < x0 + W; j++) {
      let L = (w[j] === 'A' ? phi : 1) * s;
      fill(w[j] === 'A' ? color(45, 70, 95) : color(200, 70, 95));
      rect(x, y, max(0.6, L - (L > 4 ? 1 : 0)), rowH);
      if (L > 18) { fill(0, 0, 10); textSize(12); text(w[j], x + L / 2 - 4, y + rowH / 2 + 4); }
      x += L;
    }
    fill(0, 0, 80);
    textSize(12);
    let a = count(w, 'A'), b = count(w, 'B');
    text(a + 'A + ' + b + 'B' + (b ? '　A/B = ' + nf(a / b, 1, 5) : ''), x0 + W + 12, y + rowH / 2 + 4);
  }

  // 回折像（フーリエ変換の強さ）
  let gy = height * 0.58, gh = height * 0.36, gx = 30, gw = width - 60;
  noFill();
  stroke(0, 0, 100, 18);
  rect(gx, gy, gw, gh, 6);
  stroke(periodic ? color(330, 60, 100) : color(50, 80, 100));
  strokeWeight(1.5);
  for (let i = 0; i < diff.length; i++) {
    let x = gx + 10 + i * (gw - 20) / diff.length;
    line(x, gy + gh - 10, x, gy + gh - 10 - diff[i] * (gh - 40));
  }
  noStroke();
  fill(0, 0, 80);
  textSize(14);
  text('回折像：|Σ e^(2πi k x_j)|²（x_j = タイルの境目）。鋭いピーク = 長い距離の秩序。' + (periodic ? '周期的な ABAB… は等間隔のピーク' : '準結晶はピークの位置が φ の割合で並ぶ（等間隔ではない）'), gx + 10, gy + 22);
}

// 回折像を計算（境目の点が多いので最大 1500 点、波数 400 本）
function computeDiffraction() {
  let w = words[words.length - 1].slice(0, 1500);
  if (periodic) w = 'AB'.repeat(750);
  let phi = metallic(n), xs = [], x = 0;
  for (let ch of w) { xs.push(x); x += ch === 'A' ? phi : 1; }
  let mean = x / w.length; // タイル 1 枚の平均の長さ
  diff = [];
  let K = 400, mx = 0;
  for (let i = 1; i <= K; i++) {
    let k = (i / K) * 3 / mean; // 波数 0〜3 / 平均長さ
    let re = 0, im = 0;
    for (let p of xs) { re += Math.cos(TWO_PI * k * p); im += Math.sin(TWO_PI * k * p); }
    let v = (re * re + im * im) / xs.length;
    diff.push(v); mx = Math.max(mx, v);
  }
  for (let i = 0; i < diff.length; i++) diff[i] = Math.sqrt(diff[i] / mx); // 見やすさのため平方根
}

function count(s, ch) { let c = 0; for (let x of s) if (x === ch) c++; return c; }

function keyPressed() {
  if (key === RIGHT_ARROW) { n = min(n + 1, 4); rebuild(); anim = 0; }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); rebuild(); anim = 0; }
  if (key === UP_ARROW) { level = min(level + 1, 12); rebuild(); }
  if (key === DOWN_ARROW) { level = max(level - 1, 1); rebuild(); anim = 0; }
  if (key === ' ') animating = !animating;
  if (key === 'p' || key === 'P') { periodic = !periodic; computeDiffraction(); }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 1 で、各段の文字数 1, 2, 3, 5, 8, 13 … を確かめよう（フィボナッチ数）
// 2. フィボナッチ語に「BB」や「AAA」は出てくる？ 探してみよう
// 3. ルールを A → ABA, B → A などに変えると、比は何に近づく？
// 4. 13 の音のスケッチは、この並びをリズムにして鳴らしている

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
