import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const exampleCode = `schema Customer {
  id: uuid(),
  name: fullName(),
  status: 0.8: "active" | 0.2: "inactive"
}

schema Invoice {
  customer: any of customers where .status == "active",
  amount: decimal in 100..10000,
  issued_date: date in 2024..2024,
  due_date: date in 2024..2024,

  assume due_date >= issued_date
}

dataset TestData {
  customers: 50 of Customer,
  invoices: 200 of Invoice
}`;

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx('container', styles.heroContent)}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          Test data, described precisely
        </div>
        <Heading as="h1" className={clsx('hero__title', styles.heroTitle)}>
          Realistic test data,
          <span> without the fixture sprawl.</span>
        </Heading>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className={clsx('button button--lg', styles.primaryButton)}
            to="/docs">
            Get started
          </Link>
          <Link
            className={clsx('button button--lg', styles.secondaryButton)}
            href="https://github.com/mcclowes/vague">
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageExample() {
  return (
    <section className={styles.example}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--6', styles.exampleText)}>
            <span className={styles.sectionLabel}>A language for valid data</span>
            <Heading as="h2">Declare the shape. Vague handles the rest.</Heading>
            <p>
              Describe structure, constraints, distributions, and relationships.
              Vague generates data that follows the rules.
            </p>
            <ul>
              <li><strong>Weighted distributions:</strong> <code>0.8: "active" | 0.2: "inactive"</code></li>
              <li><strong>Constraints:</strong> <code>assume due_date {'>='} issued_date</code></li>
              <li><strong>Cross-references:</strong> <code>any of customers where .status == "active"</code></li>
              <li><strong>Computed fields:</strong> <code>total: sum(line_items.amount)</code></li>
            </ul>
          </div>
          <div className={clsx('col col--6', styles.exampleCode)}>
            <CodeBlock language="vague" title="example.vague">
              {exampleCode}
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Declarative Test Data Generation"
      description="A declarative language for generating realistic test data with constraints, relationships, and distributions">
      <HomepageHeader />
      <main>
        <HomepageExample />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
