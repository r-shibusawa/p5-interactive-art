# シリーズ7：音楽情報処理 ─ p5.js コード集

音階・リズム・音色・メロディを数で扱い、音楽をコンピュータで分析・生成するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series7/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音・🎤 マイクを使うスケッチは、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [音の高さと周波数](sketches/00_notes_freq/sketch.js) | 鍵盤と 2 の 12 乗根 | 鍵盤をクリック／キー | 🔊 |
| 01 | [音階と和音](sketches/01_scales_chords/sketch.js) | 五度圏、長調・短調 | 円をクリック 1〜4 スペース C | 🔊 |
| 02 | [ステップシーケンサー](sketches/02_step_sequencer/sketch.js) | リズムを打ち込む | マスをクリック スペース | 🔊 |
| 03 | [ユークリッド・リズム](sketches/03_euclidean_rhythm/sketch.js) | 民族音楽のリズムが 1 つの式で | 左右＝k 上下＝n | 🔊 |
| 04 | [ビート検出](sketches/04_beat_tracking/sketch.js) | テンポを聞き取る | クリック＝マイク ON | 🎤 |
| 05 | [音色をつくる](sketches/05_adsr_timbre/sketch.js) | 倍音と ADSR | ドラッグ スペース 1〜3 | 🔊 |
| 06 | [クロマ](sketches/06_chroma/sketch.js) | 12 音のどれが鳴っているか | クリック＝マイク ON | 🎤 |
| 07 | [音の明るさ](sketches/07_brightness/sketch.js) | スペクトル重心・平坦さ | クリック＝マイク ON | 🎤 |
| 08 | [マルコフ連鎖で作曲](sketches/08_markov_melody/sketch.js) | 曲から曲を学ぶ | クリック＝再生 1〜3 | 🔊 |
| 09 | [歌を楽譜にする](sketches/09_pitch_contour/sketch.js) | 自動採譜 | スペース＝録音 P＝再生 | 🎤🔊 |
| 10 | [コード進行とアルペジオ](sketches/10_arpeggiator/sketch.js) | 4 つの和音で曲に | 1〜4 左右＝テンポ | 🔊 |
| 11 | [タップテンポ](sketches/11_tempo_tap/sketch.js) | テンポ感を測る | スペース／手拍子 M | 🎤🔊 |
| 12 | [ルールで作曲する](sketches/12_generative_music/sketch.js) | 生成音楽（自由制作のベース） | クリック 1〜3 | 🔊 |
| 13 | [キーの推定](sketches/13_key_detection/sketch.js) | 24 の調と比べる | クリック＝マイク ON | 🎤 |
| 14 | [FM 音源](sketches/14_fm_synth/sketch.js) | ベル・エレピ・ブラス | マウス クリック 1〜3 | 🔊 |
| 15 | [音の指紋](sketches/15_fingerprint/sketch.js) | Shazam のしくみ | クリック スペース | 🎤 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：音楽を数にする | — |
| 0:10 – 0:25 | STEP 1　音の高さと音階 | 00 – 01 |
| 0:25 – 0:45 | STEP 2　リズムとテンポ | 02 – 04 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　音色とスペクトル | 05 – 07 |
| 1:10 – 1:25 | STEP 4　メロディと生成 | 08 – 09 |
| 1:25 – 1:45 | STEP 5　音と自由制作 | 10 – 13 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| リズムがよれる | 別のタブを閉じる。`setInterval` の予約方式なので通常は正確 |
| `startAudio is not defined` など | 一番下の「道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・マイクが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |
| マイクがスピーカーの音を拾う | イヤホンを使う。04・11 は手拍子で代用できる |

音を使うスケッチは p5.sound ではなく、ブラウザ標準の **Web Audio API** を使っています（p5.js 1.x / 2.x どちらでも動きます）。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
