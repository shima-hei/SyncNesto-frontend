# SyncNesto Frontend

テスト・タスク・開発管理を包括する個人開発アプリ「SyncNesto」のフロントエンドです。

## 技術スタック

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Orval

## 開発環境

依存関係をインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで以下を開きます。

```txt
http://localhost:3000
```

## 環境変数

ローカル開発では `.env.local` を使用します。`.env.local` はGit管理対象外です。

```env
NEXT_PUBLIC_API_BASE_URL=/api
API_BASE_URL=http://localhost:8000
AUTH_COOKIE_NAME=access_token
```

## よく使うコマンド

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run api:generate
```

## API生成

バックエンドのOpenAPI定義からOrvalでAPIクライアントを生成します。

```bash
npm run api:generate
```

生成ファイルは `lib/api/generated/` 配下に配置します。生成ファイルは手動編集しません。

## 認証・認可

フロントエンドでは、メニューやボタンなどの表示制御に `role key` を使用します。
最終的なAPI実行可否はバックエンド側の permission で判定します。

| role key | 表示名 | scope | できること |
|---|---|---|---|
| `system_admin` | システム管理者 | system | 全権限。ユーザー管理、全プロジェクト管理、メンバー管理、タスク、テスト設計書、テストケース、ドキュメント操作すべて |
| `project_admin` | プロジェクト管理者 | project | プロジェクト閲覧/更新/削除、メンバー招待/削除、タスクCRUD、テスト設計書CRUD、テストケースCRUD/実行、ドキュメントCRUD |
| `manager` | マネージャー | project | プロジェクト閲覧、タスクCRUD、テスト設計書閲覧/作成/更新、テストケース閲覧/作成/更新/実行、ドキュメント閲覧/作成/更新 |
| `member` | メンバー | project | プロジェクト閲覧、タスク閲覧/作成/更新、テスト設計書閲覧/作成/更新、テストケース閲覧/実行、ドキュメント閲覧/作成/更新 |
| `viewer` | 閲覧者 | project | プロジェクト、タスク、テスト設計書、テストケース、ドキュメントの閲覧 |

## ディレクトリ方針

- `app/`: Next.js App Router のルーティング
- `components/ui/`: shadcn/ui が生成する低レベルUIコンポーネント
- `components/shared/`: アプリ共通コンポーネント
- `features/`: 機能単位のコンポーネント、hooks、schemas、types
- `lib/api/generated/`: Orvalの自動生成コード
- `lib/api/`: APIクライアント、エラー、競合処理
- `lib/auth/`: Server Guardなどの認証処理

## ライセンス

Copyright (c) 2026 Kohei.

All rights reserved.

このリポジトリのソースコード、ドキュメント、画像、その他すべての成果物について、明示的な許可なく複製、再配布、改変、商用利用、派生物の作成を行うことを禁止します。
