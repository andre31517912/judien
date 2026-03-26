const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root (two levels up from apps/mobile)
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro picks up changes in packages/shared
config.watchFolders = [monorepoRoot];

// Let Metro resolve from both the app's node_modules AND the root's
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
