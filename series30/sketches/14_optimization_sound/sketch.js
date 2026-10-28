// ============================================
// 14 最適化を聞く（自由制作のベース）
// 焼きなまし法（09）で巡回路を短くしていく様子を音にする。道が短くなるほど音が高くなり、悪くなる手を受け入れるたびにカチッと鳴る
//   熱いうちはカチカチとにぎやか → 冷えると静かになって高い音に落ち着く。「最良」が更新されるとチーンと鳴る
// クリック = 町を足す（最初のクリックで音が出る）/ スペース = やり直し / ↑↓ = 冷やす速さ / H = 温め直す / P = 音階にそろえる / M = 消音 / R = 新しい町
// ============================================

let nCities = 50;                      // ★ 町の数
let cities = [], tour = [], bestTour = [];
let T0 = 150, T, cool = 0.999996;      // ★ 最初の温度と冷やす速さ
let curLen, bestLen, startLen;
let itersPerFrame = 1500;
let quantize = true, muted = false;
let lenLog = [];
let mapX, mapY, mapW, mapH;
let NOTES = [0, 2, 4, 7, 9];           // ★ 音階（ペンタトニック）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  mapX = 30; mapY = 100; mapW = width - 60; mapH = height - 260;
  newCities();
}
function newCities() {
  cities = [];
  for (let i = 0; i < nCities; i++) cities.push({ x: mapX + random(20, mapW - 20), y: mapY + random(20, mapH - 20), flash: 0 });
  restart();
}
function restart() {
  tour = shuffle(cities.map((_, i) => i));
  curLen = tourLen(tour); bestLen = curLen; startLen = curLen; bestTour = tour.slice();
  T = T0; lenLog = [];
}
function dd(a, b) { return Math.hypot(cities[a].x - cities[b].x, cities[a].y - cities[b].y); }
function tourLen(t) { let s = 0; for (let i = 0; i < t.length; i++) s += dd(t[i], t[(i + 1) % t.length]); return s; }

// 焼きなまし法の 1 手（09 と同じ）。悪くなる手を受け入れたら true
function annealStep() {
  let n = tour.length;
  let i = floor(random(n)), j = floor(random(n));
  if (i > j) [i, j] = [j, i];
  if (j - i < 2 || (i === 0 && j === n - 1)) return null;
  let a = tour[i], b = tour[i + 1], c = tour[j], e = tour[(j + 1) % n];
  let delta = dd(a, c) + dd(b, e) - dd(a, b) - dd(c, e);
  if (delta < 0 || (T > 1e-9 && random() < Math.exp(-delta / T))) {
    for (let p = i + 1, q = j; p < q; p++, q--) [tour[p], tour[q]] = [tour[q], tour[p]];
    curLen += delta;
    return { uphill: delta > 0, city: b };
  }
  return null;
}

// ★ 長さ → 音の高さ：最初の長さで低い音、短くなるほど高い音
function lenToFreq(L) {
  let t = constrain(1 - L / startLen, 0, 0.8) / 0.8;       // 0（最初）〜 1（とても短い）
  let semi = t * 36;                                         // 3 オクターブ
  if (quantize) { let oct = floor(semi / 12), k = semi % 12, best = 0; for (let s of NOTES) if (s <= k) best = s; semi = oct * 12 + best; }
  return 110 * pow(2, semi / 12);
}

