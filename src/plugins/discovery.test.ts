import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverPlugins } from './discovery.js';

describe('Plugin Discovery', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary directory for test plugins
    testDir = join(tmpdir(), `vague-test-plugins-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'plugins'), { recursive: true });
    await mkdir(join(testDir, 'vague-plugins'), { recursive: true });
    await mkdir(join(testDir, 'custom-plugins'), { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('returns empty array when no plugins found', async () => {
    const emptyDir = join(testDir, 'empty');
    await mkdir(emptyDir, { recursive: true });

    const result = await discoverPlugins({
      cwd: emptyDir,
      searchNodeModules: false,
    });

    expect(result).toEqual([]);
  });

  it('discovers plugin from plugins/ directory', async () => {
    // Create a test plugin
    const pluginCode = `
      export default {
        name: 'test-plugin',
        generators: {
          'hello': () => 'world'
        }
      };
    `;
    await writeFile(join(testDir, 'plugins', 'test-plugin.mjs'), pluginCode);

    const result = await discoverPlugins({
      cwd: testDir,
      searchNodeModules: false,
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    const testPlugin = result.find((p) => p.plugin.name === 'test-plugin');
    expect(testPlugin).toBeDefined();
    expect(testPlugin!.plugin.generators['hello']).toBeDefined();
    expect(testPlugin!.plugin.generators['hello']([], {} as never)).toBe('world');
  });

  it('discovers plugin from vague-plugins/ directory', async () => {
    // Create a test plugin
    const pluginCode = `
      export const plugin = {
        name: 'vague-dir-plugin',
        generators: {
          'greet': (args) => 'Hello, ' + (args[0] || 'World')
        }
      };
    `;
    await writeFile(join(testDir, 'vague-plugins', 'greet-plugin.mjs'), pluginCode);

    const result = await discoverPlugins({
      cwd: testDir,
      searchNodeModules: false,
    });

    const greetPlugin = result.find((p) => p.plugin.name === 'vague-dir-plugin');
    expect(greetPlugin).toBeDefined();
    expect(greetPlugin!.plugin.generators['greet']).toBeDefined();
    expect(greetPlugin!.plugin.generators['greet'](['Test'], {} as never)).toBe('Hello, Test');
  });

  it('discovers plugin from custom directory via pluginDirs option', async () => {
    // Create a test plugin in custom directory
    const pluginCode = `
      export default {
        name: 'custom-dir-plugin',
        generators: {
          'custom': () => 'custom-value'
        }
      };
    `;
    await writeFile(join(testDir, 'custom-plugins', 'custom.mjs'), pluginCode);

    const result = await discoverPlugins({
      cwd: testDir,
      pluginDirs: ['custom-plugins'],
      searchNodeModules: false,
    });

    const customPlugin = result.find((p) => p.plugin.name === 'custom-dir-plugin');
    expect(customPlugin).toBeDefined();
  });

  it('ignores invalid plugin files', async () => {
    // Create an invalid plugin file (not a valid VaguePlugin)
    const invalidCode = `
      export default {
        notAPlugin: true
      };
    `;
    const invalidPluginDir = join(testDir, 'invalid-plugins');
    await mkdir(invalidPluginDir, { recursive: true });
    await writeFile(join(invalidPluginDir, 'invalid.mjs'), invalidCode);

    const result = await discoverPlugins({
      cwd: testDir,
      pluginDirs: ['invalid-plugins'],
      searchNodeModules: false,
    });

    // The invalid plugin should not be loaded
    const invalidPlugin = result.find((p) => p.source.includes('invalid-plugins'));
    expect(invalidPlugin).toBeUndefined();
  });

  it('discovers plugin from subdirectory with index.js', async () => {
    // Create a subdirectory with index.mjs
    const subPluginDir = join(testDir, 'plugins', 'sub-plugin');
    await mkdir(subPluginDir, { recursive: true });

    const pluginCode = `
      export default {
        name: 'sub-plugin',
        generators: {
          'nested': () => 'nested-value'
        }
      };
    `;
    await writeFile(join(subPluginDir, 'index.mjs'), pluginCode);

    const result = await discoverPlugins({
      cwd: testDir,
      searchNodeModules: false,
    });

    const subPlugin = result.find((p) => p.plugin.name === 'sub-plugin');
    expect(subPlugin).toBeDefined();
  });

  it('handles non-existent directories gracefully', async () => {
    const result = await discoverPlugins({
      cwd: testDir,
      pluginDirs: ['non-existent-directory'],
      searchNodeModules: false,
    });

    // Should not throw, may return plugins from default directories
    expect(Array.isArray(result)).toBe(true);
  });

  it('respects searchNodeModules option', async () => {
    // Create a fake node_modules with a vague-plugin-* package
    const nodeModules = join(testDir, 'node_modules');
    const pkgDir = join(nodeModules, 'vague-plugin-fake');
    await mkdir(pkgDir, { recursive: true });

    // Create package.json
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'vague-plugin-fake', main: 'index.mjs' })
    );

    // Create plugin
    const pluginCode = `
      export default {
        name: 'fake-npm-plugin',
        generators: {
          'npm': () => 'from-npm'
        }
      };
    `;
    await writeFile(join(pkgDir, 'index.mjs'), pluginCode);

    // Test with searchNodeModules: true
    const withNpm = await discoverPlugins({
      cwd: testDir,
      searchNodeModules: true,
    });
    const npmPlugin = withNpm.find((p) => p.plugin.name === 'fake-npm-plugin');
    expect(npmPlugin).toBeDefined();

    // Test with searchNodeModules: false - the npm plugin should not be found
    const withoutNpm = await discoverPlugins({
      cwd: testDir,
      searchNodeModules: false,
      pluginDirs: [], // Don't search default dirs that might have been polluted
    });
    const noNpmPlugin = withoutNpm.find((p) => p.plugin.name === 'fake-npm-plugin');
    // The fake-npm-plugin should not be found when searchNodeModules is false
    expect(noNpmPlugin).toBeUndefined();
  });
});
