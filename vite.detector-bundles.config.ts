import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({ build: { outDir: "test-results/detector-bundles", emptyOutDir: true, minify: "oxc", lib: {
  entry: { control: resolve(__dirname, "src/detector-benchmark/bundle-control.ts"), candidates: resolve(__dirname, "src/detector-benchmark/bundle-candidates.ts") }, formats: ["es"] },
  rollupOptions: { output: { entryFileNames: "[name].js", chunkFileNames: "shared-[hash].js" } } } });
