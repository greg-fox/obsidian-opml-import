import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, 'src/test/obsidian-stub.ts'),
		},
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'html', 'json-summary', 'json'],
			reportsDirectory: './coverage',
			include: ['src/**/*.ts'],
			exclude: [
				'src/**/*.test.ts',
				'src/types/**',
				'src/test/**',
				'src/opmlTypes.ts',
				'src/importModal.ts',
			],
			thresholds: {
				lines: 90,
				branches: 85,
				functions: 90,
				statements: 90,
			},
		},
	},
});
