/**
 * CLI handler for mock server mode.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import { compile } from '../../index.js';
import type { CliOptions } from '../types.js';

export async function handleServe(options: CliOptions): Promise<void> {
  if (!options.inputFile) {
    console.error('Error: Input file is required for --serve');
    process.exit(1);
  }

  const source = fs.readFileSync(options.inputFile, 'utf-8');
  const port = options.servePort!;

  // Compile once at startup to show available endpoints
  const initialDataset = await compile(source, { seed: options.seed ?? undefined });
  const collections = Object.keys(initialDataset);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }));
      return;
    }

    try {
      // Generate fresh data per request (unless seed is specified, then it's deterministic)
      const dataset = await compile(source, { seed: options.seed ?? undefined });

      // Parse URL path
      const urlPath = req.url || '/';
      const pathParts = urlPath.split('/').filter(Boolean);
      const collection = pathParts[0];
      const indexStr = pathParts[1];

      if (!collection) {
        // Root: list available endpoints
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              message: 'Vague Mock Server',
              endpoints: collections.map((c) => `/${c}`),
              hint: 'GET /{collection} for all items, GET /{collection}/{index} for single item',
            },
            null,
            2
          )
        );
        return;
      }

      if (!collections.includes(collection)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: `Collection '${collection}' not found`,
            available: collections,
          })
        );
        return;
      }

      const items = dataset[collection];

      if (indexStr !== undefined) {
        const index = parseInt(indexStr, 10);
        if (isNaN(index) || index < 0 || index >= items.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: `Index ${indexStr} out of range`,
              count: items.length,
              validRange: `0-${items.length - 1}`,
            })
          );
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(items[index], null, 2));
        return;
      }

      // Return all items in collection
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(items, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Failed to generate data',
          details: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });

  server.listen(port, () => {
    console.log(`\nVague mock server running at http://localhost:${port}\n`);
    console.log('Available endpoints:');
    for (const collection of collections) {
      const count = initialDataset[collection].length;
      console.log(`  GET /${collection}        (${count} items)`);
      console.log(`  GET /${collection}/{index} (0-${count - 1})`);
    }
    console.log('\nPress Ctrl+C to stop\n');
  });

  // Keep the process alive
  process.stdin.resume();
}
