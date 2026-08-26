const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Fix: Windows file watcher crashes on node_modules/nan/.github symlinks
config.resolver.blockList = [
  /node_modules[/\\]nan[/\\].*/,
];

module.exports = config;
