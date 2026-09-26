module.exports = function (api) {
  api.cache(true);
  // Force the expo-router inline plugin even when babel-preset-expo is hoisted
  // to the workspace root and cannot resolve nested apps/mobile/expo-router.
  let routerPlugin;
  try {
    routerPlugin = require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin;
  } catch {
    routerPlugin = null;
  }
  return {
    presets: ['babel-preset-expo'],
    plugins: routerPlugin ? [routerPlugin] : [],
  };
};
