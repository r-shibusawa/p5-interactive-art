# シリーズ41：組合せ論 ─ p5.js コード集

「何通りあるか」を目で見て数える。順列・組合せ・二項係数から、パスカルの三角形と母関数、鳩の巣原理・包除原理・カタラン数・整数分割、ラムゼー理論やラテン方格まで。小さい場合をすべて列挙してアニメーションで確かめるワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series41/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチ（13）は、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする。📷 カメラ（15）はアドレスバーで許可する

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [順列をすべて並べる](sketches/00_permutations/sketch.js) | n! 通り。Heap のアルゴリズムと辞書順 | ↑↓＝n スペース L R マウス＝速さ | |
| 01 | [組合せと二項係数](sketches/01_combinations/sketch.js) | C(n,k) の一覧、漸化式と対称性 | ↑↓＝n ←→＝k H C | |
| 02 | [格子路の数え上げ](sketches/02_lattice_paths/sketch.js) | C(m+n,n)、各点を通る道の数 | ←→ ↑↓ クリック スペース R | |
| 03 | [パスカルの三角形](sketches/03_pascal_triangle/sketch.js) | mod m でシェルピンスキー模様、性質のハイライト | ↑↓＝m ←→＝行数 H N | |
| 04 | [母関数で数える](sketches/04_generating_functions/sketch.js) | コインの組合せと分割数を多項式の積で | 1〜6 P スペース ↑↓ | |
| 05 | [重複組合せ（星と棒）](sketches/05_stars_and_bars/sketch.js) | C(n+k−1,k−1) の一覧とヒストグラム | ↑↓＝n ←→＝k スペース クリック | |
| 06 | [鳩の巣原理](sketches/06_pigeonhole/sketch.js) | n+1 羽を n 巣へ。差が n の倍数のペア | ↑↓ スペース ドラッグ M N | |
| 07 | [包除原理](sketches/07_inclusion_exclusion/sketch.js) | 和集合の数を足し引き、攪乱順列 D_n | 3/4 ドラッグ スペース A D | |
| 08 | [カタラン数](sketches/08_catalan/sketch.js) | Dyck 経路・括弧列・二分木・三角形分割 | ↑↓ ←→ クリック スペース | |
| 09 | [整数分割とヤング図形](sketches/09_partitions/sketch.js) | p(n) の列挙、共役分割（転置）、五角数定理 | ↑↓ ←→ クリック T スペース | |
| 10 | [ラムゼー理論：R(3,3) = 6](sketches/10_ramsey/sketch.js) | K_6 の 2 色塗りに必ず単色三角形 | 5/6 クリック スペース E A | |
| 11 | [ラテン方格と魔方陣](sketches/11_latin_squares/sketch.js) | 直交ラテン方格（グレコ・ラテン）→ 魔方陣 | ↑↓ 1〜3 スペース R | |
| 12 | [帽子問題と確率](sketches/12_derangements_hats/sketch.js) | 攪乱順列のシミュレーション、1/e に収束 | ↑↓ スペース R マウス | |
| 13 | [順列を聴く（チェンジリンギング）](sketches/13_permutation_sound/sketch.js) | n! 通りの並びを全部鳴らす。転倒数で音色 | クリック ↑↓ M マウス | 🔊 |
| 14 | [パスカル・ブラシ](sketches/14_pascal_brush/sketch.js) | 二項係数 mod m のスタンプ。自由制作のベース | クリック ドラッグ ↑↓ ←→ F C S | |
| 15 | [カメラ映像で数える](sketches/15_webcam_combinatorics/sketch.js) | 明るいセルの組合せ C(k,r) と分割 | マウス左右 ↑↓ N | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：「数える」とは何か | — |
| 0:10 – 0:30 | STEP 1　数える | 00 – 02 |
| 0:30 – 0:45 | STEP 2　パスカルと母関数 | 03 – 05 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　原理と有名な数列 | 06 – 08 |
| 1:10 – 1:25 | STEP 4　構造と彩色 | 09 – 12 |
| 1:25 – 1:45 | STEP 5　音・ブラシ・自由制作 | 13 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| 画面が固まる・遅い | n を減らす（00 の n、09 の n、14 の `rowsMax`）。一覧が多すぎると重い |
| 数が大きすぎて `Infinity` や `e+21` になる | `Number` は約 9×10^15 まで。15 のように `BigInt`（`1n`, `BigInt(x)`）で計算する |
| 一覧が画面からはみ出す | タイルの大きさ（`cell`, `s`）を小さくするか、`perRow` の計算を見直す |
| `startAudio is not defined` | 一番下の「音を鳴らすための道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可（15 はカメラがなければノイズ画像で動く） |

すべて小さい n を実際に列挙して確かめる形にしてあります。式は組合せ論の教科書（Stanley『Enumerative Combinatorics』、Graham–Knuth–Patashnik『Concrete Mathematics』など）と同じ形です。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
