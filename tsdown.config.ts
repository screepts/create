import { defineConfig } from "tsdown"

export default defineConfig({
  exports: true,
  entry: "./src/{index,cli}.ts",
  minify: true,
  deps: {
    onlyBundle: false,
  },
  target: "node22",
})
