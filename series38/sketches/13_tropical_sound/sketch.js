// ============================================
// 13 max-plus のダイヤを聴く
// 10 の周期スケジュール x(k+1) = A ⊗ x(k)（max-plus）をそのまま音にする：
//   各工程の開始時刻にその工程の音が鳴る。やがて周期 λ（トロピカル固有値）のリズムに落ち着く
//   自由制作のベース：工程の数・つなぎ方・音色を変えて「リズムマシン」にしよう
// クリックで音をスタート / ノードをクリック = 所要時間を 0.25 ずつ変える（Shift で減らす）/ 1〜3 = 音色 / R = リセット / ↑↓ = テンポ
// ============================================

let tau = [0.5, 1.0, 0.75, 0.5];                              // ★ 各工程の所要時間（秒）
let arcs = [[0, 1], [1, 2], [2, 3], [3, 0], [1, 3], [3, 1], [0, 2]];   // ★ j → i のつながり
let notes = [220, 330, 277.2, 440];                           // ★ 各工程の音の高さ（Hz）
let move = 0.25;                                              // ★ 工程間の搬送時間（秒）
let waveType = 'triangle';
let n = 4, nodes = [], tempo = 1;
let xCur = [0, 0, 0, 0], pending = [];                        // いまの x(k) と、まだ鳴っていないイベント
let t0 = 0, flash = [0, 0, 0, 0], played = [];
let lam = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  for (let i = 0; i < n; i++) nodes.push({ x: width * 0.25 + 150 * Math.cos(TWO_PI * i / n - HALF_PI), y: height * 0.45 + 150 * Math.sin(TWO_PI * i / n - HALF_PI) });
  resetSchedule();
}
function matrixA() {
  let A = [];
  for (let i = 0; i < n; i++) { A.push([]); for (let j = 0; j < n; j++) A[i].push(i === j ? tau[i] : -Infinity); }   // 同じ工程は前の仕事が終わるまで待つ
  for (let [j, i] of arcs) A[i][j] = tau[j] + move;
  return A;
}
// ★ 1 回ぶん進める：x_i(k+1) = max_j (A_ij + x_j(k))
function stepOnce() {
  let A = matrixA(), y = [];
  for (let i = 0; i < n; i++) { let m = -Infinity; for (let j = 0; j < n; j++) m = Math.max(m, A[i][j] + xCur[j]); y.push(m === -Infinity ? xCur[i] + 1 : m); }
  for (let i = 0; i < n; i++) if (y[i] > xCur[i]) pending.push({ t: y[i], i });
  xCur = y;
  pending.sort((p, q) => p.t - q.t);
}
function resetSchedule() { xCur = [0, 0, 0, 0]; pending = []; played = []; t0 = millis() / 1000; for (let i = 0; i < n; i++) pending.push({ t: 0, i }); }
// Karp のアルゴリズム（10 と同じ）
function karp(A) {
  let D = [new Array(n).fill(0)];
  for (let k = 1; k <= n; k++) { D.push(new Array(n).fill(-Infinity)); for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) if (A[v][u] > -Infinity && D[k - 1][u] > -Infinity) D[k][v] = Math.max(D[k][v], D[k - 1][u] + A[v][u]); }
  let best = -Infinity;
  for (let v = 0; v < n; v++) { if (D[n][v] === -Infinity) continue; let m = Infinity; for (let k = 0; k < n; k++) if (D[k][v] > -Infinity) m = Math.min(m, (D[n][v] - D[k][v]) / (n - k)); best = Math.max(best, m); }
  return best;
}

