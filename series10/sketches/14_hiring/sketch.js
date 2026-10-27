// ============================================
// 14 雇用問題とランダムな並べかえ
// 1：雇用問題。候補者が 1 人ずつ来て、今までで一番良ければ雇う（そのたびに費用）。何回雇う？
//    悪い順に来ると毎回雇う（n 回）。ランダムな順なら平均 1 + 1/2 + … + 1/n ≈ ln n 回（指示確率変数）
// 2：かたよりのないシャッフル。RANDOMIZE-IN-PLACE（i 番目を i〜末尾のどれかと交換）は 6 通りが同じ確率。
//    「どれとでも交換」するまちがった版は、かたよる
// 3：オンライン雇用。最初の k 人は見るだけ、その後は「今までより良い人」で即決。
//    k = n/e（約 37%）のとき、最高の人を選べる確率が最大（約 1/e）
// 1〜3：モード　スペース：1 回試す　A：1000 回まとめて試す　R：リセット
// ============================================

let n = 20;              // ★ 候補者の人数
let mode = 1, trials = 0, hist = [], last = null, permCount = {}, sortCount = {}, wrongCount = {}, online = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetStats();
}

function resetStats() {
  trials = 0; hist = new Array(n + 1).fill(0); last = null; permCount = {}; sortCount = {}; wrongCount = {};
  online = Array.from({ length: n }, () => ({ win: 0, tries: 0 }));
}

