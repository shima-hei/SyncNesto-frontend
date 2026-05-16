# SyncNesto

テスト・タスク・開発管理を包括する個人開発アプリ

## 認可ロール

フロントエンドでは、メニューやボタンなどの表示制御に `role key` を使用します。
最終的なAPI実行可否はバックエンド側の permission で判定します。

| role key | 表示名 | scope | できること |
|---|---|---|---|
| `system_admin` | システム管理者 | system | 全権限。ユーザー管理、全プロジェクト管理、メンバー管理、タスク、テスト設計書、テストケース、ドキュメント操作すべて |
| `project_admin` | プロジェクト管理者 | project | プロジェクト閲覧/更新/削除、メンバー招待/削除、タスクCRUD、テスト設計書CRUD、テストケースCRUD/実行、ドキュメントCRUD |
| `manager` | マネージャー | project | プロジェクト閲覧、タスクCRUD、テスト設計書閲覧/作成/更新、テストケース閲覧/作成/更新/実行、ドキュメント閲覧/作成/更新 |
| `member` | メンバー | project | プロジェクト閲覧、タスク閲覧/作成/更新、テスト設計書閲覧/作成/更新、テストケース閲覧/実行、ドキュメント閲覧/作成/更新 |
| `viewer` | 閲覧者 | project | プロジェクト、タスク、テスト設計書、テストケース、ドキュメントの閲覧 |

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
