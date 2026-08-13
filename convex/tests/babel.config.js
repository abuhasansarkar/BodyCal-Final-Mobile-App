/**
 * Babel config for the Convex test project.
 *
 * Convex functions run server-side, so they must not be transformed with the
 * React Native preset. `babel-preset-expo` targeting Node handles the TypeScript
 * and modern syntax without pulling in any RN setup.
 */
module.exports = {
  presets: [["babel-preset-expo", { targets: { node: "current" } }]],
};
