# 一覧・ボードのステータスと階層

ステータスは既存DropdownMenuの複数選択。未選択はすべて、個別選択はOR。完了以外はdoneだけ、完了・中止以外はdone/cancelledを除外する。プリセットではBackendの除外条件を使い、旧状態を意図せず隠さない。表示にない旧状態をURLで指定した場合は、その値を選択肢に残す。

URLのstatuses（繰り返し）またはexcludeStatuses（繰り返し）を保持する。旧status単一URLも読む。画面から変更すると新形式に正規化し、pageだけ初期化する。RESTはstatuses/exclude_statusesへ渡す。OpenAPIからOrvalを生成し、同名キーの繰り返しを検証する。

階層の種類はhierarchyで保持する。親タスクのみは最上位と中間の親を含む。最上位の親／中間の親／末端の子／単独をTaskRead.has_childrenとparent_task_idから表示し、中間の親にはparent_summaryの名称を併記する。has_children未取得なら分類を推測しない。

閲覧範囲の『最上位から探す』は最上位の親と単独を含み、root_only=trueを使う。『選んだ親の子』は従来どおり直属のみ。階層・ステータスと他条件はAND。『全体へ』は削除し、『すべて』と『一つ上』を使う。条件解除は閲覧範囲・表示タブを保持する。ボード上限100件、ガントの独立条件・下書き・保存契約は維持する。
