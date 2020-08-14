const path = require("path");
const fs = require("fs-extra");

const resolveApp = relativePath => path.resolve(fs.realpathSync(process.cwd()), relativePath);

module.exports = {
  resolveApp
};
