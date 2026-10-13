import type { Metadata } from "next";
import {
  PublicInformationPage,
  PublicInformationSection,
} from "@/components/shared/public/public-information-page";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "無料のポートフォリオ試用環境として提供するSyncnestoの利用条件。",
};

export default function TermsPage() {
  return (
    <PublicInformationPage
      path="/terms"
      title="利用規約"
      description="Syncnestoを利用する際の条件です。架空のサンプルを使った無料の試用に適用します。"
    >
      <PublicInformationSection title="1. 提供者と目的">
        <p>
          shime-hei（以下「運営者」）は、要件定義、テスト設計、タスク、文書等を扱うSyncnesto（以下「本サービス」）を個人のポートフォリオとして無料で提供します。通常アカウントは運営者による招待制です。継続提供、稼働時間、業務での利用に必要な水準を保証するものではありません。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="2. アカウントと認証">
        <p>
          自分に発行されたアカウントを使用し、認証情報をほかの人と共有しないでください。通常アカウントにはMFAが必要です。利用できる範囲は、現在の所属・権限に従います。
        </p>
        <p>
          匿名デモにはMFAを求めませんが、Codex連携は利用できません。公開審査専用の期限付きアカウントは、独立した審査用組織のサンプルだけを対象にMFAを免除します。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="3. 登録できる情報">
        <p>
          業務データには、保存・共有する権利を持つ架空のサンプルだけを登録してください。通常の招待アカウントも同じ条件です。実際の顧客・従業員・取引先の情報、実業務の情報、機密情報、認証秘密、決済情報、医療情報、公的識別番号などを業務データへ入力しないでください。
        </p>
        <p>
          ログイン用メールアドレスや認証・MFA情報など、利用に必要なアカウント情報はプライバシーポリシーに従って取り扱います。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="4. 禁止事項">
        <ul>
          <li>
            不正アクセス、なりすまし、権限の迂回、他組織・他利用者の情報の不正取得。
          </li>
          <li>
            サービスに過剰な負荷をかける行為、破壊的な操作、運営や他利用者の利用を妨げる行為。
          </li>
          <li>第三者の権利を侵害する情報の登録や、法令に違反する行為。</li>
        </ul>
      </PublicInformationSection>
      <PublicInformationSection title="5. Codex連携と操作の確認">
        <p>
          Codex連携は任意です。接続時に本人が選んだプロジェクトと、現在の本人権限の範囲で読み取り・作成・更新を行います。閲覧専用、テスト実行専用、匿名デモでは利用できません。
        </p>
        <p>
          AIによる提案、作成内容、コメント、変更範囲を確認してください。内容の正確性や完全性は保証しません。日程の一括変更は、提示されたプレビューを確認・承認してから適用します。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="6. 保存、削除、連携解除">
        <p>
          通常の書き込みはログアウトや連携解除では取り消されません。連携解除は今後のMCPアクセスを停止するもので、作成済みの要件、設計、タスク、コメントや、外部サービス側の情報を削除する操作ではありません。削除・復元・保存の取扱いはプライバシーポリシーに従います。
        </p>
        <p>
          匿名デモの情報は終了後に保存を継続できません。審査用サンプルはログアウトでは消えず、審査許可の期限切れ・失効によって利用を終了します。必要なサンプルは、利用できる出力機能等で手元に控えてください。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="7. 登録内容の権利と外部サービス">
        <p>
          登録内容の権利は利用者または元の権利者に帰属します。運営者は、本サービスの保存、表示、共有、利用者が指定した連携処理、保守・安全対策に必要な範囲で取り扱います。
        </p>
        <p>
          Codex等の外部サービスを使う場合は、そのサービスの契約・設定も適用されます。外部サービスの障害、仕様変更、利用制限によって連携を利用できなくなる場合があります。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="8. 変更、停止、終了">
        <p>
          無料枠の上限、保守、安全対策、外部サービスの障害その他の運営上の事情により、提供内容を変更・制限し、停止・終了する場合があります。重要な変更や終了はサイト上で案内し、可能な場合は事前に告知します。緊急の安全対策などでは事前に告知できない場合があります。
        </p>
        <p>
          固定の通知日数、無期限の保存、停止時や終了後のデータ取出しは保証しません。提供に関する運営者の責任は法令に従い判断され、法令上認められない免責を定めるものではありません。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="9. 規約の改定、準拠法、問い合わせ">
        <p>
          重要な改定は、内容と適用時期をサイト上で案内し、可能な場合は事前に告知します。法令上必要な手続はその定めに従います。本規約の準拠法は日本法です。紛争の取扱いは適用される法令に従います。
        </p>
        <p>
          問い合わせ先:{" "}
          <a href="mailto:syncnesto@gmail.com">syncnesto@gmail.com</a>
        </p>
      </PublicInformationSection>
    </PublicInformationPage>
  );
}
