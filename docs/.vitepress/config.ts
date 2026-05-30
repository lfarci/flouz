import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'flouz',
  description: 'AI-powered personal finance CLI for bank transactions',
  base: '/flouz/',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/flouz/logo.svg' }]],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Commands', link: '/commands/transactions' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'CSV Format', link: '/csv-format' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'AI Providers', link: '/ai-providers' },
        ],
      },
      {
        text: 'Commands',
        items: [
          { text: 'transactions', link: '/commands/transactions' },
          { text: 'accounts', link: '/commands/accounts' },
          { text: 'budget', link: '/commands/budget' },
          { text: 'config', link: '/commands/config' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Database', link: '/database' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/lfarci/flouz' }],

    footer: {
      message: 'Released under the MIT License.',
    },

    search: {
      provider: 'local',
    },
  },
})