function randomizeInPlace(arr) {     // その場でシャッフル（フィッシャー＝イェーツ）
  for (let i = 0; i < arr.length; i++) { let j = floor(random(i, arr.length)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function permuteBySorting(arr) {      // 番号をつけて並べかえるシャッフル：ランダムな番号（1〜n³）をつけて番号順に
  let pr = arr.map(v => ({ v, p: floor(random(1, Math.pow(arr.length, 3) + 1)) }));
  return pr.sort((x, y) => x.p - y.p).map(o => o.v);
}
function wrongShuffle(arr) {          // まちがった版：どれとでも交換（かたよる）
  for (let i = 0; i < arr.length; i++) { let j = floor(random(arr.length)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function trial() {
  trials++;
  if (mode === 1) {
    let q = randomizeInPlace([...Array(n).keys()].map(i => i + 1));
    let best = 0, hires = [];
    for (let i = 0; i < n; i++) if (q[i] > best) { best = q[i]; hires.push(i); }
    hist[hires.length]++;
    last = { q, hires };
  }
  if (mode === 2) {
    let p = randomizeInPlace([1, 2, 3]).join(''), w = wrongShuffle([1, 2, 3]).join('');
    permCount[p] = (permCount[p] || 0) + 1;
    let ps = permuteBySorting([1, 2, 3]).join(''); sortCount[ps] = (sortCount[ps] || 0) + 1;
    wrongCount[w] = (wrongCount[w] || 0) + 1;
  }
  if (mode === 3) {
    let q = randomizeInPlace([...Array(n).keys()].map(i => i + 1));
    for (let k = 0; k < n; k++) {
      let seen = 0; for (let i = 0; i < k; i++) seen = max(seen, q[i]);
      let pick = n - 1; for (let i = k; i < n; i++) if (q[i] > seen) { pick = i; break; }
      online[k].tries++; if (q[pick] === n) online[k].win++;
    }
    last = { q };
  }
}

function draw() {
  background(30, 25, 9);
  let L = 60, W = width - 120;
  noStroke(); textAlign(LEFT, BASELINE);
  if (mode === 1) {
    if (last) {
      let w = W / n;
      for (let i = 0; i < n; i++) {
        let hired = last.hires.includes(i);
        fill(hired ? color(140, 70, 90) : color(30, 20, 40));
        let h = last.q[i] * 8;
        rect(L + i * w + 3, 300 - h, w - 6, h, 4);
        if (hired) { fill(140, 80, 100); textAlign(CENTER, TOP); textSize(12); text('雇う', L + i * w + w / 2, 306); }
      }
      textAlign(LEFT, BASELINE); fill(0, 0, 80); textSize(15);
      text('この回：' + last.hires.length + ' 回雇った（棒の高さ = 能力、来た順に左から）', L, 130);
    }
    // ヒストグラム
    let maxH = max(1, ...hist), hw = W / (n + 1), by = height - 80, hh = height - 460;
    for (let k = 0; k <= n; k++) { fill(200, 60, 85); rect(L + k * hw + 2, by - hist[k] / maxH * hh, hw - 4, hist[k] / maxH * hh); fill(0, 0, 55); textAlign(CENTER, TOP); textSize(11); text(k, L + k * hw + hw / 2, by + 4); }
    let Hn = 0; for (let i = 1; i <= n; i++) Hn += 1 / i;
    let mean = trials ? hist.reduce((s, c, k) => s + c * k, 0) / trials : 0;
    stroke(45, 90, 100); strokeWeight(2); line(L + Hn * hw + hw / 2, by - hh - 10, L + Hn * hw + hw / 2, by);
    noStroke(); fill(45, 90, 100); textAlign(LEFT, BASELINE); textSize(15);
    text('理論の平均 H_n = 1 + 1/2 + … + 1/' + n + ' = ' + Hn.toFixed(2) + '（≈ ln n = ' + log(n).toFixed(2) + '）　実際の平均 ' + mean.toFixed(2) + '（' + trials + ' 回）', L, by - hh - 20);
  }
  if (mode === 2) {
    let ps = ['123', '132', '213', '231', '312', '321'];
    let bw = W / 21;
    for (let side = 0; side < 3; side++) {
      let cnt = [permCount, sortCount, wrongCount][side], x0 = L + side * W / 3;
      fill(0, 0, 90); textSize(16);
      text(['RANDOMIZE-IN-PLACE（正しい）', 'PERMUTE-BY-SORTING（正しい）', 'どれとでも交換（まちがい）'][side], x0, 150);
      let tot = max(1, trials);
      for (let k = 0; k < 6; k++) {
        let v = (cnt[ps[k]] || 0) / tot, h = v * (height - 330) * 3;
        fill(side < 2 ? color(140 + side * 50, 60, 85) : color(0, 60, 85));
        rect(x0 + k * bw + 4, height - 100 - h, bw - 8, h, 4);
        fill(0, 0, 80); textAlign(CENTER, TOP); textSize(12); text(ps[k], x0 + k * bw + bw / 2, height - 92);
        textSize(11); text((v * 100).toFixed(1) + '%', x0 + k * bw + bw / 2, height - 72);
        textAlign(LEFT, BASELINE);
      }
      stroke(45, 90, 100); let y = height - 100 - (1 / 6) * (height - 330) * 3; line(x0, y, x0 + 6 * bw, y); noStroke();
    }
    fill(45, 90, 100); textSize(14); text('黄色の線 = 1/6（16.7%）。まちがい版は 3³ = 27 通りを 6 つに分けるので、割り切れずかたよる', L, 180);
  }
  if (mode === 3) {
    let gw = W, gh = height - 330, by = height - 90;
    stroke(0, 0, 40); line(L, by, L + gw, by);
    for (let k = 0; k < n; k++) {
      let p = online[k].tries ? online[k].win / online[k].tries : 0;
      noStroke(); fill(abs(k - n / Math.E) < 1 ? color(45, 90, 100) : color(260, 50, 80));
      rect(L + k * gw / n + 3, by - p * gh * 2, gw / n - 6, p * gh * 2, 3);
      fill(0, 0, 55); textAlign(CENTER, TOP); textSize(11); text(k, L + k * gw / n + gw / (2 * n), by + 4);
    }
    textAlign(LEFT, BASELINE); fill(0, 0, 85); textSize(15);
    text('横：最初に見送る人数 k　縦：一番良い人を選べた割合（' + trials + ' 回）　黄色 = k ≈ n/e = ' + (n / Math.E).toFixed(1), L, 140);
    let best = 0; for (let k = 1; k < n; k++) if (online[k].win > online[best].win) best = k;
    if (trials) text('いちばん良かった k = ' + best + '　成功率 ' + (online[best].win / online[best].tries * 100).toFixed(1) + '%（1/e ≈ 36.8%）', L, 164);
  }
  let titles = ['', '雇用問題：何回雇う？', 'かたよりのないシャッフル（3 枚のカード、6 通り）', 'オンライン雇用：何人見送る？'];
  fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22); noStroke();
  text(titles[mode] + '　試行 ' + trials + ' 回', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('1〜3：モード　スペース：1 回試す　A：1000 回まとめて　R：リセット', 20, 68);
  text(mode === 1 ? '雇う回数 = Σ「i 人目が今までで一番」の指示確率変数。その確率は 1/i なので、期待値は H_n'
    : mode === 2 ? 'アルゴリズムを乱択にすると、入力の並びに関係なく「平均的に」速くなる（クイックソートでも同じ考え）'
    : '「秘書問題」とも呼ばれる。見送りすぎると最高の人を逃し、早すぎるとまだ比べる相手が少ない', 20, 92);
}

function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); resetStats(); }
  if (key === ' ') trial();
  if (key === 'a' || key === 'A') for (let i = 0; i < 1000; i++) trial();
  if (key === 'r' || key === 'R') resetStats();
}
function mousePressed() { trial(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 100 にして、平均の雇用回数が ln 100 ≈ 4.6 に近づくか確かめる
// 2. PERMUTE-BY-SORTING の番号の範囲を 1〜n³ から 1〜2 にすると、同じ番号が出てかたよる。確かめよう
// 3. オンライン雇用で「2 番目に良い人まで OK」なら、最適な k はどう変わる？
