import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

import babel from "@rollup/plugin-babel";
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
    babel({
      babelrc: false,
      "include": [
        "src/**"
      ],
      "extensions": ["ts"],
      "babelHelpers": "runtime",
      "presets": [
        [
          "@babel/preset-env",
          {
            "targets": {
              "browsers": ["chrome 81"]
            },
            "useBuiltIns": "usage",
            "corejs": 2
          }
        ]
      ],
      "plugins": ["@babel/plugin-transform-runtime"]
    }),
    // terser()
  ],
  // external: id => id.includes('@babel/runtime'),
  output: {
    file: "example/bundle.js",
    format: "umd",
    name: "micro"
  }
};
