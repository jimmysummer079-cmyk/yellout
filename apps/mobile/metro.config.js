const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(workspaceRoot, 'node_modules');

process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app');

const config = getDefaultConfig(projectRoot);

// Only watch shared package + mobile — avoid crawling unrelated root hoists.
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared'),
  projectRoot,
];
config.resolver.nodeModulesPaths = [mobileModules, rootModules];
// Prefer explicit pins over walking up from a hoisted expo package into a
// different react-native major (root may have 0.87 while mobile needs 0.76).
config.resolver.disableHierarchicalLookup = true;

const pin = (name) => {
  const local = path.join(mobileModules, name);
  const fs = require('fs');
  return fs.existsSync(local) ? local : path.join(rootModules, name);
};

config.resolver.extraNodeModules = {
  '@yellout/shared': path.resolve(workspaceRoot, 'packages/shared'),
  react: pin('react'),
  'react-native': pin('react-native'),
  expo: pin('expo'),
  'expo-router': pin('expo-router'),
  'expo-constants': pin('expo-constants'),
  'expo-asset': pin('expo-asset'),
  'react-native-web': pin('react-native-web'),
};

// Hard-block a root-hoisted react-native tree only when it is a *different*
// install (not a symlink to the mobile copy) with an incompatible version.
const fs = require('fs');
const rootRn = path.join(rootModules, 'react-native');
const mobileRn = path.join(mobileModules, 'react-native');
try {
  const rootReal = fs.realpathSync(rootRn);
  const mobileReal = fs.realpathSync(mobileRn);
  if (rootReal !== mobileReal) {
    const escaped = rootReal.replace(/[/\\]/g, '[/\\\\]');
    config.resolver.blockList = [new RegExp(`${escaped}[/\\\\].*`)];
  }
} catch {
  // missing installs — leave defaults
}

module.exports = config;
