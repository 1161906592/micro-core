process.env.PUBLIC_PATH = "/microApp/";

module.exports = {
  publicPath: process.env.PUBLIC_PATH,
  outputDir: "microApp", // outputDir 应该和 publicPath 一致
  assetsDir: "static",
  configureWebpack: {
    output: {
      filename:
        process.env.NODE_ENV === "development"
          ? "static/js/[name].js"
          : "static/js/[name].[contenthash].js",
      libraryTarget: "umd",
      library: "appList"
    },
    devtool: "source-map"
  },
  devServer: {
    open: false,
    host: "0.0.0.0",
    port: 81,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE"
    }
  }
};
