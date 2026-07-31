/**
 * Programmatic API for creating Vague mock servers.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { compile } from '../index.js';

export interface MockServerOptions {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Seed for reproducible generation */
  seed?: number;
  /** Hostname to bind to (default: 'localhost') */
  host?: string;
}

export interface MockServer {
  /** The underlying HTTP server */
  server: Server;
  /** Start listening */
  listen(): Promise<void>;
  /** Stop the server */
  close(): Promise<void>;
  /** The port the server is listening on */
  port: number;
  /** The collections available on this server */
  collections: string[];
}

/**
 * Create a mock HTTP server from Vague source code.
 *
 * Each collection in the dataset becomes an endpoint:
 * - GET /{collection} - returns all items
 * - GET /{collection}/{index} - returns single item
 * - GET / - lists available endpoints
 *
 * @example
 * ```typescript
 * import { createMockServer } from 'vague';
 *
 * const server = await createMockServer(`
 *   schema User { id: int, name: string }
 *   dataset Test { users: 10 of User }
 * `, { port: 3000 });
 *
 * await server.listen();
 * // GET http://localhost:3000/users
 * // GET http://localhost:3000/users/0
 *
 * await server.close();
 * ```
 */
export async function createMockServer(
  source: string,
  options: MockServerOptions = {}
): Promise<MockServer> {
  const { port = 3000, seed, host = 'localhost' } = options;

  // Compile once to get collection names
  const initialDataset = await compile(source, { seed });
  const collections = Object.keys(initialDataset);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }));
      return;
    }

    try {
      // Generate fresh data per request
      const dataset = await compile(source, { seed });

      // Parse URL path
      const urlPath = req.url || '/';
      const pathParts = urlPath.split('/').filter(Boolean);
      const collection = pathParts[0];
      const indexStr = pathParts[1];

      if (!collection) {
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

  return {
    server,
    port,
    collections,
    listen(): Promise<void> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          resolve();
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        // Only close if server is listening
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
