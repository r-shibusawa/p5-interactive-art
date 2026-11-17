// ============================================
// 02 傾きの錯視 ─ ツェルナー・カフェウォール・ヘリング
// 1 ツェルナー：平行な縦線に斜めの短い線を付けると、縦線が傾いて見える
// 2 カフェウォール：白黒のタイルを半分ずらし、灰色の目地（モルタル）を入れると、水平な目地がくさび形に見える
// 3 ヘリング：放射状の線の上の 2 本の水平線が、ふくらんで見える
// 1〜3 = 切替 / ←→ = 斜線の角度・ずらし・放射線の数 / ↑↓ = 補正（傾け・曲げて打ち消す）・目地の明るさ / Enter = 記録
// T またはマウスを押している間 = 真実を見る（赤い定規を重ねる）
// ============================================

let which = 1;
let hatchAng = 30;           // ★ ツェルナーの斜線の角度（度）
let comp = 0;                // ツェルナー：線を交互に傾けて打ち消す量（度）
let offset = 0.3;            // ★ カフェウォールのずらし（タイル幅に対する割合）
let mortar = 128;            // ★ 目地の明るさ（0 = 黒、255 = 白）
let rays = 36;               // ★ ヘリングの放射線の数
let bend = 0;                // ヘリング：線を逆に曲げて打ち消す量 px
let truthKey = false, trials = [];
const PAPER = 245, INK = 20, HERING = [190, 30, 40];

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

// 図をかく範囲
function area() { return { x0: 40, y0: 90, x1: Math.round(width * 0.72), y1: height - 60 }; }
function zLines() { let A = area(), n = 7, gap = Math.round((A.x1 - A.x0) / (n + 1)); return [...Array(n)].map((_, k) => A.x0 + gap * (k + 1)); }
function cafeRows() { let A = area(), th = 40, out = []; for (let y = A.y0 + 20; y + th < A.y1; y += th + 4) out.push(y); return { th, rows: out }; }
function heringYs() { let A = area(), cy = Math.round((A.y0 + A.y1) / 2); return [cy - 70, cy + 70]; }

function drawScene(truth) {
  background(PAPER);
  let A = area();
  if (which === 1) {
    let xs = zLines(), len = A.y1 - A.y0 - 40;
    xs.forEach((x, k) => {
      let s = k % 2 ? 1 : -1, tilt = (s * comp * Math.PI) / 180, dx = (Math.tan(tilt) * len) / 2, cy = (A.y0 + A.y1) / 2;
      stroke(INK); strokeWeight(4); strokeCap(SQUARE);
      line(x - dx, cy - len / 2, x + dx, cy + len / 2);
      strokeWeight(3);
      let a = (s * hatchAng * Math.PI) / 180, hl = 22;
      for (let t = -len / 2 + 15; t < len / 2; t += 30) {
        let px = x + (dx * 2 * t) / len, py = cy + t;
        line(px - hl * Math.sin(a), py - hl * Math.cos(a), px + hl * Math.sin(a), py + hl * Math.cos(a));
      }
    });
    if (truth) { stroke(230, 40, 40); strokeWeight(1); for (let x of xs) line(x, A.y0, x, A.y1); }
  } else if (which === 2) {
    let { th, rows } = cafeRows(), tw = th;
    noStroke(); fill(mortar); rect(A.x0, rows[0] - 4, A.x1 - A.x0, rows[rows.length - 1] + th + 4 - (rows[0] - 4));
    rows.forEach((y, r) => {
      let sh = r % 2 ? Math.round(offset * tw) : 0;
      for (let x = A.x0 - 2 * tw + sh, k = 0; x < A.x1; x += tw, k++) {
        fill(k % 2 ? 255 : 0);
        let xa = Math.max(A.x0, x), xb = Math.min(A.x1, x + tw);
        if (xb > xa) rect(xa, y, xb - xa, th);
      }
    });
    if (truth) { stroke(230, 40, 40); strokeWeight(1); for (let y of rows.slice(1)) line(A.x0, y - 2, A.x1, y - 2); }
  } else {
    let cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2;
    {
      stroke(INK); strokeWeight(2);
      for (let k = 0; k < rays; k++) { let a = (k / rays) * TWO_PI; line(cx, cy, cx + 900 * Math.cos(a), cy + 900 * Math.sin(a)); }
      noStroke(); fill(PAPER); rect(0, 0, A.x0, height); rect(A.x1, 0, width, height); rect(0, 0, width, A.y0); rect(0, A.y1, width, height);
    }
    stroke(HERING); strokeWeight(6); noFill();
    for (let [i, y] of heringYs().entries()) {
      let s = i === 0 ? 1 : -1;   // 上の線は下へ、下の線は上へ曲げる（ふくらみを打ち消す向き）
      beginShape(); for (let x = A.x0 + 40; x <= A.x1 - 40; x += 10) { let u = (x - cx) / ((A.x1 - A.x0) / 2 - 40); vertex(x, y + s * bend * (1 - u * u)); } endShape();
    }
    if (truth) { stroke(40, 90, 230); strokeWeight(1); for (let y of heringYs()) line(A.x0, y, A.x1, y); }
  }
  drawHud();
}

