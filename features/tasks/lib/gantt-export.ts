import type { GanttResponse } from "@/lib/api/generated/model";

import { GANTT_DISPLAY_OPTIONS } from "../constants/task-view-options";

export const exportGanttCsv = (gantt: GanttResponse) => {
  const rows = [
    [
      "type",
      "id",
      "code",
      "title",
      "status",
      "assignee_id",
      "start_date",
      "due_date",
      "progress_percent",
      "target_date",
    ],
    ...gantt.tasks.map((task) => [
      "task",
      String(task.id),
      task.task_code,
      task.title,
      task.status ?? "",
      task.assignee_id ? String(task.assignee_id) : "",
      task.start_date ?? "",
      task.due_date ?? "",
      String(task.progress_percent ?? 0),
      "",
    ]),
    ...gantt.milestones.map((milestone) => [
      "milestone",
      String(milestone.id),
      "",
      milestone.title,
      milestone.status ?? "",
      "",
      "",
      "",
      "",
      milestone.target_date,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gantt.csv";
  link.click();
  URL.revokeObjectURL(url);
};

export const exportGanttPdf = (gantt: GanttResponse, displayUnit: string) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(getGanttPrintHtml(gantt, displayUnit));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const getGanttPrintHtml = (gantt: GanttResponse, displayUnit: string) => {
  const tasks = gantt.tasks
    .map(
      (task) => `
        <tr>
          <td>${escapeHtml(task.task_code)}</td>
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(task.status ?? "")}</td>
          <td>${task.assignee_id ?? ""}</td>
          <td>${escapeHtml(task.start_date ?? "")}</td>
          <td>${escapeHtml(task.due_date ?? "")}</td>
          <td>${task.progress_percent ?? 0}%</td>
        </tr>
      `
    )
    .join("");
  const milestones = gantt.milestones
    .map(
      (milestone) => `
        <tr>
          <td>${escapeHtml(milestone.title)}</td>
          <td>${escapeHtml(milestone.target_date)}</td>
          <td>${escapeHtml(milestone.status ?? "")}</td>
        </tr>
      `
    )
    .join("");
  const dependencies = gantt.dependencies
    .map(
      (dependency) => `
        <tr>
          <td>${dependency.predecessor_task_id}</td>
          <td>${dependency.successor_task_id}</td>
          <td>${escapeHtml(dependency.dependency_type ?? "")}</td>
          <td>${dependency.lag_days ?? 0}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <title>ガントチャート</title>
        <style>
          body {
            color: #111;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 24px;
          }
          h1 {
            font-size: 20px;
            margin: 0 0 8px;
          }
          h2 {
            font-size: 15px;
            margin: 24px 0 8px;
          }
          p {
            color: #555;
            font-size: 12px;
            margin: 0 0 16px;
          }
          table {
            border-collapse: collapse;
            font-size: 11px;
            width: 100%;
          }
          th,
          td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
          }
          @page {
            margin: 14mm;
          }
        </style>
      </head>
      <body>
        <h1>ガントチャート</h1>
        <p>表示単位: ${escapeHtml(getGanttDisplayUnitLabel(displayUnit))}</p>
        <h2>タスク</h2>
        <table>
          <thead>
            <tr>
              <th>タスクID</th>
              <th>タイトル</th>
              <th>状態</th>
              <th>担当者ID</th>
              <th>開始日</th>
              <th>終了予定日</th>
              <th>進捗</th>
            </tr>
          </thead>
          <tbody>${tasks || getPrintEmptyRow(7)}</tbody>
        </table>
        <h2>マイルストーン</h2>
        <table>
          <thead>
            <tr>
              <th>タイトル</th>
              <th>対象日</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>${milestones || getPrintEmptyRow(3)}</tbody>
        </table>
        <h2>依存関係</h2>
        <table>
          <thead>
            <tr>
              <th>先行タスクID</th>
              <th>後続タスクID</th>
              <th>種別</th>
              <th>ラグ日数</th>
            </tr>
          </thead>
          <tbody>${dependencies || getPrintEmptyRow(4)}</tbody>
        </table>
      </body>
    </html>
  `;
};

const getPrintEmptyRow = (colSpan: number) => {
  return `<tr><td colspan="${colSpan}">データはありません。</td></tr>`;
};

const getGanttDisplayUnitLabel = (displayUnit: string) => {
  const option = GANTT_DISPLAY_OPTIONS.find((item) => item.value === displayUnit);

  return option?.label ?? displayUnit;
};

const escapeCsvValue = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};
