# deadline_calender

## 手元に最新変更を反映する

```bash
git pull origin main
```

ローカル変更を捨ててリモート状態にそろえる場合:

```bash
git fetch origin
git reset --hard origin/main
```

## `not a git repository` が出るとき

リポジトリ直下に移動してからコマンドを実行してください。

```bash
cd /home/tashi/code/deadline_calender
git status
```

## commit されているか確認する

```bash
git status
git log --oneline -n 5
```

- `nothing to commit, working tree clean` が出れば、未コミット変更はありません。
- `git log` に期待するコミットメッセージがあれば、ローカル commit は完了しています。

## GitHub に反映する（push）

```bash
git push origin main
```

## 設計メモ

目的:
- 締切イベントをシンプルに登録し、日付順に一覧化して見落としを減らす。

最小データ構造:
- `id`: 一意な識別子
- `title`: 締切名
- `due_date`: 締切日（ISO 8601 形式を想定）
- `category`: 種別（課題、申請、支払いなど）
- `note`: 任意メモ
- `done`: 完了フラグ

基本フロー:
1. 入力フォームからイベントを作成・更新する。
2. 保存時に `due_date` の妥当性を検証する。
3. 一覧表示時に未完了イベントを期限昇順で表示する。
4. 期限超過を強調表示し、完了済みは折りたたみ表示する。

拡張方針:
- 直近 7 日の締切ハイライト
- カテゴリ別フィルタ
- iCal/CSV エクスポート
- 通知連携（メール・Slack）
