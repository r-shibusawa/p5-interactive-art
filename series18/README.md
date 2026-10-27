# シリーズ18：NP完全性と近似アルゴリズム ─ p5.js コード集

答えを確かめるのはかんたん、見つけるのは難しい。P と NP、還元による NP 完全性の証明、そして「最適でなくても保証つき」の近似アルゴリズムを体験するワークショップ（110分）のコード集です。
参考：Cormen ほか『Introduction to Algorithms』

[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series18/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチ（12・13）は、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [多項式時間 vs 指数時間](sketches/00_growth_race/sketch.js) | 増え方の競争、判定問題と最適化問題 | 左右＝n スペース 1/2 | |
| 01 | [答えを「確かめる」のはかんたん](sketches/01_ham_verify/sketch.js) | ハミルトン閉路の検証と総当たり | 点をクリック V スペース 1〜3 | |
| 02 | [回路充足可能性](sketches/02_circuit_sat/sketch.js) | AND・OR・NOT の回路を総当たり | 入力をクリック スペース 1〜3 | |
| 03 | [SAT を探索木で解く](sketches/03_sat_search/sketch.js) | 総当たり・枝刈り・単位節 | スペース 1〜3 R U | |
| 04 | [どんな式も 3-CNF に変身](sketches/04_to_3cnf/sketch.js) | SAT ≤p 3-CNF-SAT | 左右＝段階 上下 1〜3 | |
| 05 | [3-CNF-SAT → クリーク](sketches/05_cnf_to_clique/sketch.js) | 節ごとの点と矛盾しない線 | 点をクリック スペース R | |
| 06 | [クリーク ↔ 頂点被覆](sketches/06_clique_vertex_cover/sketch.js) | 補グラフ | クリック ドラッグ スペース R | |
| 07 | [巡回セールスマンを総当たり](sketches/07_tsp_bruteforce/sketch.js) | (n−1)! 通り、HAM-CYCLE ≤p TSP | クリック スペース 上下 H | |
| 08 | [部分和問題](sketches/08_subset_sum/sketch.js) | 表で解く・3-CNF からの還元 | 1/2 スペース 上下 クリック | |
| 09 | [頂点被覆の 2 倍近似](sketches/09_vertex_cover_approx/sketch.js) | 線を選んで両端を取る | スペース O クリック ドラッグ | |
| 10 | [TSP の 2 倍近似](sketches/10_metric_tsp/sketch.js) | MST をなぞって近道、三角不等式 | スペース N クリック R | |
| 11 | [集合被覆の貪欲法](sketches/11_set_cover/sketch.js) | いちばん多くカバーする集合から選ぶ | スペース O クリック 2 | |
| 12 | [MAX-3-CNF を聞く](sketches/12_max3cnf_sound/sketch.js) | 乱択で 7/8 | クリック スペース 1/2 | 🔊 |
| 13 | [NP 完全の遊び場](sketches/13_np_playground/sketch.js) | 4 つの問題を解く。**自由制作のベース** | クリック ドラッグ 1〜4 スペース S | 🔊 |
| 14 | [線形計画で緩めて丸める](sketches/14_weighted_vc_lp/sketch.js) | 重みつき頂点被覆 | スペース クリック R 1 | |
| 15 | [部分和の近似スキーム](sketches/15_subset_sum_fptas/sketch.js) | リストを間引く FPTAS | 上下＝ε スペース 1〜3 | |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：解くのと確かめるのはちがう | — |
| 0:10 – 0:25 | STEP 1　多項式時間と検証 | 00 – 01 |
| 0:25 – 0:45 | STEP 2　充足可能性 | 02 – 04 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　還元で広がる NP 完全 | 05 – 08 |
| 1:10 – 1:25 | STEP 4　近似アルゴリズム | 09 – 11 |
| 1:25 – 1:45 | STEP 5　音と自由制作 | 12 – 13 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| 画面が固まる・終わらない | 総当たりは点・都市・変数の数に対して指数的に遅くなる。数を減らす（`MAX_N`、`MAX_CITIES`、`N` など） |
| `startAudio is not defined` など | 一番下の「道具」までコピーできていない → 全部コピーし直す |
| 最適解が表示されない | 点が多すぎると総当たりを省略している（画面の説明を読む） |
| 音が出ない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

総当たりのスケッチは、ブラウザが固まらないように探索を少しずつ（フレームごとに）進めています。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
