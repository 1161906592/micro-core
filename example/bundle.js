(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.micro = {}));
}(this, (function (exports) { 'use strict';

  var AppStatus;
  (function (AppStatus) {
      AppStatus[AppStatus["NOT_LOAD"] = 0] = "NOT_LOAD";
      AppStatus[AppStatus["NOT_MOUNTED"] = 1] = "NOT_MOUNTED";
      AppStatus[AppStatus["MOUNTED"] = 2] = "MOUNTED";
  })(AppStatus || (AppStatus = {}));
  const registeredApps = [];
  function registerApps(apps) {
      if (!Array.isArray(apps)) {
          apps = [apps];
      }
      apps.forEach((app) => {
          {
              if (registeredApps.find(d => d.name === app.name)) {
                  console.error(`存在与 ${app.name} 同名的应用已经被注册`);
              }
          }
          const runtimeApp = {
              ...app,
              status: AppStatus.NOT_LOAD
          };
          registeredApps.push(runtimeApp);
      });
  }
  function diffApps() {
      const appsToLoad = [];
      const appsToMount = [];
      const appsToUnmount = [];
      registeredApps.forEach((app) => {
          const isActive = shouldActive(app);
          switch (app.status) {
              case AppStatus.NOT_LOAD:
                  if (isActive) {
                      appsToLoad.push(app);
                      appsToMount.push(app);
                  }
                  break;
              case AppStatus.NOT_MOUNTED:
                  if (isActive) {
                      appsToMount.push(app);
                  }
                  break;
              case AppStatus.MOUNTED:
                  if (!isActive) {
                      appsToUnmount.push(app);
                  }
                  break;
          }
      });
      return { appsToLoad, appsToMount, appsToUnmount };
  }
  function shouldActive(app) {
      try {
          return app.active();
      }
      catch (e) {
          console.error(e);
          return false;
      }
  }
  async function loadApp(app) {
      try {
          const { bootstrap, mount, unmount } = await app.loader();
          app.bootstrap = bootstrap;
          app.mount = mount;
          app.unmount = unmount;
          await bootstrap();
      }
      catch (e) {
          console.error(e);
      }
  }
  async function mountApp(app) {
      try {
          await app.mount();
          app.status = AppStatus.MOUNTED;
      }
      catch (e) {
          console.error(e);
      }
  }
  async function unmountApp(app) {
      try {
          await app.unmount();
          app.status = AppStatus.NOT_MOUNTED;
      }
      catch (e) {
          console.error(e);
      }
  }
  async function updateApps() {
      const { appsToLoad, appsToMount, appsToUnmount } = diffApps();
      await appsToUnmount.map((app) => unmountApp(app));
      await Promise.all(appsToLoad.map((app) => loadApp(app)));
      await Promise.all(appsToMount.map((app) => mountApp(app)));
  }

  function request(url) {
      return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                  if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                      resolve(xhr.responseText);
                  }
                  else {
                      reject(xhr);
                  }
              }
          };
          xhr.open("get", url);
          xhr.send();
      });
  }

  const MATCH_ANY_OR_NO_PROPERTY = /["'=\w\s\/]*/;
  const SCRIPT_URL_RE = new RegExp("<\\s*script" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      "(?:src=\"(.+?)\")" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      "(?:\\/>|>[\\s]*<\\s*\\/script>)?", "g");
  const SCRIPT_CONTENT_RE = new RegExp("<\\s*script" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      ">([\\w\\W]+?)<\\s*\\/script>", "g");
  const MATCH_NONE_QUOTE_MARK = /[^"]/;
  const CSS_URL_RE = new RegExp("<\\s*link[^>]*" +
      "href=\"(" +
      MATCH_NONE_QUOTE_MARK.source +
      "+.css" +
      MATCH_NONE_QUOTE_MARK.source +
      "*)\"" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      ">(?:\\s*<\\s*\\/link>)?", "g");
  const STYLE_RE = /<\s*style\s*>([^<]*)<\s*\/style>/g;
  const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
  const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;
  const TEST_URL = /^(?:https?):\/\/[-a-zA-Z0-9.]+/;
  const REPLACED_BY_BERIAL = "Script replaced by Berial.";
  async function importHtml(app) {
      const template = await request(app.entry);
      const styleNodes = await loadCSS(template);
      const bodyNode = loadBody(template);
      const lifecycle = await loadScript(template, window, app.name);
      return { lifecycle, styleNodes, bodyNode };
  }
  async function loadScript(template, global, name) {
      const { scriptURLs, scripts } = parseScript(template);
      const fetchedScripts = await Promise.all(scriptURLs.map((url) => request(url)));
      const scriptsToLoad = fetchedScripts.concat(scripts);
      let lifecycle;
      scriptsToLoad.forEach((script) => {
          lifecycle = runScript(script, global, name);
      });
      if (!lifecycle) {
          throw new Error(`找不到 ${name} 的应用入口`);
      }
      return lifecycle;
  }
  function parseScript(template) {
      const scriptURLs = [];
      const scripts = [];
      SCRIPT_URL_RE.lastIndex = SCRIPT_CONTENT_RE.lastIndex = 0;
      let match;
      while ((match = SCRIPT_URL_RE.exec(template))) {
          let captured = match[1].trim();
          if (!captured)
              continue;
          if (!TEST_URL.test(captured)) {
              captured = window.location.origin + captured;
          }
          scriptURLs.push(captured);
      }
      while ((match = SCRIPT_CONTENT_RE.exec(template))) {
          const captured = match[1].trim();
          if (!captured)
              continue;
          scripts.push(captured);
      }
      return {
          scriptURLs,
          scripts
      };
  }
  function runScript(script, global, umdName) {
      const resolver = new Function("window", `
    try {
      ${script}
      return window['${umdName}']
    }
    catch(e) {
      console.log(e)
    }
  `);
      return resolver.call(global, global);
  }
  async function loadCSS(template) {
      const { cssURLs, styles } = parseCSS(template);
      const fetchedStyles = await Promise.all(cssURLs.map((url) => request(url)));
      return toStyleNodes(fetchedStyles.concat(styles));
      function toStyleNodes(styles) {
          return styles.map((style) => {
              const styleNode = document.createElement("style");
              styleNode.appendChild(document.createTextNode(style));
              return styleNode;
          });
      }
  }
  function parseCSS(template) {
      const cssURLs = [];
      const styles = [];
      CSS_URL_RE.lastIndex = STYLE_RE.lastIndex = 0;
      let match;
      while ((match = CSS_URL_RE.exec(template))) {
          let captured = match[1].trim();
          if (!captured)
              continue;
          if (!TEST_URL.test(captured)) {
              captured = window.location.origin + captured;
          }
          cssURLs.push(captured);
      }
      while ((match = STYLE_RE.exec(template))) {
          const captured = match[1].trim();
          if (!captured)
              continue;
          styles.push(captured);
      }
      return {
          cssURLs,
          styles
      };
  }
  function loadBody(template) {
      let bodyContent = template.match(BODY_CONTENT_RE)?.[1] ?? "";
      bodyContent = bodyContent.replace(SCRIPT_ANY_RE, scriptReplacer);
      const body = document.createElement("div");
      body.innerHTML = bodyContent;
      return body;
      function scriptReplacer(substring) {
          const matchedURL = SCRIPT_URL_RE.exec(substring);
          if (matchedURL) {
              return `<!-- ${REPLACED_BY_BERIAL} Original script url: ${matchedURL[1]} -->`;
          }
          return `<!-- ${REPLACED_BY_BERIAL} Original script: inline script -->`;
      }
  }

  class Router {
      constructor(base) {
          this.base = normalizeBase(base);
          this.current = "/";
          this.beforeHooks = [];
          this.listeners = [];
          const handleRoutingEvent = () => {
              this.transitionTo(getLocation(this.base));
          };
          window.addEventListener("popstate", handleRoutingEvent);
          this.listeners.push(() => {
              window.removeEventListener("popstate", handleRoutingEvent);
          });
      }
      push(url) {
          this.transitionTo(url, () => {
              pushState(cleanPath(this.base + url));
          });
      }
      replace(url) {
          this.transitionTo(url, () => {
              pushState(cleanPath(this.base + url), true);
          });
      }
      go(delta) {
          history.go(delta);
      }
      back() {
          this.go(-1);
      }
      beforeEach(fn) {
          this.beforeHooks.push(fn);
          return this;
      }
      destroy() {
          this.listeners.forEach(cleanupListener => {
              cleanupListener();
          });
          this.listeners = [];
      }
      ensureURL(push) {
          if (this.getCurrentLocation() !== this.current) {
              const current = cleanPath(this.base + this.current);
              push ? pushState(current) : pushState(current, true);
          }
      }
      getCurrentLocation() {
          return getLocation(this.base);
      }
      transitionTo(url, cb) {
          if (this.current === url) {
              return;
          }
          runQueue(this.beforeHooks, (hook, next) => {
              hook(url, this.current, (to) => {
                  if (to === false) {
                      this.ensureURL(true);
                  }
                  else if (typeof to === "string" || typeof to === "object") {
                      if (typeof to === "object") {
                          if (to.replace) {
                              this.replace(to.path);
                          }
                          else {
                              this.push(to.path);
                          }
                      }
                      else {
                          this.push(to);
                      }
                  }
                  else {
                      next();
                  }
              });
          }, () => {
              cb && cb();
              this.commit(url);
          });
      }
      commit(url) {
          this.current = url;
          updateApps();
      }
  }
  function pushState(url, replace) {
      const history = window.history;
      try {
          if (replace) {
              history.replaceState("", "", url);
          }
          else {
              history.pushState("", "", url);
          }
      }
      catch (e) {
          window.location[replace ? "replace" : "assign"](url);
      }
  }
  function normalizeBase(base) {
      if (!base) {
          base = "/";
      }
      if (base.charAt(0) !== "/") {
          base = "/" + base;
      }
      return base.replace(/\/$/, "");
  }
  function getLocation(base) {
      let path = decodeURI(window.location.pathname);
      if (base && path.indexOf(base) === 0) {
          path = path.slice(base.length);
      }
      return (path || "/") + window.location.search + window.location.hash;
  }
  function cleanPath(path) {
      return path.replace(/\/\//g, "/");
  }
  function runQueue(queue, fn, cb) {
      next(0);
      function next(index) {
          if (index >= queue.length) {
              cb();
          }
          else {
              if (queue[index]) {
                  fn(queue[index], () => {
                      next(index + 1);
                  });
              }
              else {
                  next(index + 1);
              }
          }
      }
  }

  function register(apps) {
      if (!Array.isArray(apps)) {
          apps = [apps];
      }
      registerApps(apps.map((app) => {
          return {
              name: app.name,
              active: app.active,
              loader: async () => {
                  const { lifecycle, styleNodes } = await importHtml(app);
                  let host;
                  return {
                      bootstrap: async () => {
                          host = document.createElement("div");
                          host.id = "micro-" + app.name;
                          document.body.appendChild(host);
                          styleNodes.forEach((styleNode) => {
                              document.head.appendChild(styleNode);
                          });
                      },
                      mount: async () => {
                          await lifecycle.mount(host);
                      },
                      unmount: async () => {
                          await lifecycle.unmount(host);
                      }
                  };
              },
              meta: app.meta
          };
      }));
  }

  exports.Router = Router;
  exports.importHtml = importHtml;
  exports.register = register;
  exports.registerApps = registerApps;
  exports.updateApps = updateApps;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
