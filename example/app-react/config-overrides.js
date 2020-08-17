const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const { override, fixBabelImports, addDecoratorsLegacy, addWebpackAlias } = require("customize-cra");

function resolve (dir) {
  return path.join(__dirname, dir);
}

module.exports = function (config, env) {
  const isDebug = env === "development";
  let htmlPlugin = config.plugins.find(d => d instanceof HtmlWebpackPlugin);
  let devHtmlInject = {
    css: [
      "/static/css/loading.min.css",
      "/static/css/atomic.min.css"
    ],
    js: [
      "https://webapi.amap.com/maps?v=1.4.8&key=9f471704ae22d62e33a161b7e58e8f42",
      "https://webapi.amap.com/maps?v=1.4.8&key=9f471704ae22d62e33a161b7e58e8f42&plugin=AMap.Driving"
    ]
  };
  let prodHtmlInject = {
    css: [
      "./static/css/loading.min.css",
      "./static/css/atomic.min.css"
    ],
    js: [
      "https://webapi.amap.com/maps?v=1.4.8&key=9f471704ae22d62e33a161b7e58e8f42",
      "https://webapi.amap.com/maps?v=1.4.8&key=9f471704ae22d62e33a161b7e58e8f42&plugin=AMap.Driving"
    ]
  };
  htmlPlugin.options.injectOption = isDebug ? devHtmlInject : prodHtmlInject;
  override([
    fixBabelImports("import", {
      libraryName: "antd",
      libraryDirectory: "es",
      style: "css"
    }),
    addWebpackAlias({
      "@utils": resolve("src/utils"),
      "@pages": resolve("src/pages"),
      "@components": resolve("src/components"),
      "@store": resolve("src/store")
    }),
    // 装饰器
    addDecoratorsLegacy()
  ])(config, env);
  return config;
};
