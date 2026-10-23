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

# Phase 2B-3b: 承認メールの本人設定

Server側 `FIXED_APPROVAL_EMAIL_ENABLED=true` のLOCALで、社内 `/notifications` と共有 `/shared/notifications` に同じshadcn設定欄を表示する。新page/permission/依存はない。

初期OFFで保存後の新通知だけが対象。設定は全案件共通。概要は種類・固定名・出来事、本文/結果理由/添付なし。届いたメールには名称が残ることを説明する。

`/notification-preferences` GET/PATCHはOrval生成クライアントを使用する。tenantを付けずno-store、本人変更/focus/再表示/接続復帰時は再認証して取得する。PATCHは設定versionと、画面に結び付いた `X-Syncnesto-Expected-User` を送る。古いCookie本人との不一致は403、古いversionは409で読み直す。読込失敗をOFFや保存成功と扱わず、楽観的ON・設定のlocalStorage保存は行わない。

配送はBackendのLOCAL workerから既存Mailpitへ限定。UIにSMTP台帳や内部コードは出さない。招待/認証メールは別系統で、メール閲覧や既読で承認を保存しない。
