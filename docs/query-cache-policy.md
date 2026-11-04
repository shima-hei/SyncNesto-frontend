# 候補検索・通知の取得方針

`lib/query/cache-policy.ts` に寿命と再取得の判定をまとめる。独自の永続キャッシュや別のデータ取得ライブラリは追加せず、既存のTanStack Queryを使う。

| 対象 | 方針 |
| --- | --- |
| 案件の担当者候補・追加メンバー候補 | 60秒の鮮度期間。検索値は共通 `useDebouncedValue` で250ms待ち合わせる |
| ボード・案件別Task種別 | 既存の60秒を共通定数へ移す |
| 通知一覧・未読数 | 既存の45秒間隔・15秒の鮮度期間・非表示中の定期取得停止・フォーカス再取得を保持 |
| 通知の画面遷移時取得 | 取得済みで15秒未満なら追加取得しない。失効済み・失敗・期限経過時は再取得し、処理中の要求を中断して重ねない |

案件メンバーの追加/削除/Role変更後は、一覧・担当者候補・追加候補を同じヘルパーで失効させる。利用者情報の変更後も現在のQueryClientにある案件候補を失効させる。案件別のクエリーキーと既存のTenantCache/ログアウト時破棄を維持し、本人の権限はAPIで毎回判定する。

## 計測と検証

`lib/query/cache-policy.test.mjs` は実際のQueryClient/QueryObserverで、同じ候補の6回表示が6取得→1取得になること、更新後/別案件では再取得することを確認する。通知では取得直後の5回の画面遷移について、追加取得5回→0回、15秒経過/失敗後/明示失効後の再取得を確認する。

検索の連続5文字は、模擬タイマーで確定検索値の更新を1回にまとめ、解除後に古いタイマーを実行しないことを確認する。これは入力列を固定した制御計測であり、本番利用全体の要求削減率ではない。共有クライアントを変更するキャッシュやサーバーの権限判定キャッシュは追加していない。

戻す場合はコード差分をrevertする。環境変数・DB migration・生成APIクライアントの変更は不要。

一次情報: [TanStack Queryの鮮度と定期取得](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)、[useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQuery)。
