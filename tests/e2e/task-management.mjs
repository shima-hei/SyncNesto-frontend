// Playwright シナリオ。専用DBの管理者セッションと、子タスク付き親・工程・要件・閲覧者案件を使う。
// qa は base, tasks, planning, viewer, project, scheduled, phase, req, doc, user, reporter, token, csrf, foreignTask, evidence を渡す。
export async function verifyTaskManagement(page, qa) {
  const check = (condition, label) => {
    if (!condition) throw Error(label);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const link = (name) => page.getByRole("link", { name, exact: true });
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  const label = (name) => page.getByLabel(name, { exact: true });
  const api = `/api/projects/${qa.project}/tasks`;
  const request = (path) =>
    page.request.get(qa.base + path).then((response) => response.json());
  const task = (id) => request(`/api/tasks/${id}`);
  const detail = (id) => qa.base + qa.tasks + "/" + id;
  const post = (path = api) =>
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === path &&
        response.request().method() === "POST",
    );
  const quick = (name = "新しいタスク") =>
    page.getByRole("textbox", { name, exact: true });
  const newForm = () =>
    page.getByRole("form", { name: "タスクを作成", exact: true });
  const saveNew = async (path) => {
    const response = post(path);
    await newForm()
      .getByRole("button", { name: "タスクを作成", exact: true })
      .click();
    const result = await response;
    check(
      result.status() === 201,
      "detailed creation failed: " + result.status(),
    );
    const created = await result.json();
    await page.waitForURL(
      (url) => url.pathname === new URL(detail(created.id)).pathname,
    );
    return created;
  };
  page.setDefaultTimeout(10_000);
  await page.context().addCookies([
    { name: "access_token", value: qa.token, url: qa.base, httpOnly: true },
    { name: "csrf_token", value: qa.csrf, url: qa.base },
  ]);
  await page.route("**/test-task-avatar.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#2463a1"/></svg>',
    }),
  );
  let useProfilePhoto = true;
  await page.route(
    `**/api/projects/${qa.project}/member-users*`,
    async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      for (const member of data.items) {
        if (member.id === qa.user)
          member.avatar_url = useProfilePhoto ? "/test-task-avatar.svg" : null;
      }
      await route.fulfill({ status: response.status(), json: data });
    },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(qa.base + qa.tasks);
  const parent = page.locator(`tr[data-task-id="${qa.scheduled}"]`);
  const parentLink = parent.getByRole("link", {
    name: "日程あり QA",
    exact: true,
  });
  await parentLink.waitFor();
  check((await quick().count()) === 0, "quick input starts collapsed");
  await page
    .getByRole("region", { name: "タスク表" })
    .getByRole("button", { name: "タスクを追加", exact: true })
    .waitFor();
  await parent
    .getByRole("button", { name: "日程あり QAの担当者を編集" })
    .locator('img[src="/test-task-avatar.svg"]')
    .waitFor();
  const unassigned = page
    .locator(`tr[data-task-id="${qa.unscheduled}"]`)
    .getByRole("button", { name: "工程所属あり・日程なし QAの担当者を編集" });
  await unassigned.locator('[data-slot="avatar-fallback"] svg').waitFor();
  check(
    (await parent.locator("svg.lucide-pencil").count()) === 0,
    "editable cells have no pencils",
  );
  await parent.getByRole("checkbox").click();
  await parent.locator("[data-tree-expand]").click();
  await link("子タスク QA").waitFor();
  check(
    new URL(page.url()).pathname === qa.tasks,
    "selection and expand stay in list",
  );
  await button("列の表示").click();
  await page.getByRole("menuitemcheckbox", { name: "進捗率" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("columnheader", { name: "進捗率" }).waitFor();
  const popup = page.context().waitForEvent("page");
  await parentLink.click({ modifiers: ["ControlOrMeta"] });
  const newTab = await popup;
  await newTab.waitForURL(
    (url) => url.pathname === new URL(detail(qa.scheduled)).pathname,
  );
  await newTab.close();
  await parentLink.press("Enter");
  await page.waitForURL(
    (url) => url.pathname === new URL(detail(qa.scheduled)).pathname,
  );
  await link("タスク一覧へ戻る").click();
  await page.getByRole("columnheader", { name: "進捗率" }).waitFor();
  await parent.getByRole("button", { name: "日程あり QAの操作" }).click();
  await page
    .getByRole("menuitem", { name: "クイック編集（右ペイン）" })
    .click();
  const pane = page.getByRole("form", { name: "タスクの軽微編集" });
  await pane.locator('img[src="/test-task-avatar.svg"]').waitFor();
  check(
    !(await pane.getByRole("button", { name: "変更を保存" }).isEnabled()),
    "pane save is disabled when clean",
  );
  await pane.getByLabel("期限").fill("2026-12-24");
  const paneCancel = pane.getByRole("button", {
    name: "キャンセル",
    exact: true,
  });
  const paneSave = pane.getByRole("button", {
    name: "変更を保存",
    exact: true,
  });
  const cancelBox = await paneCancel.boundingBox();
  const saveBox = await paneSave.boundingBox();
  check(
    cancelBox &&
      saveBox &&
      cancelBox.height === saveBox.height &&
      cancelBox.y === saveBox.y &&
      cancelBox.x < saveBox.x,
    "pane action buttons aligned",
  );
  await paneCancel.press("Enter");
  check(
    (await pane.getByLabel("期限").inputValue()) !== "2026-12-24" &&
      !(await paneSave.isEnabled()),
    "pane cancel discards draft",
  );
  await page.screenshot({ path: qa.evidence + "/quick-edit-panel.png" });
  await button("簡易詳細を閉じる").click();
  await page.locator(`[data-task-select="${qa.scheduled}"]:focus`).waitFor();
  const editPriority = parent.getByRole("button", {
    name: "日程あり QAの優先度を編集",
  });
  await editPriority.press("Enter");
  const priorityPopup = page.getByRole("dialog", { name: "優先度を編集" });
  const priorityField = priorityPopup.getByLabel("優先度");
  const prioritySave = priorityPopup.getByRole("button", {
    name: "変更を保存",
  });
  check(!(await prioritySave.isEnabled()), "cell save disabled while clean");
  await priorityField.press("Enter");
  const high = page.getByRole("option", { name: "高", exact: true });
  await high.waitFor();
  await high.focus();
  await page.keyboard.press("Enter");
  await priorityField.filter({ hasText: "高" }).waitFor();
  const priorityResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/tasks/${qa.scheduled}` &&
      response.request().method() === "PATCH",
  );
  await prioritySave.press("Enter");
  check((await priorityResponse).ok(), "keyboard priority save succeeds");
  await editPriority.filter({ hasText: "高" }).waitFor();
  check((await task(qa.scheduled)).priority === "high", "row inline edit");
  const code = parent.getByText("QA-PLAN", { exact: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: qa.evidence + "/list-desktop.png" });
  await code.click();
  await page.waitForURL(
    (url) => url.pathname === new URL(detail(qa.scheduled)).pathname,
  );
  console.log("[task-ui] list, keyboard and row actions");

  await page.goto(qa.base + qa.tasks + "?q=unmatched");
  await link("詳細起票").click();
  await page.waitForURL((url) => url.pathname === qa.tasks + "/new");
  await label("タスク名").fill("QA キャンセル");
  await button("キャンセル").click();
  await page.waitForURL(
    (url) =>
      url.pathname === qa.tasks && url.searchParams.get("q") === "unmatched",
  );
  await button("タスクを追加").click();
  const title = quick();
  await title.fill("QA 連続起票 1");
  const totalBefore = (await request(api)).total;
  const imeBlocked = await title.evaluate(
    (element) =>
      !element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
  );
  check(
    imeBlocked && (await request(api)).total === totalBefore,
    "IME confirmation stays in the input",
  );
  let sends = 0;
  await page.route("**" + api, async (route) => {
    if (route.request().method() === "POST" && ++sends === 1) {
      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: '{"detail":"QA入力エラー"}',
      });
    }
    return route.continue();
  });
  await Promise.all([post(), title.press("Enter")]);
  check(
    (await title.inputValue()) === "QA 連続起票 1",
    "failed create retains title",
  );
  const retry = post();
  await title.evaluate((element) => {
    element.form.requestSubmit();
    element.form.requestSubmit();
  });
  const retried = await retry;
  check(retried.ok(), "retry succeeds");
  check(
    (await retried.json()).reporter_id === qa.user,
    "quick create uses the signed-in reporter",
  );
  await page.getByText(/QA 連続起票 1.*登録しました/).waitFor();
  check(
    await title.evaluate(
      (element) => document.activeElement === element && !element.value,
    ),
    "quick creation returns focus",
  );
  await title.fill("QA 連続起票 2");
  await Promise.all([post(), title.press("Enter")]);
  await page.getByText(/QA 連続起票 2.*登録しました/).waitFor();
  check(
    sends === 3 && (await request(api)).total === totalBefore + 2,
    "one write per create and continuous entry",
  );
  await page.unroute("**" + api);

  await title.fill("QA 詳細に引き継ぎ");
  await button("追加項目").click();
  await page
    .getByRole("form", { name: "新しいタスク", exact: true })
    .getByLabel("終了予定日")
    .fill("2026-12-18");
  await label("メモ").fill("**引き継いだ説明**");
  await link("詳細起票").click();
  await page.waitForURL((url) => url.pathname === qa.tasks + "/new");
  await label("タスク名").waitFor();
  check(
    (await label("タスク名").inputValue()) === "QA 詳細に引き継ぎ",
    "quick title transferred",
  );
  check(
    (await label("説明（任意）").inputValue()) === "**引き継いだ説明**",
    "quick description transferred",
  );
  check(
    (await label("終了予定日").inputValue()) === "2026-12-18",
    "date-only transfer",
  );
  await label("開始日").fill("2026-12-12");
  await label("担当者（任意）").click();
  await page.getByRole("option", { name: /Session QA/ }).click();
  await page.reload();
  await label("タスク名").waitFor();
  check(
    (await label("開始日").inputValue()) === "2026-12-12",
    "detail draft retained on reload",
  );
  await page.getByText("その他の項目", { exact: true }).click();
  const createReporter = label("報告者");
  check(
    (await createReporter.innerText()).includes("登録者（自分）"),
    "create form explains the reporter default",
  );
  await createReporter.click();
  await page.getByRole("option", { name: /QA Reporter/ }).click();
  await page.screenshot({ path: qa.evidence + "/create-desktop.png" });
  const detailed = await saveNew();
  check(
    detailed.assignee_id === qa.user &&
      detailed.reporter_id === qa.reporter &&
      detailed.start_date === "2026-12-12" &&
      detailed.due_date === "2026-12-18",
    "detailed fields persisted",
  );
  check(
    detailed.estimated_minutes === null && detailed.actual_minutes === null,
    "effort remains unset at creation",
  );
  await link("起票元へ戻る").click();
  await page.waitForURL(
    (url) =>
      url.pathname === qa.tasks && url.searchParams.get("q") === "unmatched",
  );
  console.log("[task-ui] quick creation, detailed creation and draft");

  await page.goto(qa.base + qa.tasks + "?tab=board");
  await tab("ボード").waitFor();
  await button("タスクを追加").click();
  await quick().fill("QA ボード起票");
  const boardResponse = post();
  await quick().press("Enter");
  const boardTask = await (await boardResponse).json();
  await page.locator(`[data-board-task-id="${boardTask.id}"]`).waitFor();

  await page.goto(detail(qa.scheduled));
  const tree = page.getByRole("region", { name: "タスク階層" });
  await tree
    .locator("[aria-current=page]")
    .filter({ hasText: "日程あり QA" })
    .waitFor();
  const childBranch = tree.getByRole("button", {
    name: "子タスク QAの子タスクを展開する",
  });
  await childBranch.press("Enter");
  const grandchild = tree.getByRole("link", {
    name: "孫タスク QA",
    exact: true,
  });
  await grandchild.waitFor();
  await tree
    .getByRole("button", { name: "孫タスク QAの子タスクを展開する" })
    .press("Space");
  await tree
    .getByRole("link", { name: "深いタスク QA 01", exact: true })
    .waitFor();
  const nextChildren = tree.getByRole("button", {
    name: "次の子タスクを表示",
    exact: true,
  });
  await nextChildren.press("Enter");
  await tree
    .getByRole("link", { name: "深いタスク QA 21", exact: true })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: qa.evidence + "/hierarchy.png" });
  await tree
    .getByRole("button", { name: "孫タスク QAの子タスクを折りたたむ" })
    .press("Enter");
  check(
    (await tree
      .getByRole("link", { name: "深いタスク QA 21", exact: true })
      .count()) === 0,
    "collapsed descendants leave tab order",
  );
  await grandchild.press("Enter");
  await tree
    .locator("[aria-current=page]")
    .filter({ hasText: "孫タスク QA" })
    .waitFor();
  await tree.getByRole("link", { name: "日程あり QA", exact: true }).waitFor();
  await tree.getByRole("link", { name: "子タスク QA", exact: true }).waitFor();
  await tree
    .getByRole("link", { name: "子タスク QA", exact: true })
    .press("Enter");
  await tree
    .locator("[aria-current=page]")
    .filter({ hasText: "子タスク QA" })
    .waitFor();
  await page.goto(detail(qa.scheduled));
  await page
    .getByRole("button", { name: "担当者を編集", exact: true })
    .locator('img[src="/test-task-avatar.svg"]')
    .waitFor();
  const assigneeValueId = await page
    .getByRole("button", { name: "担当者を編集", exact: true })
    .getAttribute("aria-describedby");
  check(
    await page.evaluate(
      (id) => document.getElementById(id)?.textContent?.includes("Session QA"),
      assigneeValueId,
    ),
    "keyboard assignee trigger describes the selected member",
  );
  useProfilePhoto = false;
  await page.reload();
  await page
    .getByRole("button", { name: "担当者を編集", exact: true })
    .locator('[data-slot="avatar-fallback"]')
    .getByText("SE")
    .waitFor();
  await button("説明を編集").press("Enter");
  const description = label("説明（任意）");
  const detailCancel = button("キャンセル");
  const detailSave = button("変更を保存");
  check(
    !(await detailSave.isEnabled()),
    "description save disabled while clean",
  );
  await description.press("a");
  check(await detailSave.isEnabled(), "description typing enables save");
  const detailBoxes = await Promise.all([
    detailCancel.boundingBox(),
    detailSave.boundingBox(),
  ]);
  check(
    detailBoxes[0] &&
      detailBoxes[1] &&
      detailBoxes[0].height === detailBoxes[1].height &&
      detailBoxes[0].y === detailBoxes[1].y &&
      detailBoxes[0].x < detailBoxes[1].x,
    "detail action buttons aligned",
  );
  await detailCancel.press("Enter");
  check(
    (await task(qa.scheduled)).description == null,
    "keyboard cancel leaves saved description unchanged",
  );
  await button("子タスクを追加").click();
  await quick("新しい子タスク").fill("QA 子の詳細起票");
  await button("詳細起票").click();
  const child = await saveNew();
  check(child.parent_task_id === qa.scheduled, "parent persisted");
  check(
    child.reporter_id === qa.user,
    "child reporter defaults to the creator",
  );
  check(
    (await task(qa.scheduled)).reporter_id === qa.reporter,
    "parent keeps its reporter",
  );
  await link("起票元へ戻る").click();
  await link("QA 子の詳細起票").click();
  await page.waitForURL(
    (url) => url.pathname === new URL(detail(child.id)).pathname,
  );

  await page.getByText("管理情報", { exact: true }).click();
  await button("報告者を編集").press("Enter");
  await label("報告者").click();
  await page.getByRole("option", { name: /QA Reporter/ }).click();
  await button("変更を保存").press("Enter");
  await button("報告者を編集").getByText("QA Reporter").waitFor();
  check(
    (await task(child.id)).reporter_id === qa.reporter,
    "reporter override persists after creation",
  );

  const requirementUrl =
    qa.base +
    qa.tasks.replace(/tasks$/, "requirements/") +
    qa.doc +
    "/items/" +
    qa.req;
  await page.goto(requirementUrl);
  await tab("設計・タスク・テスト").click();
  await button("関連タスク追加").click();
  await quick().fill("QA 要件の詳細起票");
  await button("詳細起票").click();
  const requirementTask = await saveNew(`/api/requirements/${qa.req}/tasks`);
  check(
    requirementTask.reporter_id === qa.user &&
      requirementTask.requirements.some((item) => item.id === qa.req),
    "requirement persisted",
  );
  await link("起票元へ戻る").click();
  await page.waitForURL(
    (url) =>
      url.pathname === new URL(requirementUrl).pathname &&
      url.searchParams.get("tab") === "relations",
  );
  await page.getByText("QA 要件の詳細起票", { exact: true }).first().waitFor();

  await page.goto(qa.base + qa.planning);
  await page
    .getByRole("button", { name: "「工程 QA」にタスクを追加", exact: true })
    .click();
  await quick("タスク名").fill("QA 工程の詳細起票");
  await button("詳細起票").click();
  const phaseTask = await saveNew();
  check(phaseTask.phase_id === qa.phase, "planning phase persisted");
  await link("起票元へ戻る").click();
  await page.waitForURL((url) => url.pathname === qa.planning);
  console.log("[task-ui] parent, requirement and planning origins");

  await page.goto(detail(child.id));
  await button("終了予定日を編集").click();
  await label("終了予定日").fill("2026-12-19");
  await button("変更を保存").click();
  await button("終了予定日を編集").waitFor();
  check(
    (await task(child.id)).due_date === "2026-12-19",
    "inline detail date persisted",
  );
  await tab("変更履歴").click();
  const firstChange = page.getByRole("tabpanel").locator("ol > li").first();
  await firstChange.getByText("変更内容を表示").click();
  await firstChange.getByText("2026/12/19", { exact: true }).waitFor();
  await tab("コメント").click();
  const comment = page.getByRole("tabpanel").locator("textarea").first();
  await comment.fill("QA コメントとステータス");
  await label("ステータスも変更").click();
  await page.getByRole("option", { name: "対応済", exact: true }).click();
  const statusResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/tasks/${child.id}` &&
      response.request().method() === "PATCH",
  );
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "コメント追加", exact: true })
    .click();
  await page.getByText("QA コメントとステータス", { exact: true }).waitFor();
  check((await statusResponse).ok(), "comment status update succeeded");
  check(
    (await task(child.id)).status === "resolved",
    "comment status change persisted",
  );
  await button("実績を編集").click();
  await label("実績工数").fill("0");
  await button("変更を保存").click();
  await button("実績を編集").waitFor();
  check(
    (await task(child.id)).actual_minutes === 0,
    "explicit actual zero persists",
  );
  await link("見積を入力").click();
  const row = page.locator(`tr[data-task="${child.id}"]`);
  await row.waitFor();
  check(
    (await row.getAttribute("data-selected")) === "true",
    "estimate link selects same task",
  );
  const hours = row.locator("input[data-field=hours]");
  await hours.click();
  await hours.fill("1.5");
  await hours.press("Tab");
  await button("変更を保存 (1)").click();
  await button("変更を保存 (1)").waitFor({ state: "hidden" });
  check(
    (await task(child.id)).estimated_minutes === 90,
    "estimate saved to same task",
  );
  check(
    (await task(qa.scheduled)).effort_totals.estimated.minutes === 90,
    "parent estimate aggregates once",
  );
  console.log("[task-ui] activity, inline save, zero and estimate rollup");

  await page.goto(detail(qa.scheduled));
  const properties = page.getByRole("complementary", {
    name: "プロパティと工数",
  });
  const descriptionHeading = page.getByRole("heading", {
    name: "説明",
    exact: true,
  });
  const childLink = link("QA 子の詳細起票");
  await properties.waitFor();
  await childLink.waitFor();
  const desktopProperties = await properties.boundingBox();
  const desktopDescription = await descriptionHeading.boundingBox();
  check(
    desktopProperties &&
      desktopDescription &&
      desktopProperties.x > desktopDescription.x,
    "desktop detail uses two columns",
  );
  await page.screenshot({ path: qa.evidence + "/detail-desktop.png" });
  const relatedHeading = page.getByRole("heading", {
    name: "関連要件",
    exact: true,
  });
  const pageBounds = (locator) =>
    locator.evaluate((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, top: y + scrollY, width, height };
    });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator("html.dark").waitFor();
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const before = await pageBounds(relatedHeading);
    const sidebar = await pageBounds(properties);
    await button("プロパティを編集").press("Enter");
    await properties.getByRole("form", { name: "タスクの編集" }).waitFor();
    const after = await pageBounds(relatedHeading);
    const openSidebar = await pageBounds(properties);
    check(
      openSidebar.x > after.x &&
        Math.abs(openSidebar.width - sidebar.width) <= 1 &&
        Math.abs(after.width - before.width) <= 1 &&
        Math.abs(after.top - before.top) <= 1 &&
        openSidebar.height > sidebar.height,
      "properties editing keeps the left layout at " +
        width +
        "px: " +
        JSON.stringify({ before, after, sidebar, openSidebar }),
    );
    if (width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: qa.evidence + "/properties-edit-desktop.png",
      });
    }
    await properties
      .getByRole("button", { name: "キャンセル", exact: true })
      .press("Enter");
  }
  console.log(
    "[task-ui] report defaults, override, and independent detail columns",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("html.dark").waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  const mobileProperties = await properties.boundingBox();
  const mobileChildren = await childLink.boundingBox();
  check(
    mobileProperties && mobileChildren && mobileProperties.y > mobileChildren.y,
    "mobile detail keeps child tasks next to the description",
  );
  await button("プロパティを編集").click();
  await properties.getByRole("form", { name: "タスクの編集" }).waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await properties
    .getByRole("button", { name: "キャンセル", exact: true })
    .click();
  await page.screenshot({ path: qa.evidence + "/detail-mobile.png" });
  await page.goto(qa.base + qa.tasks);
  await button("タスクを追加").click();
  await title.waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.screenshot({ path: qa.evidence + "/list-mobile.png" });
  const submitBounds = await button("登録").boundingBox();
  check(
    submitBounds && submitBounds.x + submitBounds.width <= 390,
    "mobile quick submit remains visible",
  );

  const viewerList = qa.base + qa.viewer.replace("/planning", "/tasks");
  await page.goto(viewerList);
  const viewerRow = page
    .locator("tr[data-task-id]")
    .filter({ hasText: "閲覧者の未日程タスク" });
  await viewerRow.waitFor();
  check(
    (await viewerRow.getByRole("button", { name: /を編集$/ }).count()) === 0,
    "viewer fields are read-only",
  );
  check(
    (await button("タスクを追加").count()) === 0 &&
      (await link("詳細起票").count()) === 0,
    "viewer cannot use creation entries",
  );
  await page.goto(viewerList + "/new");
  await page
    .getByRole("alert")
    .filter({ hasText: "タスクを作成する権限がありません" })
    .waitFor();
  check(
    (await newForm().count()) === 0,
    "viewer cannot open detailed creation",
  );
  const inaccessible = await page.request.get(
    qa.base + "/api/tasks/" + qa.foreignTask,
  );
  check(
    [403, 404].includes(inaccessible.status()),
    "foreign tenant task request denied",
  );
  return "PASS: task management end to end";
}
