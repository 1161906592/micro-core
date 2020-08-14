module.exports = {
  devServer: {
    port: 5000,
    proxy: {
      "/nav": {
        target: "http://127.0.0.1:80",
        pathRewrite: {
          // '^/nav': '/'
        }
      },
      "/one": {
        target: "http://127.0.0.1:81",
        pathRewrite: {
          // '^/one': '/'
        }
      },
    }
  }
};
