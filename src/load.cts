// This module loads the platform-specific build of the addon on
// the current system. The supported platforms are registered in
// the `platforms` object below, whose entries can be managed by
// by the Neon CLI:
//
//   https://www.npmjs.com/package/@neon-rs/cli

module.exports = require('@neon-rs/load').proxy({
  platforms: {
    'win32-x64-msvc': () => require('@rnode-server/win32-x64-msvc'),
    'win32-arm64-msvc': () => require('@rnode-server/win32-arm64-msvc'),
    'darwin-x64': () => require('@rnode-server/darwin-x64'),
    'darwin-arm64': () => require('@rnode-server/darwin-arm64'),
    'linux-x64-gnu': () => require('@rnode-server/linux-x64-gnu'),
    'linux-arm64-gnu': () => require('@rnode-server/linux-arm64-gnu'),
    'linux-x64-musl': () => require('@rnode-server/linux-x64-musl'),
    'linux-arm64-musl': () => require('@rnode-server/linux-arm64-musl'),
    'linux-arm-gnueabihf': () => require('@rnode-server/linux-arm-gnueabihf'),
    'android-arm-eabi': () => require('@rnode-server/android-arm-eabi')
  },
  debug: () => require('../index.node')
});
