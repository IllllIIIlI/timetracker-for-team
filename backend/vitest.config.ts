import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["dotenv/config"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Integration tests hit a real Postgres and mutate shared tables
    // (users, projects, ...) — run them one at a time to avoid cross-test
    // interference.
    fileParallelism: false,
  },
});
