import { defineConfig } from "tsdown"

export default defineConfig({
  exports: true,
  entry: "./src/{index,cli}.ts",
  minify: true,
  deps: {
    onlyAllowBundle: false,
  },
  target: "node22",
})
