const path = require("node:path");

/**
 * Two test projects with different runtimes.
 *
 * `app` runs React Native code under the jest-expo preset. `convex` runs the
 * backend the way it actually executes — server-side, no React Native — so it
 * uses a plain Node environment and its own Babel config.
 */
module.exports = {
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      setupFiles: ["<rootDir>/jest.setup.ts"],
      testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
    },
    {
      displayName: "convex",
      testEnvironment: "node",
      testMatch: ["<rootDir>/convex/**/*.test.ts"],
      transform: {
        "^.+\\.[jt]sx?$": [
          "babel-jest",
          { configFile: path.join(__dirname, "convex/tests/babel.config.js") },
        ],
      },
      // convex and convex-test ship ESM, so they must be transformed, not ignored.
      transformIgnorePatterns: ["node_modules/(?!(convex-test|convex)/)"],
    },
  ],
  testPathIgnorePatterns: ["/node_modules/", "/convex/_generated/"],
};
