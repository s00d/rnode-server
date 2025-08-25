// This module loads the platform-specific build of the addon on
// the current system. The supported platforms are registered in
// the `platforms` object below, whose entries can be managed by
// by the Neon CLI:
//
//   https://www.npmjs.com/package/@neon-rs/cli

module.exports = require('@neon-rs/load').proxy({
  platforms: {
    'rnode-server-win32-x64-msvc': () => require('rnode-server-win32-x64-msvc'),
    'rnode-server-darwin-x64': () => require('rnode-server-darwin-x64'),
    'rnode-server-darwin-arm64': () => require('rnode-server-darwin-arm64'),
    'rnode-server-linux-x64-gnu': () => require('rnode-server-linux-x64-gnu'),
    'rnode-server-linux-arm64-gnu': () => require('rnode-server-linux-arm64-gnu')
  },
  debug: () => require('../index.node')
});
