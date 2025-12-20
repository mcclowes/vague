import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'introduction',
    'getting-started',
    {
      type: 'category',
      label: 'Language Guide',
      collapsed: false,
      items: [
        'language/schemas-and-datasets',
        'language/types-and-ranges',
        'language/superposition',
        'language/constraints',
        'language/cross-references',
        'language/computed-fields',
        'language/conditional-fields',
        'language/side-effects',
        'language/refine-blocks',
      ],
    },
    {
      type: 'category',
      label: 'Plugins',
      items: [
        'plugins/faker',
        'plugins/issuer',
        'plugins/dates',
        'plugins/regex',
        'plugins/custom-plugins',
      ],
    },
    {
      type: 'category',
      label: 'Advanced Features',
      items: [
        'advanced/distributions',
        'advanced/sequences',
        'advanced/string-functions',
        'advanced/date-functions',
        'advanced/negative-testing',
        'advanced/dataset-validation',
      ],
    },
    {
      type: 'category',
      label: 'OpenAPI Integration',
      items: [
        'openapi/importing-schemas',
        'openapi/validation',
        'openapi/example-population',
        'openapi/linting',
      ],
    },
    'cheat-sheet',
    'syntax-reference',
    'faq',
    'cli',
    'typescript-api',
    'schema-inference',
    'comparison',
    'contributing',
  ],
};

export default sidebars;
