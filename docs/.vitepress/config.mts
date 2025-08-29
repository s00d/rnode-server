import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid";
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: "RNode Server",
  description: "High-performance Node.js server built with Rust, featuring Express-like API with advanced middleware support",
  lastUpdated: true,
  cleanUrls: true,
  base: process.env.NODE_ENV === 'production' ? '/rnode-server/' : '/',
  markdown: {
    config(md) {
      md.use(tabsMarkdownPlugin)
    }
  },
  mermaid: {
    // refer https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults for options
  },
  // optionally set additional config for plugin itself with MermaidPluginConfig
  mermaidPlugin: {
    class: "mermaid my-class", // set additional css classes for parent container 
  },
  themeConfig: {
    search: {
      provider: 'local',
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'WebSocket', link: '/websocket/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Templates', link: '/templates/' },
      { text: 'Monitoring', link: '/monitoring/' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/guide/' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Configuration', link: '/guide/configuration' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'App', link: '/api/app' },
          { text: 'Router', link: '/api/router' },
          { text: 'Request', link: '/api/request' },
          { text: 'Response', link: '/api/response' },
          { text: 'HTTP Utilities', link: '/api/http-utilities' },
          { text: 'Error Codes', link: '/api/error-codes' }
        ]
      },
      {
        text: 'WebSocket',
        items: [
          { text: 'Overview', link: '/websocket/' },
          { text: 'Server API', link: '/websocket/websocket' },
          { text: 'Client Library', link: '/websocket/client' },
          { text: 'Architecture', link: '/websocket/websocket-optimization' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Overview', link: '/examples/' },
          { text: 'Middleware', link: '/examples/middleware' },
          { text: 'File Operations', link: '/examples/file-operations' },
          { text: 'Advanced Usage', link: '/examples/advanced-usage' },
          { text: 'Body Handling', link: '/examples/body-handling' },
          { text: 'Playground', link: '/examples/playground' }
        ]
      },
      {
        text: 'Templates',
        items: [
          { text: 'Overview', link: '/templates/' },
          { text: 'Syntax', link: '/templates/syntax' },
          { text: 'Examples', link: '/templates/examples' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/' },
          { text: 'System Design', link: '/architecture/overview' },
          { text: 'Promise System', link: '/architecture/promise-system' }
        ]
      },
      {
        text: 'Monitoring',
        items: [
          { text: 'Overview', link: '/monitoring/' },
          { text: 'Metrics', link: '/monitoring/metrics' },
          { text: 'Metrics Examples', link: '/monitoring/metrics-examples' },
          { text: 'Grafana Dashboard', link: '/monitoring/grafana-dashboard' }
        ]
      },
      {
        text: 'TypeScript',
        items: [
          { text: 'Overview', link: '/types/' },
          { text: 'Interfaces', link: '/types/interfaces' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/s00d/rnode-server' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present RNode Server'
    }
  }
})
