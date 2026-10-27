# シリーズ13：高度なデータ構造 ─ p5.js コード集

B木、フィボナッチヒープ、van Emde Boas 木、互いに素な集合。たくさんのデータを「速く」扱うための、工夫のつまったデータ構造を動かして理解するワークショップ（110分）のコード集です。

参考：Cormen ほか『Introduction to Algorithms』

[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series13/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音のスケッチは、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする
5. 数字を入力するスケッチは、キャンバスを1回クリックしてからキーを押す

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [B木の探索](sketches/00_btree_search/sketch.js) | 最小次数 t、高さ、DISK-READ、2-3-4 木 = 赤黒木 | 数字+Enter スペース ←→ V | |
| 01 | [B木への挿入](sketches/01_btree_insert/sketch.js) | 先回り分割 SPLIT-CHILD | 数字+Enter スペース A ←→ | |
| 02 | [B木からの削除](sketches/02_btree_delete/sketch.js) | ケース 1・2a・2b・2c・3a・3b | キーをクリック スペース I | |
| 03 | [二項ヒープ](sketches/03_binomial_heap/sketch.js) | 2 進数の足し算と UNION | スペース X U クリック | |
| 04 | [フィボナッチヒープ](sketches/04_fib_heap/sketch.js) | INSERT・UNION・EXTRACT-MIN・CONSOLIDATE、ポテンシャル | スペース X U P N | |
| 05 | [キーを減らす](sketches/05_fib_decrease_key/sketch.js) | CUT・CASCADING-CUT・印・DELETE | クリック D スペース X | |
| 06 | [なぜ「フィボナッチ」？](sketches/06_fib_degree_bound/sketch.js) | 次数の上限 F(k+2) ≥ φ^k、ヒープの比較表 | ←→ スペース H | |
| 07 | [ビットベクトルと要約](sketches/07_bit_vector_summary/sketch.js) | √u 個のかたまり、high・low・index | クリック スペース ←→ | |
| 08 | [proto-vEB](sketches/08_proto_veb/sketch.js) | 再帰的な要約と呼び出しの数 | スペース 数直線クリック M | |
| 09 | [van Emde Boas 木](sketches/09_veb_tree/sketch.js) | min/max の工夫で O(lg lg u) | クリック スペース P ←→ | |
| 10 | [互いに素な集合（連結リスト）](sketches/10_linked_list_sets/sketch.js) | 重みつき合併 | 2 つクリック W B | |
| 11 | [互いに素な集合の森](sketches/11_union_find_forest/sketch.js) | ランクによる合併・経路圧縮・α(n) | クリック ドラッグ K P C | |
| 12 | [迷路をつくる](sketches/12_maze_kruskal/sketch.js) | ランダム版クラスカル法、合併を音に | スペース ↑↓ 1〜3 S | 🔊 |
| 13 | [しみこみブラシ](sketches/13_percolation_brush/sketch.js) | 連結成分とパーコレーション（**自由制作のベース**） | ドラッグ A ←→ S C | 🔊 |
| 14 | [オフライン最小値問題](sketches/14_offline_minimum/sketch.js) | 先読みで EXTRACT-MIN に答える | スペース A N | |
| 15 | [タージャンのオフライン LCA](sketches/15_tarjan_lca/sketch.js) | 深さ優先探索 × 互いに素な集合 | スペース A クリック N | |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：なぜ「速い」データ構造が必要か | — |
| 0:10 – 0:25 | STEP 1　B木 | 00 – 02 |
| 0:25 – 0:45 | STEP 2　マージ可能ヒープ | 03 – 06 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　van Emde Boas 木 | 07 – 09 |
| 1:10 – 1:25 | STEP 4　互いに素な集合 | 10 – 11 |
| 1:25 – 1:45 | STEP 5　応用・音と自由制作 | 12 – 13 |
| 1:45 – 1:50 | 発表・まとめ | — |

14・15 は発展編（時間に余裕があるとき・授業後に）。

## 困ったときは

| 症状 | 解決法 |
|---|---|
| キーを押しても反応しない | キャンバスを1回クリックしてから押す |
| アニメーションが速すぎる・遅すぎる | `SPEED`（1 コマの秒数）を変える。P で一時停止できるスケッチもある |
| 木が画面からはみ出す | キーの数（`N`・`START`）を減らす、ウィンドウを広げる |
| `startAudio is not defined` など | 一番下の「道具」までコピーできていない → 全部コピーし直す |
| 音が出ない | キャンバスを1回クリック ／ S（M）で消音になっていないか確認 |

アルゴリズムは標準的な手順をもとに、このワークショップ用に書いたコードです。B木の削除・フィボナッチヒープ・vEB 木などは、ランダムな操作をくり返して正しさを確かめてあります。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
