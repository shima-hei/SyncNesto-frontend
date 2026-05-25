# Project Role 取得API 追加依頼

## 背景

Syncnesto Frontend では、メニューやボタンなどの表示制御に role key を使っています。

システム全体の権限は `GET /auth/me` の `system_roles` で判定できますが、プロジェクト内の権限である `project_admin` / `manager` / `member` / `viewer` はプロジェクトごとに変わるため、現在のフロントエンドだけでは正確に判定できません。

要件定義機能では、同じ画面内で以下のように操作可否が分かれます。

| 操作 | 許可したい role |
|---|---|
| 閲覧 | `system_admin`, `project_admin`, `manager`, `member`, `viewer` |
| 作成 | `system_admin`, `project_admin`, `manager`, `member` |
| 更新 | `system_admin`, `project_admin`, `manager`, `member` |
| 削除 | `system_admin`, `project_admin` |
| コメント | `system_admin`, `project_admin`, `manager`, `member` |
| レビュー | `system_admin`, `project_admin`, `manager` |
| リンク | `system_admin`, `project_admin`, `manager`, `member` |
| 承認 | `system_admin`, `project_admin` |

バックエンド側で最終認可する前提は変えません。ただし、フロントエンドでもユーザーに不要なボタンやメニューを表示しないため、現在ログイン中のユーザーが対象プロジェクトで持っている project role key が必要です。

## 追加してほしいAPI

第一候補は、プロジェクトに対するログインユーザー自身の権限を取得するAPIです。

```http
GET /projects/{project_id}/me
```

### レスポンス例

```json
{
  "project_id": 1,
  "role": {
    "key": "manager",
    "name": "マネージャー"
  }
}
```

`system_admin` の場合、プロジェクトメンバーではないが全プロジェクトを操作できるケースがあるため、以下のどちらかで扱えると助かります。

案A:

```json
{
  "project_id": 1,
  "role": null,
  "is_system_admin": true
}
```

案B:

```json
{
  "project_id": 1,
  "role": {
    "key": "system_admin",
    "name": "システム管理者"
  }
}
```

フロントエンドとしては、案Aの方が system role と project role を分けて扱えるため分かりやすいです。

## 未参加ユーザーの場合

プロジェクトに参加しておらず、かつ `system_admin` でもない場合は、以下のどちらかが良いです。

```http
403 Forbidden
```

または

```http
404 Not Found
```

フロントエンドでは、認可不足として `/forbidden` 相当の表示にできます。

## 代替案

`GET /projects/{project_id}` のレスポンスに現在ログインユーザーの role を含める方法でも対応できます。

```json
{
  "id": 1,
  "project_code": "SYNC",
  "name": "Syncnesto",
  "status": "active",
  "version": 1,
  "current_user_role": {
    "key": "manager",
    "name": "マネージャー"
  },
  "is_system_admin": false
}
```

ただし、プロジェクト情報とログインユーザーの権限情報が混ざるため、フロントエンドとしては `GET /projects/{project_id}/me` の方が扱いやすいです。

## フロントエンドでの利用箇所

要件定義機能では、取得した role key を使って以下を制御します。

```ts
canViewRequirement
canCreateRequirement
canUpdateRequirement
canDeleteRequirement
canCommentRequirement
canReviewRequirement
canLinkRequirement
canApproveRequirement
```

例:

```ts
const canDeleteRequirement =
  isSystemAdmin || projectRoleKey === "project_admin";
```

この制御はあくまで表示制御です。API実行可否の最終判定はバックエンドの permission で行います。

## Orval生成への期待

OpenAPIに追加後、フロントエンドでは Orval により以下のような hook が生成される想定です。

```ts
useReadCurrentProjectMemberProjectsProjectIdMeGet(projectId)
```

名称はバックエンドの operationId に依存するため、実際の名前は問いません。

必要なのは、フロントエンドから以下を型付きで取得できることです。

```ts
type CurrentProjectRole = {
  project_id: number;
  role: {
    key: "project_admin" | "manager" | "member" | "viewer";
    name: string;
  } | null;
  is_system_admin: boolean;
};
```

## 結論

要件定義機能を含むプロジェクト配下の画面では、プロジェクトごとの role key がないと、フロントエンド側で正確な表示制御ができません。

そのため、`GET /projects/{project_id}/me` を追加し、ログインユーザーが対象プロジェクトで持つ project role key と、必要であれば `is_system_admin` を返してほしいです。
