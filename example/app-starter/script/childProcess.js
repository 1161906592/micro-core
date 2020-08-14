/**
 * @Describe: Describe
 * @Author: 018269
 * @Date: 2020-06-13 21:09
 */
const spawn = require("child_process").spawn;

module.exports = function run(command, args) {
  let child = spawn(command, args, {
    stdio: "inherit",
    shell: true
  });
  const delegateSignalToChildren = signal => () => {
    if (child && signal !== "SIGINT") {
      process.kill(child.pid, signal);
    }
  };
  const sigtermHandler = delegateSignalToChildren("SIGTERM");
  const sigintHandler = delegateSignalToChildren("SIGINT");
  const sigbreakHandler = delegateSignalToChildren("SIGBREAK");
  const sighupHandler = delegateSignalToChildren("SIGHUP");
  const sigquitHandler = delegateSignalToChildren("SIGQUIT");
  process.on("SIGTERM", sigtermHandler);
  process.on("SIGINT", sigintHandler);
  process.on("SIGBREAK", sigbreakHandler);
  process.on("SIGHUP", sighupHandler);
  process.on("SIGQUIT", sigquitHandler);

  child.on("exit", (exitCode, signal) => {
    child = null;
    process.removeListener("SIGTERM", sigtermHandler);
    process.removeListener("SIGINT", sigintHandler);
    process.removeListener("SIGBREAK", sigbreakHandler);
    process.removeListener("SIGHUP", sighupHandler);
    process.removeListener("SIGQUIT", sigquitHandler);

    if (exitCode !== null) {
      process.exitCode = exitCode;
    }
    if (signal !== null) {
      process.kill(process.pid, signal);
    }
  });
}