function draw() {
  background(190, 55, 10);
  lam = karp(matrixA());
  let now = (millis() / 1000 - t0) * tempo;
  // 先の予定を用意しておき、時刻が来たら鳴らす
  let guard = 0;
  while ((pending.length === 0 || pending[pending.length - 1].t < now + 4) && guard++ < 50) stepOnce();
  while (pending.length && pending[0].t <= now) {
    let ev = pending.shift();
    playNote(notes[ev.i], tau[ev.i] * 0.6 / tempo);
    flash[ev.i] = 1;
    played.push(ev);
  }
  played = played.filter((h) => h.t > now - 12);

  // グラフ
  for (let [j, i] of arcs) {
    let u = nodes[j], v = nodes[i], ang = atan2(v.y - u.y, v.x - u.x);
    let o = arcs.some(([a, b]) => a === i && b === j) ? 8 : 0, nx = -sin(ang) * o, ny = cos(ang) * o;
    stroke(0, 0, 100, 35); strokeWeight(2);
    line(u.x + nx, u.y + ny, v.x - 26 * cos(ang) + nx, v.y - 26 * sin(ang) + ny);
    noStroke(); fill(0, 0, 100, 35);
    push(); translate(v.x - 26 * cos(ang) + nx, v.y - 26 * sin(ang) + ny); rotate(ang); triangle(0, 0, -12, 6, -12, -6); pop();
  }
  for (let i = 0; i < n; i++) {
    flash[i] *= 0.9;
    noStroke(); fill((i * 80 + 20) % 360, 70, 100, flash[i] * 60); circle(nodes[i].x, nodes[i].y, 50 + flash[i] * 60);
    stroke(0, 0, 10); strokeWeight(2); fill((i * 80 + 20) % 360, 70, 60 + flash[i] * 40);
    circle(nodes[i].x, nodes[i].y, 52);
    noStroke(); fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(16); text(i, nodes[i].x, nodes[i].y - 9); textSize(12); text('τ=' + nf(tau[i], 1, 2), nodes[i].x, nodes[i].y + 10); textAlign(LEFT, BASELINE);
  }

  // 流れるダイヤ：右 = いま
  let tx = width * 0.5, tw = width - tx - 40, ty = 160, rowH = 50;
  let sx = (t) => tx + tw - (now - t) / 12 * tw;
  noStroke(); fill(0, 0, 100, 6); rect(tx - 10, ty - 30, tw + 20, rowH * n + 40, 12);
  for (let i = 0; i < n; i++) {
    let y = ty + i * rowH;
    stroke(0, 0, 100, 20); strokeWeight(1); line(tx, y, tx + tw, y);
    noStroke(); fill(0, 0, 60); textSize(13); text('工程 ' + i + '（' + notes[i] + ' Hz）', tx, y - 16);
    for (let h of played) if (h.i === i) { fill((i * 80 + 20) % 360, 70, 100, 80); rect(sx(h.t), y - 12, Math.max(2, tau[i] / 12 * tw), 24, 3); }
    for (let p of pending) if (p.i === i && p.t < now + 12) { noFill(); stroke((i * 80 + 20) % 360, 70, 100, 50); rect(sx(p.t), y - 12, Math.max(2, tau[i] / 12 * tw), 24, 3); noStroke(); }
  }
  stroke(90, 90, 100); strokeWeight(2); line(tx + tw, ty - 30, tx + tw, ty + rowH * n + 10);
  // 周期の目盛り
  for (let m = 0; m < 12 / Math.max(lam, 0.1); m++) { stroke(330, 70, 100, 40); strokeWeight(1); line(tx + tw - m * lam / 12 * tw, ty + rowH * n + 10, tx + tw - m * lam / 12 * tw, ty + rowH * n + 20); }
  noStroke(); fill(330, 70, 100); textSize(15); text('ピンクの目盛り = 周期 λ = ' + nf(lam, 1, 3) + ' 秒（最大平均サイクル重み）', tx, ty + rowH * n + 44);

  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　ノードをクリック：τ + 0.25（Shift で −）　1〜3：音色（' + waveType + '）　↑↓：テンポ ×' + nf(tempo, 1, 2) + '　R：リセット', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('x_i(k+1) = max_j (τ_j + 搬送 + x_j(k))：前の工程が全部終わって届いてから始まる。帯 = 稼働、薄い枠 = これからの予定。しばらくすると全員が同じ周期 λ で回る', 20, 62);
  text('自由制作：notes・tau・arcs を変える。工程を増やす（n, nodes, tau, notes, xCur, flash の長さをそろえる）。playNote の音色を変える', 20, height - 24);
}

function mousePressed() {
  startAudio();
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 28) tau[i] = constrain(tau[i] + (keyIsDown(SHIFT) ? -0.25 : 0.25), 0.25, 4);
}
function keyPressed() {
  if (key === '1') waveType = 'triangle';
  if (key === '2') waveType = 'square';
  if (key === '3') waveType = 'sine';
  if (key === UP_ARROW) tempo = Math.min(4, tempo * 1.25);
  if (key === DOWN_ARROW) tempo = Math.max(0.25, tempo / 1.25);
  if (key === 'r' || key === 'R') { tau = [0.5, 1.0, 0.75, 0.5]; resetSchedule(); }
}

// ---------- やってみよう ----------
// 1. どれか 1 つの τ を変えても周期が変わらないことがある。クリティカルでない工程だから。どの工程を変えると周期が変わる？
// 2. notes を和音（ド・ミ・ソ・シ）にする。周期 λ を 1 秒ちょうどにするには τ をどう決める？
// 3. arcs を変えて「2 つの独立したループ」を作る（たとえば 0⇄1 と 2⇄3）。周期は 2 つになる？（固有値が複数）
// 4. playNote をドラムっぽいノイズに変える（startAudio の中に noise バッファを足す）


// ==================================================
// ここから下は「音を鳴らすための道具」
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
// 短い音を 1 つ鳴らす（高さ freq Hz，長さ dur 秒）
function playNote(freq, dur) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = waveType; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + Math.max(0.05, dur) + 0.05);
}
