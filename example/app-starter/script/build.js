/**
 * @Describe: Describe
 * @Author: 018269
 * @Date: 2020-06-13 21:31
 */
const fs = require("fs-extra");
const path = require("path");

const outputDir = process.env.CONFIG_MODE

// 拷贝文件
fs.copySync(path.join(process.cwd(), "../web-base/webBase"), path.join(process.cwd(), outputDir, "webBase"));
switch (outputDir) {
  case "collection":
    fs.copySync(path.join(process.cwd(), "../../datacenter-web-collection/webCollection"), path.join(process.cwd(), outputDir, outputDir));
    fs.removeSync(path.join(process.cwd(), outputDir, "register/config/config.exchange.js"));
    break;
  case "exchange":
    fs.copySync(path.join(process.cwd(), "../../datacenter-web-exchange/webExchange"), path.join(process.cwd(), outputDir, outputDir));
    fs.removeSync(path.join(process.cwd(), outputDir, "register/config/config.collection.js"));
    break;
}
