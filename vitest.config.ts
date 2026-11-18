import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Configuração isolada do build: testa apenas funções puras de `src/lib`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
