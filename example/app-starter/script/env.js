"use strict";

const fs = require("fs-extra");
const { resolveApp } = require("./utils");

const NODE_ENV = process.env.NODE_ENV;

if (!NODE_ENV) {
  throw new Error(
  "The NODE_ENV environment variable is required but was not specified."
  );
}

const dotEnvPath = resolveApp(".env");

[`${dotEnvPath}.${NODE_ENV}.local`, `${dotEnvPath}.${NODE_ENV}`, dotEnvPath,]
.filter(Boolean)
.forEach(dotEnvFile => {
  if (fs.existsSync(dotEnvFile)) {
    require("dotenv-expand")(
    require("dotenv").config({
      path: dotEnvFile,
    }));
  }
});

const NAME_SPACE = /^WHALE_APP_/i;

function getClientEnvironment () {
  const raw = Object.keys(process.env)
  .filter(key => NAME_SPACE.test(key))
  .reduce((env, key) => {
    env[key] = process.env[key];
    return env;
  },
  {
    NODE_ENV: process.env.NODE_ENV || "development"
  }
  );
  const stringified = {
    "process.env": Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { raw, stringified };
}

module.exports = getClientEnvironment;
