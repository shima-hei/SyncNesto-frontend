# 通知UI

APIと保存・生成ルールの詳細はバックエンドの `docs/frontend-notifications-api.md` を参照する。

Header、通知一覧、HOME、案件概要は、Orvalクライアントと `features/notifications/hooks/use-notifications.ts` を共通利用する。通知はイベントの既読状態であり、業務リソースの完了状態ではない。

- `NotificationCenter`: Headerの全案件未読件数と直近8件Popover。
- `NotificationList` / `NotificationItem`: 密度を保った共通の行表示、個別既読と対象への遷移。
- `NotificationSummary`: HOME/案件概要の直近5件。`projectId` を渡すと案件別になる。
- `/notifications`: すべて/未読、日別グループ、20件ずつのページング。`?project=ID` で案件別表示。
- `notification-display.ts`: 通知種別からの文言、target/contextからのURL、日別グループ。

45秒polling、画面遷移時の件数更新、ウィンドウ復帰時のrefetchを使用する。クエリはユーザーIDで分離し、既読化で各表示のキャッシュを無効化する。Header一覧はPopoverが開いているときだけ取得する。

発生時の名前・対象名・コメント抜粋を表示し、URLはDBから受け取らない。削除済み/権限なしの場合はリンクを無効化する。既読化が失敗した場合は対象に遷移せず、再試行できるtoastを表示する。

新しい通知種別を追加するときは、バックエンドschema、Orval生成コード、`notification-display.ts` の表示と遷移を更新する。HeaderやHOMEに別の通知状態を作らない。
