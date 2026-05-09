import { defineConfig } from "orval";

export default defineConfig({
  syncnesto: {
    input: {
      target: "http://localhost:8000/openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./lib/api/generated/syncnesto.ts",
      schemas: "./lib/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "./lib/api/client.ts",
          name: "apiClient",
        },
      },
    },
  },
});
