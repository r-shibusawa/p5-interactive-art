// ============================================
// 06 曲面の分類と連結和
// 閉じた曲面は、多角形の辺を 2 本ずつ貼り合わせてつくれる。辺の読み方を「言葉」で書く：a b a⁻¹ b⁻¹ はトーラス
//   言葉から 頂点 V、辺 E、面 F = 1 を数えて χ = V − E + F。向きがつけられるか と χ だけで曲面は全部分類できる
// a〜h = 辺を追加（Shift で逆向き a⁻¹） / Backspace = 1 つ消す / 0 = 全部消す / 1〜6 = 例 / + = トーラスを連結和 / * = 射影平面を連結和
// ============================================

let word = [];                 // [{ l: 'a', e: 1 or -1 }, ...]
let maxLen = 16;               // ★ 言葉の長さの上限
let info = null;
let letterHue = { a: 20, b: 200, c: 120, d: 300, e: 50, f: 260, g: 160, h: 0 };
let presets = {
  1: 'aA', 2: 'abAB', 3: 'aa', 4: 'abaB', 5: 'abABcdCD', 6: 'aabb',
};
let presetNames = { 1: '球面', 2: 'トーラス', 3: '射影平面', 4: 'クラインの壺', 5: 'トーラス # トーラス', 6: '射影平面 # 射影平面' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setWord(presets[2]);
}
function setWord(s) { word = [...s].map((ch) => ({ l: ch.toLowerCase(), e: ch === ch.toLowerCase() ? 1 : -1 })); analyze(); }
function unusedLetter() { return 'abcdefgh'.split('').find((l) => !word.some((w) => w.l === l)); }

