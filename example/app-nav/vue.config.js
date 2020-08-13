process.env.PUBLIC_PATH = "/nav/";

module.exports = {
  /*
   * nginx配置
   * root html;
   * try_files $uri $uri/ /{publicPath}/index.html;
   * */
  // 生产环境如果以绝对路径打包 注册中心可以与应用分开部署发布
  // publicPath: process.env.NODE_ENV === "development" ? "/microApp/" : "http://localhost:8088/microApp",
  publicPath: process.env.PUBLIC_PATH,
  outputDir: process.env.PUBLIC_PATH.replace("/", ""), // outputDir 应该和 publicPath 一致
  assetsDir: "static",
  configureWebpack: {
    output: {
      // contenthash的缓存粒度是最优的
      filename:
        process.env.NODE_ENV === "development"
          ? "static/js/[name].js"
          : "static/js/[name].[contenthash].js",
      libraryTarget: "umd",
      library: "appNav"
    },
    devtool: "source-map"
  },
  devServer: {
    open: false,
    host: "0.0.0.0",
    port: 80,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE"
    }
  }
};
