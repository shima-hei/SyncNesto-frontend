import { writeFileSync } from "node:fs";

export default async function* reporter(source) {
  const failures = [];
  for await (const event of source) {
    if (event.type === "test:fail") {
      const { name, file, line, details } = event.data;
      const error = details?.error;
      failures.push({
        name,
        file,
        line,
        error: [error?.stack, error?.cause?.stack].filter(Boolean).join("\n"),
      });
    }
    if (event.type === "test:summary" && event.data.file === undefined) {
      const { success, counts, duration_ms } = event.data;
      const result = {
        status: success && counts.tests > 0 ? "passed" : "failed",
        complete: true,
        counts,
        seconds: duration_ms / 1000,
        failures,
      };
      if (process.env.SYNCNESTO_TEST_REPORT) {
        writeFileSync(
          process.env.SYNCNESTO_TEST_REPORT,
          JSON.stringify(result, null, 2),
          { mode: 0o600 },
        );
      }
      yield JSON.stringify({
        status: result.status,
        complete: result.complete,
        counts,
        seconds: result.seconds,
        failure_count: failures.length,
      }) + "\n";
      for (const failure of failures.slice(0, 3))
        yield failure.name.slice(0, 240) +
          "\n" +
          failure.error.slice(-1600) +
          "\n";
    }
  }
}
