import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
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
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx('container', styles.heroContent)}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          A declarative data language
        </div>
        <Heading as="h1" className={clsx('hero__title', styles.heroTitle)}>
          Data that follows
          <span> the rules.</span>
        </Heading>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
          Generate realistic datasets, validate relationships, and build
          domain-specific workflows on the same language core.
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

function HomepageExtension() {
  return (
    <section className={styles.extension}>
      <div className={clsx('container', styles.extensionGrid)}>
        <div className={styles.extensionText}>
          <span className={styles.sectionLabel}>Built to extend</span>
          <Heading as="h2">The language core goes further than fixtures.</Heading>
          <p>
            Vague exposes its lexer, expression system, schemas, constraints,
            and plugin hooks for specialized declarative languages.
          </p>
          <p>
            Reqon uses that foundation to define durable API synchronization
            pipelines with validation, concurrency, scheduling, and resumable
            execution.
          </p>
          <Link
            className={styles.textLink}
            href="https://github.com/mcclowes/reqon">
            Explore Reqon <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.proofCard}>
          <div className={styles.proofHeader}>
            <span>Built on Vague</span>
            <strong>Reqon</strong>
          </div>
          <p>
            A declarative language for fetching, transforming, validating,
            and storing API data.
          </p>
          <div className={styles.proofLayers} aria-label="Reqon language layers">
            <span>Durable API workflows</span>
            <span>Reqon syntax and runtime</span>
            <span>Vague language core</span>
          </div>
        </div>
      </div>
    </section>
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
  return (
    <Layout
      title="Data that follows the rules"
      description="A declarative language for realistic datasets, relationship validation, and domain-specific data workflows">
      <HomepageHeader />
      <main>
        <HomepageExample />
        <HomepageExtension />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
