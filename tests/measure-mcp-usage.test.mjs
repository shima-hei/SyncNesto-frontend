import assert from "node:assert/strict";
import test from "node:test";
import { createUsageCollector } from "../scripts/measure-mcp-usage.mjs";

const record = (turn, response, input = 100) => ({
  type: "token_usage_record",
  timestamp: "2026-10-25T06:00:00Z",
  payload: {
    thread_id: "thread",
    turn_id: turn,
    response_id: response,
    usage: {
      input_tokens: input,
      cached_input_tokens: 80,
      cache_write_input_tokens: 0,
      output_tokens: 10,
      reasoning_output_tokens: 6,
      total_tokens: input + 10,
    },
  },
});

test("重複responseを除外し、対象turnだけを実測。cacheとreasoningを二重計上しない", () => {
  const c = createUsageCollector();
  c.accept(record("old", "a", 999));
  c.accept(record("current", "b"));
  c.accept(record("current", "b"));
  c.accept({
    type: "event_msg",
    payload: {
      type: "token_count",
      info: { total_token_usage: { total_tokens: 99999 } },
    },
  });
  const r = c.summary();
  assert.equal(r.turn_id, "current");
  assert.equal(r.unique_responses, 1);
  assert.equal(r.reported_tokens.total_tokens, 110);
  assert.equal(r.non_cached_read_input_tokens, 20);
  assert.equal(r.mcp_exclusive_tokens, null);
  assert.equal(
    c.summary(undefined, "2026-10-25T06:00:00Z").unique_responses,
    2,
  );
});

test("本文や秘密を残さず、コード中のMCP参照を実リクエスト数と呼ばない", () => {
  const c = createUsageCollector();
  c.accept(record("current", "a"));
  c.accept({
    type: "response_item",
    payload: {
      type: "custom_tool_call",
      call_id: "call",
      name: "exec",
      input:
        "tools.mcp__syncnesto_vercel__get_project_brief({secret:'PRIVATE'})",
      internal_chat_message_metadata_passthrough: { turn_id: "current" },
    },
  });
  const r = c.summary();
  assert.equal(r.outer_calls_referencing_syncnesto, 1);
  assert.deepEqual(r.referenced_syncnesto_tools, [
    "mcp__syncnesto_vercel__get_project_brief",
  ]);
  assert.ok(!JSON.stringify(r).includes("PRIVATE"));
  assert.equal(createUsageCollector().summary().status, "unavailable");
});
