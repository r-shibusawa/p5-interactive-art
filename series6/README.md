# シリーズ6：通信理論 ─ p5.js コード集

0 と 1 を、遠くへ、正しく、速く届けるには？ 変調、誤り訂正、圧縮、暗号、シャノンの定理を体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series6/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音・🎤 マイクを使うスケッチは、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [文字をビットにする](sketches/00_binary_message/sketch.js) | 文字コードと 2 進数 | キー入力 クリック＝送信 | |
| 01 | [エントロピー](sketches/01_entropy/sketch.js) | 情報の量を測る | 左右＝p クリック＝コイン | |
| 02 | [AM と FM](sketches/02_am_fm/sketch.js) | 搬送波に情報を乗せる | 1/2＝方式 左右＝周波数 | 🔊 |
| 03 | [デジタル変調](sketches/03_digital_modulation/sketch.js) | ASK / FSK / PSK | 1〜3＝方式 | |
| 04 | [コンスタレーション](sketches/04_constellation/sketch.js) | QPSK / QAM と雑音 | 1〜3＝方式 左右＝雑音 | |
| 05 | [雑音のある通信路](sketches/05_noisy_channel/sketch.js) | 画像を送る。くり返し符号 | 左右＝反転確率 1〜3＝回数 | |
| 06 | [ハミング符号](sketches/06_hamming/sketch.js) | 1 ビット誤りを自動訂正 | クリック＝ビット反転 | |
| 07 | [誤り率くらべ](sketches/07_error_rates/sketch.js) | 符号の強さをグラフで | 自動測定 | |
| 08 | [ハフマン符号](sketches/08_huffman/sketch.js) | よく出る文字は短く | キー入力 1〜3＝お手本 | |
| 09 | [XOR 暗号](sketches/09_xor_cipher/sketch.js) | 鍵の良し悪しが絵で見える | 1〜3＝鍵 クリック＝復号 | |
| 10 | [プッシュホンの音](sketches/10_dtmf/sketch.js) | 2 つの周波数でボタンを伝える | ボタンをクリック | 🔊 |
| 11 | [モールス信号を声で](sketches/11_mic_morse/sketch.js) | 音の長さで判定 | クリック＝マイク ON | 🎤 |
| 12 | [パケット・ネットワーク](sketches/12_packet_network/sketch.js) | 分けて送り再送する（自由制作のベース） | クリック＝送信 左右＝消失率 | 🔊 |
| 13 | [シャノンの通信路容量](sketches/13_shannon_capacity/sketch.js) | 速さの理論的上限 | 左右＝S/N 上下＝帯域幅 | |
| 14 | [CDMA](sketches/14_cdma/sketch.js) | 直交符号で同時に送る | 1〜4＝ユーザー | |
| 15 | [周波数ホッピング](sketches/15_frequency_hopping/sketch.js) | 妨害をかわす | 上下＝妨害 1/2＝切替 | |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：通信とは ─ 情報・通信路・雑音 | — |
| 0:10 – 0:25 | STEP 1　情報とビット | 00 – 01 |
| 0:25 – 0:45 | STEP 2　変調 | 02 – 04 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　ノイズと誤り訂正 | 05 – 07 |
| 1:10 – 1:25 | STEP 4　圧縮と暗号 | 08 – 09 |
| 1:25 – 1:45 | STEP 5　音と自由制作 | 10 – 13 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| キー入力が効かない | キャンバスを1回クリックしてフォーカスを合わせる |
| `startAudio is not defined` など | 一番下の「道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・マイクが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

音を使うスケッチは p5.sound ではなく、ブラウザ標準の **Web Audio API** を使っています（p5.js 1.x / 2.x どちらでも動きます）。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
