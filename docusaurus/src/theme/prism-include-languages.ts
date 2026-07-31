import siteConfig from '@generated/docusaurus.config';
import type * as PrismNamespace from 'prismjs';
import type {Optional} from 'utility-types';

export default function prismIncludeLanguages(
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: {prism},
  } = siteConfig;
  const {additionalLanguages} = prism as {additionalLanguages: string[]};

  // Prism components work on the Prism instance on the window, while prism-
  // react-renderer uses its own Prism instance. We temporarily mount the
  // instance onto window, import components to enhance it, then remove it to
  // avoid polluting global namespace.
  // You can mutate PrismObject: registering plugins, deleting languages... As
  // long as you don't re-assign it

  const PrismBefore = globalThis.Prism;
  globalThis.Prism = PrismObject;

  additionalLanguages.forEach((lang) => {
    if (lang === 'php') {
      // eslint-disable-next-line global-require
      require('prismjs/components/prism-markup-templating.js');
    }
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(`prismjs/components/prism-${lang}`);
  });

  // Register custom Vague language
  PrismObject.languages.vague = {
    comment: {
      pattern: /\/\/.*/,
      greedy: true,
    },
    string: {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true,
    },
    number: [
      // Decimals (must come before integers)
      {
        pattern: /\b\d+\.\d+\b/,
      },
      // Integers
      {
        pattern: /\b\d[\d_]*\b/,
      },
    ],
    keyword: [
      // Definition keywords
      /\b(?:schema|dataset|distribution|context|violating)\b/,
      // Import keywords
      /\b(?:import|from)\b/,
      // Constraint keywords
      /\b(?:assume|validate|constraints|refine|then)\b/,
      // Control flow keywords
      /\b(?:if|match|when)\b/,
      // Logical operators
      /\b(?:and|or|not)\b/,
      // Other keywords
      /\b(?:let|with|where|in|per|any|of|affects|unique|private)\b/,
    ],
    function: [
      // Aggregate functions
      /\b(?:sum|count|min|max|avg|median|first|last|product)\b/,
      // Math functions
      /\b(?:round|floor|ceil)\b/,
      // Distribution functions
      /\b(?:gaussian|normal|exponential|lognormal|poisson|beta|uniform)\b/,
      // Date functions
      /\b(?:now|today|datetime|daysAgo|daysFromNow|dateBetween|formatDate|weekday|weekend|dayOfWeek)\b/,
      // Sequence functions
      /\b(?:sequence|sequenceInt|previous)\b/,
      // Collection predicates
      /\b(?:all|some|none)\b/,
      // String functions
      /\b(?:uppercase|lowercase|capitalize|kebabCase|snakeCase|camelCase|trim|concat|substring|replace|length)\b/,
      // Generator functions
      /\b(?:uuid|email|phone|firstName|lastName|fullName|companyName|city|country|state|zipCode|streetAddress|sentence|paragraph)\b/,
      // Regex functions
      /\b(?:regex|alphanumeric|digits|semver|matches)\b/,
    ],
    'class-name': [
      // Namespace prefixes (faker, issuer, date)
      /\b(?:faker|issuer|date)(?=\.)/,
      // Schema/Type names (PascalCase)
      /\b[A-Z][a-zA-Z0-9_]*\b/,
    ],
    builtin: /\b(?:string|int|decimal|boolean|date)\b/,
    boolean: /\b(?:true|false)\b/,
    constant: /\bnull\b/,
    operator: [
      // Range operator (must come before single dot)
      /\.\./,
      // Arrow operator
      /=>/,
      // Null coalescing
      /\?\?/,
      // Comparison
      /==|!=|<=|>=|<|>/,
      // Compound assignment
      /\+=/,
      // Pipe for superposition
      /\|/,
      // Parent reference
      /\^/,
      // Assignment
      /=/,
      // Arithmetic
      /[+\-*/%]/,
      // Ternary
      /\?/,
      // Distribution
      /~/,
    ],
    punctuation: /[{}[\](),.:]/,
  };

  // Clean up and eventually restore former globalThis.Prism object (if any)
  delete (globalThis as Optional<typeof globalThis, 'Prism'>).Prism;
  if (typeof PrismBefore !== 'undefined') {
    globalThis.Prism = PrismObject;
  }
}
