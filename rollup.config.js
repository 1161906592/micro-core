import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";

import ts from "rollup-plugin-typescript2";
import path from "path";

export default {
  input: "src/index.ts",

  plugins: [
    resolve(),
    commonjs(),
    ts({
      tsconfig: path.resolve(__dirname, "tsconfig.json"),
    }),
    replace({
      __DEV__: true
    }),
  ],
  output: {
    file: "example/whale-spa.js",
    format: "es",
    name: "micro"
  }
};
