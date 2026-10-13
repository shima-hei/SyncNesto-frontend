# 公開情報ページ

2026-10-13。ログイン不要の問い合わせ・プライバシーポリシー・利用規約を追加する。
本文は `app/support/page.tsx`、`app/privacy/page.tsx`、`app/terms/page.tsx` が正となる。
この記録の作成時点では本番未反映で、公開文面の確認後に反映する。

## 確定した提供条件

- 発行者は `shime-hei`、窓口は `syncnesto@gmail.com`。
- 個人のポートフォリオとして無料で試用可能。通常アカウントは運営者の招待制。
- 通常アカウントを含め、業務データには架空のサンプルのみを登録する。実際のアカウント・認証・操作ログは取り扱う。
- 継続提供・稼働時間・無期限保存を保証しない。
- 通常アカウント全員のMFA必須、匿名デモのMCP不可、独立した期限付き審査IdentityだけのMFA免除を維持する。
- 2026-10-13本人回答: 保存・削除は現行の挙動を明記し、本人確認後に個別の削除相談へ対応する。未実装の自動削除や失効時の即時全削除を約束しない。ごみ箱の標準30日保持は維持する。
- 同日本人回答: 停止・終了・重要な改定はサイト上で案内し、可能な場合は事前告知する。緊急の安全対策は例外とし、固定の通知日数・稼働保証を設けず、準拠法は日本法とする。

## 実装上の境界

3ページはServer Componentで本文を返し、業務API・DBへアクセスしない。
`AuthProvider` はこの3つの完全一致パスだけで現在ユーザーの取得を止め、
セッション失効・初期パスワード変更・デモ終了でログインへ飛ばさない。
業務画面のServer Guard、Cookie、MFA、CSRF、バックエンドの認可は変更しない。
ログイン画面から3ページへのリンクを追加し、各ページからログインへ戻れる。

## 保存先・情報の取扱いの根拠

2026-10-13に既存クラウドのプロジェクトメタデータを読み取り、
Neonの通常用・デモ用は `aws-ap-southeast-1`、Supabaseの通常用・デモ用は
`ap-southeast-1`（いずれもシンガポール）と確認した。クラウド設定は変更していない。
Vercelでの配信・API実行、Gmailでの通知/問い合わせ、任意のCodex連携によるOpenAIへの応答送信も説明する。
保存先リージョンが、関連するすべての処理・保守・外部連携の実施国を限定するとは説明しない。

保持の説明はBackendの `plugins/publication-draft.ja.md`、`docs/mcp.md`、`docs/mfa.md`、
`docs/email-approval.md` と実装を照合した。資格情報の失効と行の実削除、
ごみ箱の復元期間と回収成功、ブラウザ下書きの利用期限と遅延除去を区別する。
広告用の解析SDKは現行Frontend依存・コードに存在せず、取得情報を広告/販売へ使う目的は設けない。

審査動画は本人指定のGoogle DriveでMP4だけをリンク共有する。
DriveのURLや原始ログ、審査資格情報はこのリポジトリへ保存しない。

## 公開・申請の順序

1. 本文の確認、ローカル検証、PRレビュー。
2. 既存Frontendへ公開反映し、3つの実URLの200応答・ログイン不要・内容一致を確認する。
3. 実URLと再生確認済みの動画URLをGit外の申請listingへ設定する。
4. 申請ZIPを検証し、既存の非公開Draftを更新する。審査資格情報は安全なReview欄だけに入力する。

URLを用意しただけで審査提出・公開完了と扱わない。接続・migration・審査サンプル・8ケースを再発行/再実行しない。

## ローカル検証（2026-10-13）

- format、typecheck、lint、本番build成功。既存MFAセキュリティテスト4件成功。
- 本番buildを3107番で起動し、3ページのHTTP 200とハイドレーション後の本文表示、ページ間のリンク、ログイン画面からの導線を確認した。
- 未ログインの `/`、`/account`、`/projects/joined` は従来どおり `/login` へ307。`/privacy/unknown` は404で、前方一致で認証対象外にしていない。
- 390px幅で3ページとも横スクロールなし。ライト/ダークの表示を確認し、試験後は端末設定テーマ・通常のviewportへ戻した。
- 業務API・DBの変更はない。公開反映後の検証と申請への登録は別途実施する。

## 参照

- [個人情報保護委員会・通則編](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)
- [OpenAIの提出項目](https://developers.openai.com/plugins/deploy/submission)
- [Vercelのプライバシー説明](https://vercel.com/legal/privacy-notice)
- [Neonのプライバシー説明](https://neon.com/privacy-policy)
- [Supabaseのプライバシー説明](https://supabase.com/privacy)
- [Googleのプライバシー説明](https://policies.google.com/privacy?hl=ja)
- [OpenAIのプライバシーポリシー](https://openai.com/policies/row-privacy-policy/)
