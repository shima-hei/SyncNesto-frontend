# SyncNesto

テスト・タスク・開発管理を包括する個人開発アプリ

## ディレクトリ構成

リポジトリの主なディレクトリとファイル構成（主要なものを抜粋）:

```
./
├─ README.md
├─ backend/                # NestJS バックエンドアプリケーション
│  ├─ package.json
│  ├─ src/
│  │  ├─ main.ts
│  │  ├─ app.module.ts
│  │  ├─ app.controller.ts
│  │  └─ ...
│  └─ test/
├─ packages/
│  └─ db/                  # データベース関連パッケージ（Prisma schema など）
│     ├─ package.json
│     └─ prisma/
│        └─ schema.prisma
├─ src/                    # Next.js フロントエンドアプリケーション
│  ├─ app/
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ public/
│  └─ package.json
├─ be_env/                 # バックエンド用環境ファイル置き場
├─ fe_env/                 # フロントエンド用環境ファイル置き場
├─ DB/                     # DB 設計関連ファイル（dbml など）
└─ .gitignore

```