// ★ 言葉を調べる：頂点の貼り合わせ（Union-Find）→ V、向き付け可能か、χ
function analyze() {
  info = { ok: false };
  let n = word.length;
  if (n === 0) return;
  let count = {};
  for (let w of word) count[w.l] = (count[w.l] || 0) + 1;
  let bad = Object.keys(count).filter((l) => count[l] !== 2);
  if (bad.length) { info.msg = 'どの文字もちょうど 2 回使う（いま ' + bad.map((l) => l + '：' + count[l] + ' 回').join('、') + '）'; return; }
  let parent = word.map((_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let ends = (i) => (word[i].e > 0 ? [i, (i + 1) % n] : [(i + 1) % n, i]);   // その辺の「矢印の根元・先」の頂点
  let orientable = true;
  for (let l in count) {
    let [i, j] = word.map((w, k) => (w.l === l ? k : -1)).filter((k) => k >= 0);
    let [t1, h1] = ends(i), [t2, h2] = ends(j);
    parent[find(t1)] = find(t2); parent[find(h1)] = find(h2);
    if (word[i].e === word[j].e) orientable = false;     // 同じ向きで 2 回出てくる → メビウスの帯が入っている
  }
  let classes = word.map((_, i) => find(i));
  let V = new Set(classes).size, E = n / 2, F = 1, chi = V - E + F;
  let name;
  if (orientable) { let g = (2 - chi) / 2; name = g === 0 ? '球面' : g === 1 ? 'トーラス' : '穴 ' + g + ' 個のトーラス'; info.sub = g > 1 ? '＝ トーラス ' + g + ' 個の連結和' : ''; info.g = g; }
  else { let k = 2 - chi; name = k === 1 ? '射影平面' : k === 2 ? 'クラインの壺' : '射影平面 ' + k + ' 個の連結和'; info.sub = k === 2 ? '＝ 射影平面 2 つの連結和' : ''; info.k = k; }
  info = Object.assign(info, { ok: true, V, E, F, chi, orientable, name, classes });
}

function draw() {
  background(275, 30, 13);
  let n = word.length, cx = width * 0.3, cy = height * 0.55, R = min(width * 0.24, height * 0.32);
  // 多角形の頂点（左下から反時計回り）
  let P = [];
  for (let i = 0; i < n; i++) { let a = HALF_PI + PI / max(n, 1) + (i * TWO_PI) / max(n, 1); P.push({ x: cx + R * cos(a), y: cy + R * sin(a) }); }
  // 面
  noStroke(); fill(275, 20, 30);
  if (n >= 3) { beginShape(); for (let p of P) vertex(p.x, p.y); endShape(CLOSE); } else if (n === 2) ellipse(cx, cy, R * 1.0, R * 2);
  // 辺
  for (let i = 0; i < n; i++) {
    let A = P[i], B = P[(i + 1) % n], w = word[i], h = letterHue[w.l];
    let bend = n === 2 ? (i === 0 ? 1 : -1) * R * 0.5 : 0;
    let mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    let nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
    let qx = mx + nx * bend, qy = my + ny * bend;
    stroke(h, 80, 100); strokeWeight(6); noFill();
    beginShape();
    for (let s = 0; s <= 1.001; s += 0.05) vertex((1 - s) * (1 - s) * A.x + 2 * s * (1 - s) * qx + s * s * B.x, (1 - s) * (1 - s) * A.y + 2 * s * (1 - s) * qy + s * s * B.y);
    endShape();
    // 矢印（e = −1 なら逆向き）
    let tx = (B.x - A.x) / L * w.e, ty = (B.y - A.y) / L * w.e, ax = n === 2 ? (A.x + 2 * qx + B.x) / 4 : mx, ay = n === 2 ? (A.y + 2 * qy + B.y) / 4 : my;
    for (let s of [-1, 1]) line(ax + tx * 12, ay + ty * 12, ax + tx * 12 - (tx * 22 + s * ty * 14), ay + ty * 12 - (ty * 22 - s * tx * 14));
    noStroke(); fill(h, 70, 100); textSize(26); textAlign(CENTER, CENTER);
    let lx = n === 2 ? ax + (ax - cx) * 0.35 : mx + (mx - cx) * 0.18, ly = n === 2 ? ay : my + (my - cy) * 0.18;
    text(w.l + (w.e < 0 ? '⁻¹' : ''), lx, ly);
  }
  // 頂点（同じ色 = 貼り合わせると同じ 1 点）
  for (let i = 0; i < n; i++) {
    let c = info.ok ? info.classes[i] : 0;
    fill(info.ok ? (c * 67) % 360 : 0, info.ok ? 60 : 0, 100); stroke(0, 0, 0); strokeWeight(2);
    circle(P[i].x, P[i].y, 22);
  }
  textAlign(LEFT, BASELINE); noStroke();
  // 言葉と結果
  let x0 = width * 0.58, y0 = height * 0.22;
  fill(0, 0, 100); textSize(n > 10 ? 24 : 34);
  text('言葉：' + (word.map((w) => w.l + (w.e < 0 ? '⁻¹' : '')).join(' ') || '（空）'), x0, y0);
  textSize(24);
  if (info.ok) {
    text('頂点 V = ' + info.V + '（貼ったあとの点の数）', x0, y0 + 60);
    text('辺 E = ' + info.E + '　面 F = 1', x0, y0 + 96);
    fill(50, 80, 100); text('χ = V − E + F = ' + info.chi, x0, y0 + 140);
    fill(info.orientable ? 140 : 0, 60, 100);
    text(info.orientable ? '向き付け可能（x と x⁻¹ が 1 回ずつ）' : '向き付け不可能（同じ向きの文字がある）', x0, y0 + 180);
    fill(0, 0, 100); textSize(34); text('→ ' + info.name, x0, y0 + 236);
    fill(0, 0, 70); textSize(20); text(info.sub, x0 + 40, y0 + 266);
    drawSurface(x0 + 20, y0 + 310);
  } else if (info.msg) { fill(0, 70, 100); text(info.msg, x0, y0 + 60); }
  fill(0, 0, 100); textSize(18);
  text('a〜h：辺を追加（Shift で逆向き）　Backspace：消す　0：全部消す　1〜6：例　+：トーラスを連結和　*：射影平面を連結和', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('例　1 球面 aa⁻¹　2 トーラス aba⁻¹b⁻¹　3 射影平面 aa　4 クラインの壺 abab⁻¹　5 トーラス#トーラス　6 射影平面#射影平面。連結和 ＝ 言葉をつなげる', 20, 68);
}

// 分類結果の模式図：穴 g 個のドーナツ、または「×」印（クロスキャップ）k 個
function drawSurface(x, y) {
  let k = info.orientable ? info.g : info.k, w = 160 + 120 * max(0, k - 1), h = 120;
  noStroke(); fill(info.orientable ? 200 : 20, 50, 70);
  rect(x, y, w, h, h / 2);
  for (let i = 0; i < k; i++) {
    let hx = x + 80 + i * 120, hy = y + h / 2;
    if (info.orientable) { fill(275, 30, 13); ellipse(hx, hy, 60, 26); }
    else { fill(275, 30, 13); circle(hx, hy, 50); stroke(0, 0, 100); strokeWeight(3); line(hx - 14, hy - 14, hx + 14, hy + 14); line(hx - 14, hy + 14, hx + 14, hy - 14); noStroke(); }
  }
  fill(0, 0, 60); textSize(15);
  text(info.orientable ? '穴の数 g = (2 − χ) / 2 = ' + k : 'クロスキャップ（メビウスの帯を貼った穴）', x, y + h + 30);
  if (!info.orientable) text('の数 = 2 − χ = ' + k, x, y + h + 52);
}

function keyPressed() {
  if (key === 'Backspace') { word.pop(); analyze(); return false; }
  if (key === '0') { word = []; analyze(); }
  if (presets[key]) setWord(presets[key]);
  if (key === '+' || key === ';') {
    let a = unusedLetter(); if (!a || word.length + 4 > maxLen) return;
    word.push({ l: a, e: 1 }); let b = unusedLetter(); if (!b) { word.pop(); return; }
    word.push({ l: b, e: 1 }, { l: a, e: -1 }, { l: b, e: -1 }); analyze();
  }
  if (key === '*' || key === ':') { let a = unusedLetter(); if (a && word.length + 2 <= maxLen) { word.push({ l: a, e: 1 }, { l: a, e: 1 }); analyze(); } }
  if (key.length === 1 && 'abcdefghABCDEFGH'.includes(key) && word.length < maxLen) {
    word.push({ l: key.toLowerCase(), e: key === key.toLowerCase() ? 1 : -1 }); analyze();
  }
}

// ---------- やってみよう ----------
// 1. トーラスに射影平面を連結和すると（2 のあと *）、射影平面 3 つと同じになる。χ で確かめよう
// 2. a b c a⁻¹ b⁻¹ c⁻¹（六角形）は何の曲面？ 頂点の色が何色になるか予想してから打ってみよう
// 3. a b a b は射影平面、a a b b はクラインの壺。どの文字を入れかえると変わる？
// 4. 同じ曲面になる言葉を 2 つ見つけて、「言葉はちがっても曲面は同じ」を体験しよう
