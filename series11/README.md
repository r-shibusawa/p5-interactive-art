# シリーズ11：基本データ構造 ─ p5.js コード集

スタック、キュー、連結リスト、ハッシュ表、二分探索木、赤黒木、拡張データ構造。データを「しまう形」で速さが何倍も変わることを、動くアニメーションで体験するワークショップ（110分）のコード集です。

参考：Cormen ほか『Introduction to Algorithms』

[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series11/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 08 以降の木のスケッチは、一番下に「木を描く道具」「赤黒木の道具」があります。**一番下まで全部コピー**してください
5. 木のスケッチは途中経過を「コマ」で再生します。`P` で一時停止、`←` `→` でコマ送り

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [スタックとキュー](sketches/00_stack_queue/sketch.js) | LIFO と FIFO、循環バッファ | P O E D スペース | |
| 01 | [双方向連結リストと番兵](sketches/01_linked_list/sketch.js) | 挿入・探索・削除 | 数字+Enter S D クリック | |
| 02 | [ポインタを配列で作る](sketches/02_array_pointers/sketch.js) | next/key/prev と空きリスト | スペース クリック | |
| 03 | [根つき木の表し方](sketches/03_rooted_trees/sketch.js) | 左子・右兄弟表現 | クリック 1 2 スペース | |
| 04 | [直接アドレス表](sketches/04_direct_address/sketch.js) | キー = 番号。U が大きいと困る | クリック S 1〜3 | |
| 05 | [チェイン法のハッシュ表](sketches/05_hash_chaining/sketch.js) | 衝突をリストで、負荷率 α | 数字+Enter S D ↑↓ H | |
| 06 | [よいハッシュ関数とは](sketches/06_hash_functions/sketch.js) | 割り算法・かけ算法・ユニバーサル | 1〜6 ↑↓ R | |
| 07 | [オープンアドレス法](sketches/07_open_addressing/sketch.js) | 線形・二次・ダブルハッシュ、削除 | スペース M T クリック | |
| 08 | [二分探索木：探す・なぞる](sketches/08_bst_basics/sketch.js) | 探索・最小・後者・3 つのなぞり方 | 数字+Enter S N X W クリック | |
| 09 | [二分探索木の削除](sketches/09_bst_delete/sketch.js) | TRANSPLANT と 3 つの場合 | クリック 数字+D | |
| 10 | [入れる順番と木の高さ](sketches/10_random_bst/sketch.js) | ランダムなら O(log n) | 1〜3 ↑↓ | |
| 11 | [赤黒木：挿入と回転](sketches/11_rb_insert/sketch.js) | ケース 1〜3 | 数字+Enter A F スペース | |
| 12 | [赤黒木：削除](sketches/12_rb_delete/sketch.js) | ケース 1〜4 | クリック 数字+D | |
| 13 | [順序統計木](sketches/13_order_statistic/sketch.js) | k 番目を探す（SELECT）/ 順位を求める（RANK） | 数字+S クリック | |
| 14 | [木の音楽](sketches/14_tree_music/sketch.js) | 探索の道のりを音に。**自由制作のベース** | クリック スペース W A | 🔊 |
| 15 | [区間木](sketches/15_interval_tree/sketch.js) | 重なる区間を探す | ドラッグ Q スペース F | |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：データ構造で速さが変わる | — |
| 0:10 – 0:25 | STEP 1　並べてしまう（スタック・キュー・リスト・木） | 00 – 03 |
| 0:25 – 0:45 | STEP 2　ハッシュ表 | 04 – 07 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:05 | STEP 3　二分探索木 | 08 – 10 |
| 1:05 – 1:25 | STEP 4　赤黒木と拡張 | 11 – 13 |
| 1:25 – 1:45 | STEP 5　音と自由制作 | 14 |
| 1:45 – 1:50 | 発表・まとめ | — |
| 発展 | 区間木 | 15 |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| `recordFrame is not defined` / `rbInsert is not defined` | 一番下の「木を描く道具」「赤黒木の道具」までコピーできていない → 全部コピーし直す |
| アニメーションが止まった | `P` で再生・一時停止が切りかわる。`←` `→` でコマ送り |
| 数字を打っても入らない | 数字のあとに `Enter`（挿入）、`S`（探索）、`D`（削除）を押す |
| 木がはみ出す | 節点を減らす（`R` で作り直し）。画面を大きく |
| 音が出ない | キャンバスを1回クリック |

アルゴリズムの手順はコメントも含めて自分の言葉で書いています（赤黒木の挿入はケース 1〜3、削除はケース 1〜4 に分けて表示）。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
