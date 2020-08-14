module.exports = {
  publicPath: "http://localhost:81/",
  outputDir: "one",
  assetsDir: "static",
  configureWebpack: {
    output: {
      filename: process.env.NODE_ENV === "development" ? "static/js/[name].js" : "static/js/[name].[contenthash].js",
      libraryTarget: "umd",
      library: "appOne"
    }
  },
  devServer: {
    open: false,
    port: 81,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000",
      "Access-Control-Allow-Methods": "GET"
    }
  }
};
