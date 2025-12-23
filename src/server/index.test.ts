import { describe, it, expect, afterEach } from 'vitest';
import { createMockServer, type MockServer } from './index.js';

describe('createMockServer', () => {
  let server: MockServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should create a server with correct collections', async () => {
    const source = `
      schema User { id: int, name: string }
      dataset Test { users: 3 of User }
    `;

    server = await createMockServer(source, { port: 3455 });
    expect(server.collections).toEqual(['users']);
    expect(server.port).toBe(3455);
  });

  it('should list endpoints at root', async () => {
    const source = `
      schema User { id: int, name: string }
      schema Order { id: int, total: int }
      dataset Test { users: 2 of User, orders: 3 of Order }
    `;

    server = await createMockServer(source, { port: 3456 });
    await server.listen();

    const response = await fetch('http://localhost:3456/');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoints).toContain('/users');
    expect(data.endpoints).toContain('/orders');
  });

  it('should return collection data', async () => {
    const source = `
      schema User { id: int in 1..100, name: "Alice" | "Bob" }
      dataset Test { users: 5 of User }
    `;

    server = await createMockServer(source, { port: 3457, seed: 42 });
    await server.listen();

    const response = await fetch('http://localhost:3457/users');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(5);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
  });

  it('should return single item by index', async () => {
    const source = `
      schema User { id: int in 1..100, name: "Test" }
      dataset Test { users: 3 of User }
    `;

    server = await createMockServer(source, { port: 3458, seed: 42 });
    await server.listen();

    const response = await fetch('http://localhost:3458/users/0');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
  });

  it('should return 404 for unknown collection', async () => {
    const source = `
      schema User { id: int }
      dataset Test { users: 1 of User }
    `;

    server = await createMockServer(source, { port: 3459 });
    await server.listen();

    const response = await fetch('http://localhost:3459/unknown');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
    expect(data.available).toContain('users');
  });

  it('should return 404 for out of range index', async () => {
    const source = `
      schema User { id: int }
      dataset Test { users: 2 of User }
    `;

    server = await createMockServer(source, { port: 3460 });
    await server.listen();

    const response = await fetch('http://localhost:3460/users/99');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('out of range');
  });

  it('should return 405 for non-GET methods', async () => {
    const source = `
      schema User { id: int }
      dataset Test { users: 1 of User }
    `;

    server = await createMockServer(source, { port: 3461 });
    await server.listen();

    const response = await fetch('http://localhost:3461/users', { method: 'POST' });
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data.error).toContain('not allowed');
  });

  it('should generate deterministic data with seed', async () => {
    const source = `
      schema User { id: int in 1..1000 }
      dataset Test { users: 3 of User }
    `;

    server = await createMockServer(source, { port: 3462, seed: 123 });
    await server.listen();

    const response1 = await fetch('http://localhost:3462/users');
    const data1 = await response1.json();

    const response2 = await fetch('http://localhost:3462/users');
    const data2 = await response2.json();

    // With same seed, each request should generate identical data
    expect(data1).toEqual(data2);
  });
});