function draw() {
  background(225, 30, 12);
  let clicks = 0, clickCity = -1;
  if (cities.length >= 5) {
    for (let k = 0; k < itersPerFrame; k++) {
      let r = annealStep();
      if (r && r.uphill) { clicks++; clickCity = r.city; }
      T *= cool;
    }
    if (T < 0.01) T = 0;
    if (curLen < bestLen - 1e-6) {
      if (bestLen - curLen > startLen * 0.004) { ping(lenToFreq(curLen) * 2, 0.12); }   // 最良を更新 → チーン
      bestLen = curLen; bestTour = tour.slice();
    }
  }
  lenLog.push(curLen); if (lenLog.length > 600) lenLog.shift();

  // 音：連続音の高さ = 今の長さ、カチッ = 悪くなる手を受け入れた
  if (!muted) {
    setDrone(lenToFreq(curLen), 0.08 + 0.1 * min(1, T / T0));
    if (clicks > 0 && frameCount % 2 === 0) { tick(min(0.3, 0.05 + clicks * 0.004)); if (clickCity >= 0) cities[clickCity].flash = 1; }
  } else setDrone(lenToFreq(curLen), 0);

  // 地図
  stroke(30, 70, 100, 30); strokeWeight(1.5); noFill();
  beginShape(); for (let i of tour) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
  let hu = map(constrain(1 - curLen / startLen, 0, 0.8), 0, 0.8, 200, 50);
  stroke(hu, 80, 100); strokeWeight(3);
  beginShape(); for (let i of bestTour) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
  noStroke();
  for (let c of cities) { fill(0, 0, 100); circle(c.x, c.y, 8 + c.flash * 16); c.flash *= 0.85; }

  // 下：長さと温度
  let gy = height - 140, gh = 100, gw = width - 360;
  stroke(0, 0, 100, 25); strokeWeight(1); line(30, gy + gh, 30 + gw, gy + gh);
  noFill(); stroke(hu, 80, 100); strokeWeight(2);
  beginShape(); lenLog.forEach((L, k) => vertex(30 + k / 599 * gw, gy + gh - constrain(L / startLen, 0, 1) * gh)); endShape();
  noStroke(); fill(0, 0, 100); textSize(16);
  text('長さ ' + nf(curLen, 1, 0) + '（最初の ' + nf(100 * curLen / startLen, 1, 1) + '%）', gw + 60, gy + 20);
  text('温度 T = ' + nf(T, 1, 2), gw + 60, gy + 46);
  text('音 ' + nf(lenToFreq(curLen), 1, 0) + ' Hz' + (quantize ? '（音階）' : ''), gw + 60, gy + 72);
  fill(0, 0, 60); textSize(13); text('長さの推移', 30, gy - 8);

  fill(0, 0, 100); textSize(18);
  text('クリック：町を足す（音 ON）　スペース：やり直し　↑↓ 冷やす速さ ' + cool + '　H：温め直す　P：音階 ' + (quantize ? 'ON' : 'off') + '　M：消音 ' + (muted ? 'ON' : 'off') + '　R：新しい町', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(audioCtx ? '耳で収束を聞こう：カチカチ = 悪い手も試している、音が上がる = 道が短くなった、チーン = 新記録' : '🔊 まずキャンバスをクリックすると音が出る', 20, 68);
}

function mousePressed() {
  startAudio();
  if (mouseX > mapX && mouseX < mapX + mapW && mouseY > mapY && mouseY < mapY + mapH) {
    cities.push({ x: mouseX, y: mouseY, flash: 1 }); tour.push(cities.length - 1);
    curLen = tourLen(tour); bestLen = curLen; bestTour = tour.slice();
    ping(880, 0.1);
  }
}
function keyPressed() {
  startAudio();
  if (key === ' ') restart();
  if (key === UP_ARROW) cool = min(0.9999995, +(cool + (1 - cool) * 0.5).toFixed(8));
  if (key === DOWN_ARROW) cool = max(0.9999, +(1 - (1 - cool) * 2).toFixed(8));
  if (key === 'h' || key === 'H') T = T0 * 0.4;
  if (key === 'p' || key === 'P') quantize = !quantize;
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') newCities();
}

// ---------- やってみよう ----------
// 1. 音階（NOTES）を [0, 3, 5, 7, 10] や [0, 4, 7] に変えると、収束の「曲」の雰囲気はどう変わる？
// 2. 町を円や文字の形にクリックして並べ、焼きなましで「なぞる」作品にしよう
// 3. 温め直し（H）を一定時間ごとに自動で入れると、音楽のくり返しのようになる
// 4. 09 の代わりに 10 の GA や 08 の 2-opt を音にするとどう聞こえる？ 何を音にするかが作品の中心


// ==================================================
// ここから下は「音を鳴らすための道具」（連続音・カチッ・チーン）
// ==================================================
let audioCtx, masterOut, drone, droneGain;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    drone = audioCtx.createOscillator(); drone.type = 'triangle'; drone.frequency.value = 110;
    let f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    droneGain = audioCtx.createGain(); droneGain.gain.value = 0;
    drone.connect(f); f.connect(droneGain); droneGain.connect(masterOut); drone.start();
  }
  audioCtx.resume();
}
// 連続音の高さ（Hz）と大きさをなめらかに変える
function setDrone(freq, vol) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  drone.frequency.setTargetAtTime(constrain(freq, 40, 4000), t, 0.08);
  droneGain.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.1);
}
// カチッ（短いノイズ）
function tick(vol) {
  if (!audioCtx) return;
  let n = Math.floor(audioCtx.sampleRate * 0.02);
  let buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  let src = audioCtx.createBufferSource(), g = audioCtx.createGain(), hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 2000;
  src.buffer = buf; g.gain.value = constrain(vol, 0, 0.5);
  src.connect(hp); hp.connect(g); g.connect(masterOut); src.start();
}
// チーン（減衰するサイン波）
function ping(freq, vol) {
  if (!audioCtx || muted) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = constrain(freq, 40, 6000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + 0.85);
}
