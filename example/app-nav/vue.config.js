module.exports = {
  publicPath: "http://localhost:80/",
  outputDir: "nav",
  assetsDir: "static",
  configureWebpack: {
    output: {
      filename: process.env.NODE_ENV === "development" ? "static/js/[name].js" : "static/js/[name].[contenthash].js",
      libraryTarget: "umd",
      library: "appNav"
    }
  },
  devServer: {
    open: false,
    port: 80,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000",
      "Access-Control-Allow-Methods": "GET"
    }
  }
};
