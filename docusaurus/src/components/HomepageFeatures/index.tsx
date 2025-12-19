import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Declarative Schemas',
    emoji: '📝',
    description: (
      <>
        Define the shape of your data once. Schemas describe structure, types,
        ranges, and constraints — Vague handles generation.
      </>
    ),
  },
  {
    title: 'Realistic Distributions',
    emoji: '🎲',
    description: (
      <>
        Express intent with weighted choices: <code>0.8: "active" | 0.2: "inactive"</code>.
        Statistical distributions like gaussian, poisson, and beta for realistic patterns.
      </>
    ),
  },
  {
    title: 'Constraints That Work',
    emoji: '✓',
    description: (
      <>
        Hard constraints like <code>assume due_date {'>='} issued_date</code> are enforced.
        Conditional constraints for complex business logic.
      </>
    ),
  },
  {
    title: 'Cross-Record References',
    emoji: '🔗',
    description: (
      <>
        Reference other records naturally: <code>customer: any of customers where .status == "active"</code>.
        Build realistic relational data.
      </>
    ),
  },
  {
    title: 'OpenAPI Integration',
    emoji: '📄',
    description: (
      <>
        Import schemas from OpenAPI specs. Validate generated data. Populate specs with realistic examples.
      </>
    ),
  },
  {
    title: 'Edge Case Testing',
    emoji: '🔬',
    description: (
      <>
        Built-in generators for Unicode exploits, SQL injection patterns, and boundary values.
        Generate constraint-violating data with <code>violating</code> datasets.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center" style={{fontSize: '3rem', marginBottom: '1rem'}}>
        {emoji}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