function drawHud() {
  noStroke(); fill(30); textAlign(LEFT, BASELINE); textSize(18);
  let names = ['', 'ツェルナー', 'カフェウォール', 'ヘリング'];
  let ctl = which === 1 ? '←→：斜線の角度 ' + hatchAng + '°　↑↓：補正 ' + comp.toFixed(1) + '°'
          : which === 2 ? '←→：ずらし ' + offset.toFixed(2) + '　↑↓：目地の明るさ ' + mortar
          : '←→：放射線 ' + rays + ' 本　↑↓：補正 ' + bend + ' px';
  text('1〜3：' + names[which] + '　' + ctl + '　Enter：記録　T：定規', 20, 34);
  fill(90); textSize(15);
  text(which === 2 ? '目地を黒（0）や白（255）にすると？ いちばん傾いて見える明るさを探そう' : '↑↓ で逆向きに傾けて（曲げて）、まっすぐ・平行に見えたら Enter。必要だった補正 = 錯視の強さ', 20, 60);
  let x = Math.round(width * 0.75), y = 110;
  fill(30); textSize(16); text('試行　錯視　条件　補正', x, y);
  let last = trials.slice(-12); fill(70);
  last.forEach((t, i) => text((trials.length - last.length + i + 1) + '　 ' + t.name + '　' + t.cond + '　' + t.val, x, y + 22 * (i + 1)));
  fill(30); textSize(16);
  for (let w of [1, 3]) {
    let a = trials.filter((t) => t.w === w).map((t) => t.num);
    text(names[w] + ' 平均補正 ' + (a.length ? mean(a).toFixed(1) + (w === 1 ? '°' : ' px') : '−'), x, y + 22 * 14 + (w === 3 ? 24 : 0));
  }
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(40, 140, 70) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') which = +key;
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  let up = key === UP_ARROW ? 1 : key === DOWN_ARROW ? -1 : 0, rt = key === RIGHT_ARROW ? 1 : key === LEFT_ARROW ? -1 : 0;
  if (which === 1) { comp = constrain(comp + up * 0.5, -10, 10); hatchAng = constrain(hatchAng + rt * 5, 5, 85); }
  if (which === 2) { mortar = constrain(mortar + up * 16, 0, 255); offset = constrain(Math.round((offset + rt * 0.05) * 100) / 100, 0, 1); }
  if (which === 3) { bend = constrain(bend + up, -30, 30); rays = constrain(rays + rt * 4, 4, 120); }
  if (key === ENTER && which !== 2) {
    if (which === 1) trials.push({ w: 1, name: 'ツ', cond: hatchAng + '°', val: comp.toFixed(1) + '°', num: comp });
    else trials.push({ w: 3, name: 'へ', cond: rays + '本', val: bend + ' px', num: bend });
    comp = 0; bend = 0;
  }
}
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. ツェルナー：斜線の角度を 10°・30°・60° にして、必要な補正を比べる
// 2. カフェウォール：目地を 0（黒）・128（灰）・255（白）にする。くさびが消えるのはどれ？
// 3. カフェウォール：ずらしを 0（そろえる）や 0.5（半分）にすると？
// 4. ヘリング：放射線を 4 本まで減らすと曲がりは弱くなる？
// 5. T の赤い定規を重ねたまま見ても、まだ傾いて見える？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}
function near(p, c, tol = 10) { return Math.abs(p[0] - c[0]) <= tol && Math.abs(p[1] - c[1]) <= tol && Math.abs(p[2] - c[2]) <= tol; }

// ---- 自己テスト：3 つの図を描いて、線に沿って画素を読み、本当にまっすぐ・平行かを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = which, A = area();
  let ys = [...Array(24)].map((_, k) => Math.round(A.y0 + 40 + ((A.y1 - A.y0 - 80) * k) / 23));
  let xs = [...Array(30)].map((_, k) => Math.round(A.x0 + 50 + ((A.x1 - A.x0 - 100) * k) / 29));
  which = 1; drawScene(false); loadPixels();
  ok('ツェルナー：7 本の縦線は、上から下まで同じ x の列が全部黒（傾き 0、平行）', zLines().every((x) => ys.every((y) => near(readPix(x, y), [INK, INK, INK], 30))));
  ok('ツェルナー：線の間隔はどこも同じ', zLines().every((x, k, a) => k === 0 || a[k] - a[k - 1] === a[1] - a[0]));
  which = 2; drawScene(false); loadPixels();
  let { th, rows } = cafeRows();
  ok('カフェウォール：' + (rows.length - 1) + ' 本の目地は、左から右まで同じ行が全部 ' + mortar + '（水平）', rows.slice(1).every((y) => xs.every((x) => readPix(x, y - 2).every((v) => v === mortar))));
  ok('カフェウォール：タイルは黒 0 と白 255 だけ', rows.every((y) => xs.every((x) => { let v = readPix(x, y + th / 2)[0]; return v === 0 || v === 255; })));
  which = 3; drawScene(false); loadPixels();
  let hx = xs.filter((x) => x > A.x0 + 50 && x < A.x1 - 50);
  ok('ヘリング：2 本の赤い線は、同じ行がどこでも赤（まっすぐ）', heringYs().every((y) => hx.every((x) => near(readPix(x, y), HERING, 30))));
  which = keep; drawScene(false);
  ok('補正 0 から始まる（何も足していない図）', comp === 0 && bend === 0);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
