import resolve from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace'
import ts from "rollup-plugin-typescript2";
import path from "path";

export default {
  input: "src/index.ts",

  plugins: [
    ts({
      tsconfig: path.resolve(__dirname, "tsconfig.json"),
    }),
    replace({
      __DEV__: true
    }),
    resolve()
  ],
  output: {
    file: "example/bundle.js",
    format: "umd",
    name: "micro"
  }
};
