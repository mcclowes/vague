import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Vague',
  tagline: 'A declarative language for generating realistic test data',
  favicon: 'img/favicon.ico',


  url: 'https://vague-docs.vercel.app',
  baseUrl: '/',

  organizationName: 'mcclowes',
  projectName: 'vague',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'vague, test data, data generation, mock data, fixtures, TypeScript, declarative, OpenAPI, JSON Schema, faker, testing',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'Max Clayton Clowes',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'canonical',
        href: 'https://vague-docs.vercel.app',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/mcclowes/vague/tree/main/docusaurus/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/vague-social-card.png',
    metadata: [
      {name: 'description', content: 'Vague is a declarative language for generating realistic test data. Create mock data, fixtures, and test datasets with superposition, constraints, and cross-references.'},
      {name: 'og:title', content: 'Vague - Declarative Test Data Generation'},
      {name: 'og:description', content: 'A declarative language for generating realistic test data with TypeScript/JavaScript integration, OpenAPI support, and powerful constraint systems.'},
      {name: 'og:type', content: 'website'},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:title', content: 'Vague - Declarative Test Data Generation'},
      {name: 'twitter:description', content: 'Generate realistic test data with a declarative language. Supports TypeScript, OpenAPI, constraints, and more.'},
    ],
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Vague',
      logo: {
        alt: 'Vague Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'http://vague.playground.mcclowes.com/',
          label: 'Playground',
          position: 'left',
        },
        {
          href: 'https://www.npmjs.com/package/vague-lang',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/mcclowes/vague',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Syntax Reference',
              to: '/docs/syntax-reference',
            },
            {
              label: 'CLI',
              to: '/docs/cli',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/mcclowes/vague',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/vague-lang',
            },
            {
              label: 'Issues',
              href: 'https://github.com/mcclowes/vague/issues',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Max Clayton Clowes. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
