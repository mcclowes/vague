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
    title: 'Declarative schemas',
    emoji: '01',
    description: (
      <>
        Define the shape of your data once. Schemas describe structure, types,
        ranges, and constraints — Vague handles generation.
      </>
    ),
  },
  {
    title: 'Realistic distributions',
    emoji: '02',
    description: (
      <>
        Express intent with weighted choices: <code>0.8: "active" | 0.2: "inactive"</code>.
        Statistical distributions like gaussian, poisson, and beta for realistic patterns.
      </>
    ),
  },
  {
    title: 'Constraints that work',
    emoji: '03',
    description: (
      <>
        Hard constraints like <code>assume due_date {'>='} issued_date</code> are enforced.
        Conditional constraints for complex business logic.
      </>
    ),
  },
  {
    title: 'Cross-record references',
    emoji: '04',
    description: (
      <>
        Reference other records naturally: <code>customer: any of customers where .status == "active"</code>.
        Build realistic relational data.
      </>
    ),
  },
  {
    title: 'OpenAPI integration',
    emoji: '05',
    description: (
      <>
        Import schemas from OpenAPI specs. Validate generated data. Populate specs with realistic examples.
      </>
    ),
  },
  {
    title: 'Edge-case testing',
    emoji: '06',
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
    <div className={clsx('col col--4', styles.featureCard)}>
      <div className={styles.featureCardInner}>
        <div className={styles.featureIcon}>
          {emoji}
        </div>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className={clsx('container', styles.featuresContainer)}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLabel}>Built for test suites</span>
          <Heading as="h2">Useful data, not random noise.</Heading>
          <p>
            Generate realistic test data that respects your constraints and relationships.
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
