#!/usr/bin/env node
/**
 * npm workspaces may hoist babel-preset-expo to the repo root while leaving
 * expo-router nested under apps/mobile. babel-preset-expo's hasModule('expo-router')
 * then fails and EXPO_ROUTER_APP_ROOT is never inlined.
 *
 * Also pin root react-native to the Expo SDK 52-compatible copy (0.76.x).
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(mobileRoot, '../..');
const rootModules = path.join(workspaceRoot, 'node_modules');
const mobileModules = path.join(mobileRoot, 'node_modules');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function linkOrCopy(name) {
  const target = path.join(mobileModules, name);
  const linkPath = path.join(rootModules, name);
  if (!fs.existsSync(target)) {
    console.warn(`[yellout-mobile] skip link ${name}: missing ${target}`);
    return;
  }
  ensureDir(path.dirname(linkPath));
  try {
    const st = fs.lstatSync(linkPath);
    if (st.isSymbolicLink()) {
      const current = fs.readlinkSync(linkPath);
      const resolved = path.resolve(path.dirname(linkPath), current);
      if (resolved === target) return;
      fs.unlinkSync(linkPath);
    } else if (st.isDirectory() || st.isFile()) {
      // Prefer the mobile copy for Expo SDK alignment.
      fs.rmSync(linkPath, { recursive: true, force: true });
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const rel = path.relative(path.dirname(linkPath), target);
  fs.symlinkSync(rel, linkPath);
  console.log(`[yellout-mobile] linked ${name} -> ${rel}`);
}

ensureDir(rootModules);

// When npm fully hoists Expo deps to the workspace root (common after a clean
// install with overrides), there is nothing to link — just verify RN major.
const rootRnPkg = path.join(rootModules, 'react-native', 'package.json');
if (fs.existsSync(rootRnPkg) && !fs.existsSync(path.join(mobileModules, 'react-native'))) {
  const version = JSON.parse(fs.readFileSync(rootRnPkg, 'utf8')).version;
  if (!String(version).startsWith('0.76.')) {
    console.warn(
      `[yellout-mobile] root react-native@${version} is not 0.76.x — Expo SDK 52 may break. Check package.json overrides.`
    );
  } else {
    console.log(`[yellout-mobile] using hoisted react-native@${version}`);
  }
  process.exit(0);
}

for (const name of ['expo-router', 'react-native', 'react', 'babel-preset-expo', 'query-string']) {
  linkOrCopy(name);
}
