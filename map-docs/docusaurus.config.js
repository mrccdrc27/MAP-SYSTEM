// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MAP Industry',
  tagline: 'Capstone Documentation & Resources',
  favicon: 'img/map-logo.png',

  url: 'http://localhost',
  baseUrl: '/',

  organizationName: 'Capstone', 
  projectName: 'ticket-tracking-system', 

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false, 
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
    // Redocusaurus config
    [
      'redocusaurus',
      {
        specs: [],
        theme: {
          primaryColor: '#007bff',
        },
      },
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: "/docs",
      }),
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/map-logo.png',
      navbar: {
        title: 'MAP Industry',
        logo: {
          alt: 'MAP Industry Logo',
          src: 'img/map-logo.png',
        },
        items: [
          {
            to: '/docs/platform/architecture',
            label: 'Platform Core',
            position: 'left',
          },
          {
            to: '/docs/ams/intro',
            label: 'AMS',
            position: 'left',
          },
          {
            to: '/docs/bms/intro',
            label: 'BMS',
            position: 'left',
          },
          {
            to: '/docs/tts/intro',
            label: 'TTS',
            position: 'left',
          },
          {
            to: '/docs/hdts/intro',
            label: 'HDTS',
            position: 'left',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Overview',
                to: '/docs/platform/overview',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} MAP Industry. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;