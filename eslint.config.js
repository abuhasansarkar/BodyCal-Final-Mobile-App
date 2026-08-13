const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      ".expo/**",
      "convex/_generated/**",
      // Vendored agent skills. Third-party Node scripts, not app source.
      ".agents/**",
      ".claude/**",
      "dist/**",
    ],
  },
  {
    // Root tooling config runs in Node, not in the app bundle.
    files: ["*.config.js", "*.config.mjs", "convex/tests/babel.config.js"],
    languageOptions: {
      globals: { __dirname: "readonly", module: "writable", require: "readonly", process: "readonly" },
    },
  },
];
