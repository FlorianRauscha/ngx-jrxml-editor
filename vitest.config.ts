import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['projects/ngx-jrxml-editor/src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: [
      'projects/ngx-jrxml-editor/src/lib/jasper-editor.component.spec.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
  },
});
