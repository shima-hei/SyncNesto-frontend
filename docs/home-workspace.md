# HOMEと日常・管理ナビゲーション

HOMEは「今日の作業 → あなたへの通知 → 参加中のプロジェクト」の縦構成。見出し、コンパクトな件数、行リンク、Separator、Tableで比較し、巨大なCardやKPIは使わない。ページ余白とテーマtokenは既存シェル・デザインシステムに従う。

`features/home/components/pages/home-page.tsx` はclient境界。作業と案件は独立して並列取得し、既存 `NotificationSummary` を間に置く。各セクションでSkeleton・取得エラーの再試行・EmptyStateを扱い、一つの失敗で他の操作を止めない。

- 作業: `GET /home/tasks`、最大8行。本人の未完了タスクを期限超過、今日、7日以内、その他の順。集計は表示行数とは独立。行全体は既存詳細へのLinkで、キーボードと別タブ操作も可能。
- 通知: 同じNotification API、NotificationList / Itemを使用して直近5件。既読・遷移・すべて見るは既存実装のまま。
- 案件: `GET /home/projects`、最大8案件。管理者も所属案件のみ。本人の未完了件数と案件全体の期限超過・完了/全体・次のTask期限を表示。行クリックと名称Linkから概要、本人件数から既存タスク一覧を担当者で絞った `?assignee=me` へ移動する。狭い幅では完了/全体・次の期限を案件名の下へ移す。
- 日付: ブラウザのIANA timezoneを渡し、APIのtodayを見出しと期限判定で共有。時刻のないDateはブラウザのUTC offsetで別の日へ変換しない。
- キャッシュ: 本人IDで分離、60秒polling（非表示タブでは停止）、focusでrefetch、業務変更時の無効化。

Sidebarは「ホーム」「プロジェクト」を日常の直接リンクにする。別の「管理」Groupに「プロジェクト管理」「ユーザー管理」を配置し、既存仕様に従ってsystem_adminだけへ表示する。project_adminは案件内の管理導線を使用する。バックエンドの既存認可・Server Guardは維持する。

日常用の案件一覧は `member_only=true`。管理一覧は従来の全案件。パンくずと一覧見出しも名称を合わせ、`/projects/joined`、`/projects/management`、`/system/users` のルートを維持する。

専用マイタスク画面は追加していない。残りのタスクは「案件別のタスクを見る」と案件表の本人件数から既存一覧へ進む。既存一覧の担当者条件は本人で、状態は従来のすべてを維持する。将来は同じ抽出ルールにpaging/filterを加えた専用画面を作り、その完成後にSidebarへ追加する。

業務モデルに明確な対象・宛先・状態が用意された段階でレビュー依頼、期限、担当要件等を別セクションとして追加できる。根拠のない進捗率や、通知既読をタスク完了に読み替える集計は行わない。

API契約はBackendの `docs/frontend-home-api.md` を参照する。フロントのDate・遷移・ナビゲーションのテスト、format/typecheck/lint/build、実ブラウザで両テーマ・390px幅・一般ユーザー/管理者・対象遷移・空状態を確認する。
