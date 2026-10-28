# シリーズ25：量子力学 ─ p5.js コード集

電子は 1 個ずつ点として届くのに、たまると波の縞になる。波動関数 ψ を複素数の「回る矢印」として描き、シュレーディンガー方程式を FFT で解き、トンネル効果・固有状態・スピン・もつれ・量子回路・水素原子の軌道までを自分の手で動かして体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series25/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチ（13・14）は、実行したらまずキャンバスを1回クリック。FFT や音のスケッチはコードを一番下の「道具」まで全部コピーする。📷 カメラ（15）はアドレスバーで許可する

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [波と粒子：二重スリット](sketches/00_double_slit/sketch.js) | 1 個ずつの点が縞になる、見張ると縞が消える | 1〜3 W ↑↓ ←→ T C | |
| 01 | [複素数と位相](sketches/01_complex_phase/sketch.js) | 回る矢印、らせんと色の帯、うなり | 1/2 ↑↓ ←→ D マウス スペース | |
| 02 | [波束と不確定性](sketches/02_wave_packet/sketch.js) | 位置と運動量（FFT）、Δx·Δp ≥ 1/2、広がる波束 | ←→＝σ ↑↓＝k0 スペース G R | |
| 03 | [シュレーディンガー方程式（1 次元）](sketches/03_schrodinger_1d/sketch.js) | 分割演算子法、5 つのポテンシャル | ドラッグ 1〜5 ↑↓ ←→ スペース R | |
| 04 | [トンネル効果](sketches/04_tunneling/sketch.js) | 反射と透過、理論の透過率と比べる | ↑↓＝V0 ←→＝幅 W/S スペース P | |
| 05 | [無限井戸の固有状態](sketches/05_infinite_well/sketch.js) | En ∝ n²、重ね合わせの揺れ、リバイバル | クリック 1〜6 G ↑↓ スペース R | |
| 06 | [調和振動子](sketches/06_harmonic_oscillator/sketch.js) | エルミート関数、等間隔のはしご、コヒーレント状態 | 1〜3 ↑↓＝n ←→＝α K スペース | |
| 07 | [固有値を数値で求める（シューティング法）](sketches/07_shooting_eigen/sketch.js) | 描いた V(x) の固有値を Numerov 法＋二分法で | ドラッグ 1〜5 C ↑↓ P | |
| 08 | [スピンとブロッホ球](sketches/08_bloch_sphere/sketch.js) | 3D の球の上でゲート・測定・歳差運動 | X Y Z H S T M K B ←→ ↑↓ R ドラッグ | |
| 09 | [シュテルン＝ゲルラッハ実験](sketches/09_stern_gerlach/sketch.js) | z → x → z で情報が消える | クリック ←→ 1〜4 ↑↓ C | |
| 10 | [量子もつれとベルの不等式](sketches/10_bell_chsh/sketch.js) | E(a,b) = −cos(a−b)、CHSH の S = 2√2 | ←→＝a ↑↓＝b H スペース C | |
| 11 | [量子コンピュータ入門](sketches/11_quantum_circuit/sketch.js) | 3 量子ビットの回路、ベル・GHZ・ドイチュ＝ジョサ・グローバー | クリック 1〜7 E B G D V C M | |
| 12 | [水素原子の軌道](sketches/12_hydrogen_orbitals/sketch.js) | ψnlm の断面、動径分布、バルマー系列 | ↑↓＝n ←→＝l M P Z G | |
| 13 | [量子の音](sketches/13_quantum_sound/sketch.js) | 準位 → 音の高さ、重ね合わせ → 和音、トンネル → うなり | クリック 1〜3 ←→ ↑↓ スペース | 🔊 |
| 14 | [波動関数ブラシ](sketches/14_psi_brush/sketch.js) | V と波を描いて時空図の絵にする。自由制作のベース | ドラッグ V W ←→ スペース 1〜3 S C | 🔊 |
| 15 | [カメラで回折](sketches/15_webcam_diffraction/sketch.js) | カメラの映像を穴にして 2D FFT の回折像 | V 1〜5 ドラッグ E C ←→ ↑↓ I L | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：粒子なのに波、波なのに粒子 | 00 |
| 0:10 – 0:25 | STEP 1　波動関数は複素数 | 01 – 02 |
| 0:25 – 0:45 | STEP 2　シュレーディンガー方程式を解く | 03 – 04 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:05 | STEP 3　固有状態とエネルギーの量子化 | 05 – 07 |
| 1:05 – 1:25 | STEP 4　スピン・もつれ・量子コンピュータ | 08 – 11 |
| 1:25 – 1:45 | STEP 5　原子・音・自由制作 | 12 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| `fft is not defined` | 一番下の「道具」（FFT）までコピーできていない → 全部コピーし直す |
| 波が消える・全確率が減る | 端で吸い込んでいる（03・04）。R やスペースで撃ち直す |
| 波がギザギザ・おかしな動き | 運動量 k0 が大きすぎる（格子で表せない）。k0 を小さく、または `N` を増やす |
| 画面が重い | `N`（03・04・14）、`G`（12・15）、`NH`（06）を小さくする |
| `startAudio is not defined` | 一番下の「音を鳴らすための道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

単位はすべて ħ = m = 1（水素原子はボーア半径 a0 = 1）。式は量子力学の教科書（Griffiths『Introduction to Quantum Mechanics』、Sakurai『Modern Quantum Mechanics』、Nielsen & Chuang『Quantum Computation and Quantum Information』など）と同じ形にしてあります。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
