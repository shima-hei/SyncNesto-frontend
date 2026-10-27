import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const fields = [
  "input_tokens",
  "cached_input_tokens",
  "cache_write_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];

// 本文・引数・出力を保存せず、利用量と呼出メタデータだけを集計する。
export function createUsageCollector() {
  const usage = new Map();
  const models = new Map();
  const calls = new Map();
  let malformed = 0;
  return {
    accept(record) {
      const p = record.payload ?? {};
      if (record.type === "turn_context") models.set(p.turn_id, p.model);
      if (record.type === "token_usage_record") {
        if (
          !p.response_id ||
          !p.turn_id ||
          !fields.every(
            (k) => Number.isSafeInteger(p.usage?.[k]) && p.usage[k] >= 0,
          )
        ) {
          malformed++;
          return;
        }
        usage.set(`${p.thread_id}:${p.response_id}`, {
          timestamp: record.timestamp,
          turn_id: p.turn_id,
          response_id: p.response_id,
          tokens: Object.fromEntries(fields.map((k) => [k, p.usage[k]])),
        });
      }
      if (
        record.type === "response_item" &&
        ["function_call", "custom_tool_call"].includes(p.type)
      ) {
        const turn = p.internal_chat_message_metadata_passthrough?.turn_id;
        const source = p.input ?? p.arguments ?? "";
        const references =
          typeof source === "string"
            ? [
                ...new Set(
                  [
                    ...source.matchAll(
                      /tools\.(mcp__syncnesto_vercel__[a-z_]+)/g,
                    ),
                  ].map((m) => m[1]),
                ),
              ]
            : [];
        if (p.call_id && turn)
          calls.set(p.call_id, {
            timestamp: record.timestamp,
            turn_id: turn,
            name: p.name,
            references,
          });
      }
    },
    summary(requestedTurn, since) {
      const all = [...usage.values()];
      const turn = requestedTurn ?? (since ? undefined : all.at(-1)?.turn_id);
      const selected = all.filter(
        (r) =>
          (turn ? r.turn_id === turn : true) &&
          (!since || Date.parse(r.timestamp) >= Date.parse(since)),
      );
      const turnIds = [...new Set(selected.map((r) => r.turn_id))];
      const tokens = selected.length
        ? Object.fromEntries(
            fields.map((k) => [
              k,
              selected.reduce((n, r) => n + r.tokens[k], 0),
            ]),
          )
        : null;
      const outer = [...calls.values()].filter(
        (c) =>
          turnIds.includes(c.turn_id) &&
          (!since || Date.parse(c.timestamp) >= Date.parse(since)),
      );
      return {
        status: selected.length ? "measured" : "unavailable",
        source:
          "Codex desktop local token_usage_record; observed format, not a stable public API",
        turn_id: turnIds.length === 1 ? turnIds[0] : null,
        turn_ids: turnIds,
        since: since ?? null,
        models: [
          ...new Set(turnIds.map((id) => models.get(id)).filter(Boolean)),
        ],
        unique_responses: selected.length,
        observed_from: selected.at(0)?.timestamp ?? null,
        observed_through: selected.at(-1)?.timestamp ?? null,
        reported_tokens: tokens,
        non_cached_read_input_tokens: tokens
          ? tokens.input_tokens - tokens.cached_input_tokens
          : null,
        per_response_input: selected.length
          ? {
              min: Math.min(...selected.map((r) => r.tokens.input_tokens)),
              max: Math.max(...selected.map((r) => r.tokens.input_tokens)),
              mean: Math.round(tokens.input_tokens / selected.length),
            }
          : null,
        outer_tool_calls: outer.length,
        outer_calls_referencing_syncnesto: outer.filter(
          (c) => c.references.length,
        ).length,
        referenced_syncnesto_tools: [
          ...new Set(outer.flatMap((c) => c.references)),
        ].sort(),
        malformed_usage_records: malformed,
        mcp_exclusive_tokens: null,
        account_quota_cost: null,
        notes: [
          "Input includes cached input; reasoning is already included in output. Do not add either twice.",
          "References in exec source are not proof of the number of nested MCP requests.",
          "Usage covers the whole model prompt/history/tools and generation; it cannot attribute tokens exclusively to MCP.",
          "ChatGPT quota weighting and API-equivalent billing are not inferred.",
        ],
      };
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag) => args[args.indexOf(flag) + 1];
  if (!args.includes("--source") || !value("--source")?.endsWith(".jsonl"))
    throw new Error("--source <current-session.jsonl> is required");
  const collector = createUsageCollector();
  const stream = createInterface({
    input: createReadStream(value("--source")),
    crlfDelay: Infinity,
  });
  let invalidLines = 0;
  for await (const line of stream) {
    if (
      !/"type"\s*:\s*"(?:token_usage_record|turn_context|response_item)"/.test(
        line,
      )
    )
      continue;
    try {
      collector.accept(JSON.parse(line));
    } catch {
      invalidLines++;
    }
  }
  const since = args.includes("--since") ? value("--since") : undefined;
  if (since && !Number.isFinite(Date.parse(since)))
    throw new Error("--since must be an ISO timestamp");
  const report = {
    ...collector.summary(
      args.includes("--turn") ? value("--turn") : undefined,
      since,
    ),
    invalid_json_lines: invalidLines,
  };
  if (args.includes("--output")) {
    const path = resolve(value("--output"));
    if (path === resolve(value("--source")))
      throw new Error("Output must not overwrite the source rollout");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
  }
  process.stdout.write(JSON.stringify(report) + "\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
