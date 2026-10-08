# 組織の監査ログ

組織管理の「監査ログ」から `/organization/audit-logs` へ移動する。
現在組織のOwner・管理者だけが利用でき、Backendも所属と権限を判定する。
日時、操作者ID、操作種別、案件IDで絞り込み、25件ずつページ送りと詳細表示を行う。
終了日を含め、日付・時刻は端末のタイムゾーンで扱う。

既存の重要操作の記録を表示する。組織に紐づかないログイン記録は対象外。
本文・自由記述metadata・IP・User-Agent・request_idは返さない。
対象や所属が削除済みでも証跡を残し、取得できない名称はIDで表示する。
未知の操作種別はコードを表示し、新しい種別を隠さない。

API契約: Backend `docs/frontend-audit-logs-api.md`。
モデル/APIクライアントはBackend OpenAPIからOrvalで再生成する。
MCPは後続課題。要件定義とテスト設計の作成までを提供する方針。

## テスト

`npm test` で `tests` / `features` / `lib` の `.test.mjs` を再帰的に収集する。
CIも同じコマンドを使う。既存の検証を維持し、ディレクトリによる実行対象漏れを防ぐ。
開発中の個別検証は `node --test path/to/file.test.mjs`、仕上げはformat・型・lint・buildも確認する。
