import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./tests/globalSetup.ts"], // once: create + migrate the test database
    setupFiles: ["./tests/setup.ts"],        // before every test file: env + email mocks
    fileParallelism: false,                  // all files share one database, run them one by one
    clearMocks: true,                        // forget mock calls between tests
    testTimeout: 15000,
  },
});
