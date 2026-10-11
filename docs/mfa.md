# 通常アカウントの追加認証

2026-10-11実装。公開環境への適用・実機Passkey確認は未実施。
方針・API・移行の正は隣接Backendの `docs/mfa.md`、`docs/frontend-authorization.md`、
`docs/decisions/2026-10-10-mfa-authorization.md` を参照する。

## 画面と状態

- `/login`: パスワード成功後、通常アカウントは `next_step` に従って `/mfa` に進む。初回パスワード設定の制限は維持する。
- `/mfa`: TOTP/Passkeyの登録・検証、初回の復旧コード保存を扱う。MFA完了後に通常セッションを取得してホーム、または検証済みのMCP同意画面に戻る。
- `/account`: 「追加認証」で認証器・復旧コード残数を確認し、予備の追加・名前変更・削除・復旧コード再発行を行う。
- `/mfa/recover`: 運営者が本人確認後に送ったリンクとパスワードで再登録する。リンクのtokenはfragmentからメモリへ移し、URL履歴から除去する。
- `/system/users/[userId]`: 別のシステム運営者が本人確認の方法・理由を記録し、復旧を支援する。組織管理・自己解除には提供しない。

通常アカウント全員が対象。匿名デモには表示せず、既存の体験を維持する。
アカウント設定の機微操作は5分以内の追加認証が必要。期限後はパスワードとTOTP/Passkeyで再認証する。
認証器削除・運営復旧は全通常セッションとMCP接続を失効する。最後の認証器は削除できない。

## 実装上の境界

- `mfa_flow` は通常認証Cookieではない。限定Cookieだけの場合、Server Guardは `/mfa` に戻し、本人情報・業務APIを取得しない。
- 通常セッションがMFA未確認なら `MFA_REQUIRED` を受け、再ログインする。認証設定内の再認証エラーは画面内で扱う。
- BFFのCSRFは通常Cookieに加え限定Cookieも対象。限定Cookie→通常Cookieの切り替えを `Set-Cookie` で中継する。
- TOTP秘密、Passkey応答、復旧コードはComponentのメモリだけで扱う。localStorage・IndexedDB・Query Cacheへ保存しない。
- OrvalのMFAクライアントはBackend OpenAPIから生成する。手動編集しない。
- SimpleWebAuthn/browserはユーザー操作時に読み込む。本人の生体認証・端末登録はユーザーが操作する。
- フロントの表示制御に依存せず、Backendが本人・認証状態・Permissionを最終判定する。MFAで運営・組織・Projectの権限を増やさない。

## 検証

- 追加したCSRF・Server Guard・BFF Cookie中継の4件を含む79件のFrontendテストを通過。
- format、typecheck、lint、本番buildを通過。
- CIと同じNode 22.23.3/npm 10.9.9のLinux環境で、依存関係を空から `npm ci --ignore-scripts` できることを確認。既存lockに欠落していたWASM用 `@emnapi/core` / `@emnapi/runtime` の記録だけを補完し、既存依存のバージョンは維持した。
- 専用の使い捨てローカルDBで、初回登録案内・キャンセル・既存テスト用TOTPによるログイン・ホーム・アカウント設定をブラウザ確認。
- 実機Passkeyの登録/生体認証、個人の認証アプリへの登録、公開環境での確認は未実施。

次の開発は運営・組織管理・Project業務の画面表示と名称の整理。公開への適用はBackendの移行手順に従う。
