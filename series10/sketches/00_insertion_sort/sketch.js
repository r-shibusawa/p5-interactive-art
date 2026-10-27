// ============================================
// 00 挿入ソート
// トランプの手札を並べるときと同じ。左側の「並んだ山」に、次の 1 枚を正しい場所へ差し込む
// 緑の部分はいつも並んでいる（ループ不変条件）。これが正しさの証明になる
// スペース：再生／一時停止　→：1 手だけ進める　R：新しい数列　1：ランダム　2：ほぼ整列　3：逆順
// 上下キー：速さ
// ============================================

let n = 24;            // ★ 並べる数の個数（多すぎると見づらい）
let speed = 4;         // ★ 1 秒あたりの手数のめやす（上下キーで変わる）
let a = [], gen, state = {}, playing = true;
let comparisons = 0, moves = 0, acc = 0, done = false, mode = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset(1);
}

function reset(m) {
  mode = m;
  a = [];
  for (let i = 0; i < n; i++) a.push(floor(random(5, 100)));
  if (mode === 2) { a.sort((x, y) => x - y); for (let k = 0; k < 3; k++) { let i = floor(random(n)), j = floor(random(n)); [a[i], a[j]] = [a[j], a[i]]; } }
  if (mode === 3) a.sort((x, y) => y - x);
  comparisons = 0; moves = 0; done = false; state = { j: 1, i: 0, key: null };
  gen = insertionSort();
}

// 挿入ソートを、1 手ずつ止まれるようにジェネレーター（function*）で書いたもの
function* insertionSort() {
  for (let j = 1; j < a.length; j++) {
    let key = a[j];
    let i = j - 1;
    state = { j, i, key, hole: j };
    yield;
    while (i >= 0) {
      comparisons++;
      state = { j, i, key, hole: i + 1, cmp: i };
      yield;
      if (a[i] <= key) break;
      a[i + 1] = a[i];        // 大きい数を 1 つ右へずらす
      moves++;
      i--;
      state = { j, i, key, hole: i + 1 };
      yield;
    }
    a[i + 1] = key;           // 空いた場所に差し込む
    moves++;
    state = { j: j + 1, i, key: null, hole: -1, placed: i + 1 };
    yield;
  }
  done = true;
  state = { j: a.length };
}

function advance() { if (!done) gen.next(); }

function draw() {
  background(230, 30, 10);
  if (playing && !done) {
    acc += speed / 60;
    while (acc >= 1) { advance(); acc--; }
  }
  let w = (width - 120) / max(1, a.length);
  let baseY = height - 120;
  let sortedEnd = state.j === undefined ? 0 : state.j; // 0..j-1 は並んでいる
  for (let k = 0; k < a.length; k++) {
    let x = 60 + k * w;
    let h = a[k] * (height - 320) / 100;
    let c;
    if (k === state.hole && state.key !== null && state.key !== undefined) continue; // 抜き出した札の穴
    if (done || k < sortedEnd) c = color(140, 60, 85);
    else c = color(220, 20, 55);
    if (k === state.cmp) c = color(45, 90, 100);
    if (k === state.placed) c = color(140, 90, 100);
    noStroke(); fill(c);
    rect(x + 2, baseY - h, w - 4, h, 4);
    fill(0, 0, 80); textAlign(CENTER, TOP); textSize(min(14, w * 0.5));
    text(a[k], x + w / 2, baseY + 8);
  }
  // 手に持っている札（key）を上に浮かせて描く
  if (state.key !== null && state.key !== undefined && state.hole >= 0) {
    let x = 60 + state.hole * w;
    let h = state.key * (height - 320) / 100;
    fill(330, 80, 100); noStroke();
    rect(x + 2, baseY - h - 60, w - 4, h, 4);
    fill(330, 80, 100); textSize(14); text('key=' + state.key, x + w / 2, baseY - h - 84);
  }
  // 不変条件の帯
  if (!done && sortedEnd > 0) {
    stroke(140, 60, 85); strokeWeight(3);
    line(60, baseY + 34, 60 + sortedEnd * w, baseY + 34);
    noStroke(); fill(140, 60, 85); textAlign(LEFT, TOP); textSize(14);
    text('A[0..' + (sortedEnd - 1) + '] は並んでいる（ループ不変条件）', 60, baseY + 42);
  }

  textAlign(LEFT, BASELINE); noStroke();
  fill(0, 0, 100); textSize(22);
  text('挿入ソート　比較 ' + comparisons + ' 回　移動 ' + moves + ' 回' + (done ? '　完成！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '一時停止' : '再生') + '　→：1手　R：やり直し　1 ランダム　2 ほぼ整列　3 逆順　↑↓ 速さ ' + speed, 20, 68);
  text('最悪（逆順）は約 n²/2 = ' + floor(n * n / 2) + ' 回の比較、ほぼ整列なら約 n 回。入力で速さが変わる', 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === 'r' || key === 'R') reset(mode);
  if (key >= '1' && key <= '3') reset(int(key));
  if (key === UP_ARROW) speed = min(120, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 3（逆順）と 2（ほぼ整列）で比較回数を比べる。n を 2 倍にすると何倍になる？
// 2. if (a[i] <= key) を if (a[i] < key) にしても並ぶ？ 同じ数の順番（安定性）はどうなる？
// 3. 降順に並べるには、どこを 1 文字変えればいい？
