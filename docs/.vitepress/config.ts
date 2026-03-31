import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FrontendDevHelper',
  description: 'The ultimate frontend developer toolkit - 35+ professional tools in one browser extension',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Tools', link: '/tools/dom-outliner' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Keyboard Shortcuts', link: '/guide/shortcuts' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Beast Mode Features', link: '/guide/beast-mode' },
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Inspection Tools',
          items: [
            { text: 'DOM Outliner', link: '/tools/dom-outliner' },
            { text: 'Smart Element Picker', link: '/tools/smart-element-picker' },
          ]
        },
        {
          text: 'CSS & Design',
          items: [
            { text: 'Color Picker', link: '/tools/color-picker' },
            { text: 'Container Query Inspector', link: '/tools/container-query-inspector' },
          ]
        },
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rejisterjack/frontend-dev-helper' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 FrontendDevHelper Contributors'
    }
  }
})
