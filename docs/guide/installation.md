# Installation

## Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

## Install

:::tabs
== npm
```bash
npm install rnode-server
```

== pnpm
```bash
pnpm add rnode-server
```

== yarn
```bash
yarn add rnode-server
```
:::

## Verify Installation

```bash
node -e "console.log(require('rnode-server'))"
```

## Platform Support

RNode Server supports multiple platforms:

**macOS:**
- **arm64**: Apple Silicon (M1, M2, M3)
- **x64**: Intel processors

**Linux:**
- **arm64**: ARM 64-bit (aarch64)
- **x64**: AMD64/x86_64 processors
- **arm-gnueabihf**: ARM 32-bit with hard float

**Windows:**
- **arm64**: ARM 64-bit
- **x64**: AMD64/x86_64 processors

**Android:**
- **arm-eabi**: ARM 32-bit embedded ABI

## Next Steps

- [Quick Start](./quick-start.md) - Create your first server
- [Configuration](./configuration.md) - Configure SSL, logging, and more
