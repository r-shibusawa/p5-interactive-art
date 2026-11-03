// ============================================
// 15 カメラのマトロイド（おまけ）
// カメラ映像の「明るい点」を台集合の要素にして、点どうしを結ぶグラフ的マトロイドの基（全域木）をリアルタイムに描く
//   T：最小全域木（辺の重み = 距離）　B：最大重み全域木（辺の重み = 両端の明るさ。貪欲法で明るい辺から採用）
//   明るさを「重み」として貪欲法が毎フレーム走る。ライトや白い紙を動かすと木がついてくる（カメラの許可が必要）
// M = 距離 ⇄ 明るさ / ←→ = 明るさのしきい値 / ↑↓ = 点の数 / V = 映像の表示 / カメラ不可時はノイズ点群
// ============================================

let cap;
let vw = 96, vh = 72;                // ★ カメラ画像の大きさ（小さいほど速い）
let maxPts = 40;                     // ★ 点の数の上限
let thr = 150;                       // ★ 明るさのしきい値（0〜255）
let minGap = 4;                      // ★ 点どうしの最小間隔（カメラ画素）
let byBright = false;                // false = 距離の最小全域木, true = 明るさの最大全域木
let showVideo = true;
let pts = [];                        // {x, y, b}  画面座標と明るさ
let tree = [];                       // 採用した辺 [{a, b, w}]
let fallback = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
}

// ★ 映像から明るい点を集める（3×3 の中でいちばん明るい画素だけ）
function findBrightPoints() {
  cap.loadPixels();
  if (cap.width === 0 || cap.pixels.length < vw * vh * 4) return null;
  let px = cap.pixels, bright = new Float32Array(vw * vh);
  for (let i = 0; i < vw * vh; i++) bright[i] = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  let cands = [];
  for (let y = 1; y < vh - 1; y++) for (let x = 1; x < vw - 1; x++) {
    let b = bright[x + y * vw];
    if (b < thr) continue;
    let isMax = true;
    for (let dy = -1; dy <= 1 && isMax; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && bright[x + dx + (y + dy) * vw] > b) { isMax = false; break; }
    if (isMax) cands.push({ x, y, b });
  }
  cands.sort((p, q) => q.b - p.b);
  let out = [];
  for (let c of cands) {
    if (out.length >= maxPts) break;
    if (out.every((o) => abs(o.x - c.x) + abs(o.y - c.y) >= minGap)) out.push(c);
  }
  let sx = width / vw, sy = height / vh;
  return out.map((c) => ({ x: c.x * sx, y: c.y * sy, b: c.b }));
}
// カメラが使えないとき：ゆらゆら動くノイズ点群
function noisePoints() {
  let out = [], t = frameCount * 0.004;
  for (let i = 0; i < maxPts; i++) {
    out.push({ x: noise(i * 10.3, t) * width, y: noise(i * 7.7 + 50, t) * height, b: 120 + 135 * noise(i * 3.1 + 100, t * 2) });
  }
  return out;
}

// ★ 貪欲法：辺を重み順に並べ、閉路ができないものだけ採用（クラスカル）
function buildTree() {
  let n = pts.length, cand = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let d = dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
    cand.push({ a: i, b: j, w: byBright ? (pts[i].b + pts[j].b) / 2 - d * 0.05 : d });
  }
  cand.sort((p, q) => byBright ? q.w - p.w : p.w - q.w);
  let uf = makeUF(n);
  tree = [];
  for (let e of cand) if (uf.union(e.a, e.b)) tree.push(e);
}

function draw() {
  background(0, 0, 5);
  let found = frameCount % 2 === 0 ? findBrightPoints() : undefined;
  if (found === null) { if (frameCount > 180) fallback = true; } else if (found) { fallback = false; }
  if (fallback) { if (frameCount % 2 === 0) { pts = noisePoints(); buildTree(); } }
  else if (found) { pts = found; buildTree(); }

  if (showVideo && cap.width > 0 && !fallback) { tint(0, 0, 100, 45); image(cap, 0, 0, width, height); noTint(); }

  // 木の辺（明るさで色）
  for (let e of tree) {
    let p = pts[e.a], q = pts[e.b], b = (p.b + q.b) / 2;
    stroke(map(b, thr, 255, 200, 50), 80, 100, 90); strokeWeight(map(b, thr, 255, 1.5, 5));
    line(p.x, p.y, q.x, q.y);
  }
  for (let p of pts) { noStroke(); fill(map(p.b, thr, 255, 200, 50), 70, 100); circle(p.x, p.y, map(p.b, thr, 255, 6, 18)); }

  textAlign(LEFT, BASELINE);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('M：' + (byBright ? '明るさの最大全域木' : '距離の最小全域木') + '　←→：しきい値 ' + thr + '　↑↓：点の数 ' + maxPts + '　V：映像 ' + (showVideo ? 'ON' : 'off') + (fallback ? '　（カメラなし → ノイズ点群）' : cap.width > 0 ? '' : '　カメラ待ち…'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('点 ' + pts.length + '　辺 ' + tree.length + '　階数 = 点の数 − 1。明るい点が要素、貪欲法が毎フレーム基を選び直す。スマホのライトを 2〜3 個動かしてみよう', 20, 66);
}

function keyPressed() {
  if (key === 'm' || key === 'M') byBright = !byBright;
  if (key === RIGHT_ARROW) thr = min(250, thr + 10);
  if (key === LEFT_ARROW) thr = max(40, thr - 10);
  if (key === UP_ARROW) maxPts = min(80, maxPts + 5);
  if (key === DOWN_ARROW) maxPts = max(5, maxPts - 5);
  if (key === 'v' || key === 'V') showVideo = !showVideo;
}

// ---------- やってみよう ----------
// 1. 部屋を暗くしてライトを 3 つ動かす：木の形が「3 本の枝」になる。ライトを近づけると枝がつなぎ変わる瞬間を見る
// 2. B（明るさ）モードで、明るさの順に辺を採用するのに「遠い辺」が選ばれることがある。なぜ？（独立なら採用、が貪欲法の全て）
// 3. 点の数を 80 にして最大全域木にすると、1 フレームの辺の候補は 80×79/2 = 3160 本。何点まで 60fps で動く？
// 4. 13 の音を足す：採用された辺の明るさを音の高さに。14 のブラシの点をカメラの点に置きかえる

// ==================================================
// ここから下は「マトロイドの道具」（union–find）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
