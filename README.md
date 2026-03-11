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
