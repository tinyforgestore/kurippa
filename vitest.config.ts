import { defineConfig } from 'vitest/config';
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    clearMocks: true,
    exclude: ['.claude/**', '**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**'],
      exclude: [
        'src/assets/**',
        'src/main.tsx',
        'src/settingsMain.tsx',
        'src/vite-env.d.ts',
        'src/**/*.css.ts',
        'src/types/**',
      ],
    },
  },
});
