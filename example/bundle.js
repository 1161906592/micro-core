(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.micro = {}));
}(this, (function (exports) { 'use strict';

  var AppStatus;
  (function (AppStatus) {
      AppStatus[AppStatus["NOT_LOAD"] = 0] = "NOT_LOAD";
      AppStatus[AppStatus["LOADING"] = 1] = "LOADING";
      AppStatus[AppStatus["NOT_BOOTSTRAPPED"] = 2] = "NOT_BOOTSTRAPPED";
      AppStatus[AppStatus["BOOTSTRAPPING"] = 3] = "BOOTSTRAPPING";
      AppStatus[AppStatus["NOT_MOUNTED"] = 4] = "NOT_MOUNTED";
      AppStatus[AppStatus["MOUNTING"] = 5] = "MOUNTING";
      AppStatus[AppStatus["MOUNTED"] = 6] = "MOUNTED";
      AppStatus[AppStatus["UN_MOUNTING"] = 7] = "UN_MOUNTING";
  })(AppStatus || (AppStatus = {}));
  function createApp(option = {}) {
      const registeredApps = [];
      function register(apps) {
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
      async function update() {
          const { appsToLoad, appsToMount, appsToUnmount } = diffApps();
          await Promise.all(appsToUnmount.map(async (app) => {
              return unmountApp(app, option.store && option.store.store);
          }));
          appsToLoad.forEach(async (app) => {
              await loadApp(app);
              await bootStrapApp(app, option.store);
              await mountApp(app, option.store && option.store.store);
          });
          appsToMount.forEach(async (app) => {
              await mountApp(app, option.store && option.store.store);
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
                      isActive && appsToLoad.push(app);
                      break;
                  case AppStatus.NOT_MOUNTED:
                      isActive && appsToMount.push(app);
                      break;
                  case AppStatus.MOUNTED:
                      !isActive && appsToUnmount.push(app);
                      break;
              }
          });
          return { appsToLoad, appsToMount, appsToUnmount };
      }
      if (option.router) {
          option.router.afterEach((current, next) => {
              update();
              next();
          });
      }
      return {
          register: register,
          update: update
      };
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
          app.status = AppStatus.LOADING;
          const { bootstrap, mount, unmount } = await app.loader();
          app.bootstrap = bootstrap;
          app.mount = mount;
          app.unmount = unmount;
          app.status = AppStatus.NOT_BOOTSTRAPPED;
      }
      catch (e) {
          console.error(`${app.name} 加载失败。`, e);
      }
  }
  async function bootStrapApp(app, syncStore) {
      if (app.status !== AppStatus.NOT_BOOTSTRAPPED) {
          return;
      }
      try {
          app.status = AppStatus.BOOTSTRAPPING;
          await app.bootstrap(syncStore && syncStore.addReducers);
          app.status = AppStatus.NOT_MOUNTED;
      }
      catch (e) {
          console.error(`${app.name} 初始化失败。`, e);
      }
  }
  async function mountApp(app, store) {
      if (app.status !== AppStatus.NOT_MOUNTED || !app.active()) {
          return;
      }
      try {
          app.status = AppStatus.MOUNTING;
          await app.mount(store);
          app.status = AppStatus.MOUNTED;
          if (!app.active()) {
              await unmountApp(app, store);
          }
      }
      catch (e) {
          console.error(`${app.name} 挂载失败。`, e);
      }
  }
  async function unmountApp(app, store) {
      if (app.status !== AppStatus.MOUNTED || app.active()) {
          return;
      }
      try {
          app.status = AppStatus.UN_MOUNTING;
          await app.unmount(store);
          app.status = AppStatus.NOT_MOUNTED;
      }
      catch (e) {
          console.error(`${app.name} 卸载失败。`, e);
      }
  }

  const URL_REGEX = "(?:(https?):\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]";
  const MATCH_ANY_OR_NO_PROPERTY = /["'=\w\s\/]*/;
  const SCRIPT_URL_RE = new RegExp("<\\s*script" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      "(?:src=\"(.+?)\")" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      "(?:\\/>|>[\\s]*<\\s*\\/script>)?", "g");
  const SCRIPT_CONTENT_RE = new RegExp("<\\s*script" +
      MATCH_ANY_OR_NO_PROPERTY.source +
      ">([\\w\\W]+?)<\\s*\\/script>", "g");
  const CSS_URL_STYLE_RE = new RegExp(`<\\s*link[^>]*href=["']?(${URL_REGEX}*)["']?[^/>]*/?>|<\\s*style\\s*>([^<]*)<\\s*/style>`, "g");
  const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
  const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;
  const TEST_URL = /^(?:https?):\/\/[-a-zA-Z0-9.]+/;
  const REPLACED_BY_BERIAL = "Script replaced by MicroCore.";
  async function importHtml(app) {
      const template = await request(app.entry);
      const cssResult = await parseCSS(template);
      const bodyHTML = loadBody(template);
      const lifecycle = await loadScript(template, window, app.name);
      return { lifecycle, cssResult, bodyHTML };
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
  // 按顺序解析行内css和外链css
  function parseCSS(template) {
      const result = [];
      CSS_URL_STYLE_RE.lastIndex = 0;
      let match;
      while ((match = CSS_URL_STYLE_RE.exec(template))) {
          let [, cssURL, style] = match;
          cssURL = (cssURL || "").trim();
          style = (style || "").trim();
          cssURL && result.push({
              type: "cssURL",
              value: cssURL
          });
          style && result.push({
              type: "style",
              value: style
          });
      }
      return result;
  }
  async function loadCSSURL(cssURL) {
      return new Promise((resolve, reject) => {
          const linkNode = document.createElement("link");
          linkNode.rel = "stylesheet";
          linkNode.onload = resolve;
          linkNode.onerror = reject;
          linkNode.href = cssURL;
          document.head.appendChild(linkNode);
      }).catch((e) => {
          console.error(`css: ${cssURL} 加载失败`, e);
      });
  }
  function loadStyle(style) {
      const styleNode = document.createElement("style");
      styleNode.appendChild(document.createTextNode(style));
      document.head.appendChild(styleNode);
  }
  function loadBody(template) {
      let bodyHTML = template.match(BODY_CONTENT_RE)?.[1] ?? "";
      bodyHTML = bodyHTML.replace(SCRIPT_ANY_RE, scriptReplacer);
      return bodyHTML;
      function scriptReplacer(substring) {
          const matchedURL = SCRIPT_URL_RE.exec(substring);
          if (matchedURL) {
              return `<!-- ${REPLACED_BY_BERIAL} Original script url: ${matchedURL[1]} -->`;
          }
          return `<!-- ${REPLACED_BY_BERIAL} Original script: inline script -->`;
      }
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

  function createRouter(base) {
      let basePath = normalizeBase(base);
      let current = "/";
      let beforeHooks = [];
      let afterHooks = [];
      let listeners = [];
      window.addEventListener("popstate", handleRoutingEvent);
      listeners.push(() => {
          window.removeEventListener("popstate", handleRoutingEvent);
      });
      function handleRoutingEvent() {
          transitionTo(getLocation(basePath));
      }
      function push(url) {
          transitionTo(url, () => {
              pushState(cleanPath(basePath + url));
          });
      }
      function replace(url) {
          transitionTo(url, () => {
              pushState(cleanPath(basePath + url), true);
          });
      }
      function go(delta) {
          history.go(delta);
      }
      function back() {
          go(-1);
      }
      function beforeEach(fn) {
          beforeHooks.push(fn);
      }
      function afterEach(fn) {
          afterHooks.push(fn);
      }
      function destroy() {
          listeners.forEach(cleanupListener => {
              cleanupListener();
          });
          listeners = [];
      }
      function ensureURL(push) {
          if (getLocation(basePath) !== current) {
              const cur = cleanPath(base + current);
              push ? pushState(cur) : pushState(cur, true);
          }
      }
      function transitionTo(url, cb) {
          if (current === url) {
              return;
          }
          runQueue(beforeHooks, (hook, next) => {
              hook(url, current, (to) => {
                  if (to === false) {
                      ensureURL(true);
                  }
                  else if (typeof to === "string" || typeof to === "object") {
                      if (typeof to === "object") {
                          if (to.replace) {
                              replace(to.path);
                          }
                          else {
                              push(to.path);
                          }
                      }
                      else {
                          push(to);
                      }
                  }
                  else {
                      next();
                  }
              });
          }, () => {
              current = url;
              cb && cb();
              runQueue(afterHooks, (hook, next) => {
                  hook(current, () => {
                      next();
                  });
              });
          });
      }
      return {
          push: push,
          replace: replace,
          go: go,
          back: back,
          beforeEach(fn) {
              beforeEach(fn);
              return this;
          },
          afterEach(fn) {
              afterEach(fn);
              return this;
          },
          destroy: destroy
      };
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
  // /a//b/c -> /a/b/c
  function cleanPath(path) {
      return path.replace(/\/\//g, "/");
  }
  function runQueue(queue, fn, cb) {
      next(0);
      function next(index) {
          if (index >= queue.length) {
              cb && cb();
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

  function randomString() {
      return Math.random().toString(36).substring(7).split("").join(".");
  }
  const ActionTypes = {
      INIT: "@@store/INIT" + randomString(),
      REPLACE: "@@store/REPLACE" + randomString()
  };
  function createStore(reducer, preloadedState) {
      let currentReducer = reducer;
      let currentState = preloadedState;
      let currentListeners = [];
      let nextListeners = currentListeners;
      function ensureCanMutateNextListeners() {
          if (nextListeners === currentListeners) {
              nextListeners = currentListeners.slice();
          }
      }
      function getState() {
          return currentState;
      }
      function subscribe(listener) {
          let isSubscribed = true;
          ensureCanMutateNextListeners();
          nextListeners.push(listener);
          return function unsubscribe() {
              if (!isSubscribed) {
                  return;
              }
              isSubscribed = false;
              ensureCanMutateNextListeners();
              let index = nextListeners.indexOf(listener);
              nextListeners.splice(index, 1);
              currentListeners = null;
          };
      }
      function dispatch(action) {
          currentState = currentReducer(currentState, action);
          let listeners = currentListeners = nextListeners;
          for (let i = 0; i < listeners.length; i++) {
              let listener = listeners[i];
              listener();
          }
          return action;
      }
      function replaceReducer(nextReducer) {
          currentReducer = nextReducer;
          dispatch({
              type: ActionTypes.REPLACE
          });
      }
      dispatch({
          type: ActionTypes.INIT
      });
      return {
          dispatch: dispatch,
          subscribe: subscribe,
          getState: getState,
          replaceReducer: replaceReducer
      };
  }
  function combineReducers(reducers) {
      let reducerKeys = Object.keys(reducers);
      return function combination(state = {}, action) {
          if (state === void 0) {
              state = {};
          }
          let hasChanged = false;
          let nextState = {};
          for (let _i = 0; _i < reducerKeys.length; _i++) {
              let _key = reducerKeys[_i];
              let reducer = reducers[_key];
              let previousStateForKey = state[_key];
              let nextStateForKey = reducer(previousStateForKey, action);
              nextState[_key] = nextStateForKey;
              hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
          }
          hasChanged = hasChanged || reducerKeys.length !== Object.keys(state).length;
          return hasChanged ? nextState : state;
      };
  }
  function createSyncStore(reducers) {
      let allReducers = reducers;
      const store = createStore(combineReducers(allReducers));
      function addReducers(reducers) {
          const key = Object.keys(reducers).find(key => allReducers[key]);
          if (key) {
              return console.error(`存在与 ${key} 同名的store。`);
          }
          allReducers = {
              ...allReducers,
              ...reducers
          };
          store.replaceReducer(combineReducers(allReducers));
      }
      return {
          store,
          addReducers
      };
  }

  function createRemoteApp(option) {
      const app = createApp(option);
      function register(apps) {
          if (!Array.isArray(apps)) {
              apps = [apps];
          }
          app.register(apps.map((app) => {
              return {
                  name: app.name,
                  active: app.active,
                  loader: async () => {
                      const { lifecycle, bodyHTML, cssResult } = await importHtml(app);
                      let host;
                      return {
                          bootstrap: async (addReducers) => {
                              // 加载样式
                              await Promise.all(cssResult.map((item) => {
                                  switch (item.type) {
                                      case "style":
                                          return loadStyle(item.value);
                                      case "cssURL":
                                          return loadCSSURL(item.value);
                                  }
                              }));
                              host = document.createElement("div");
                              host.id = "micro-" + app.name;
                              host.innerHTML = bodyHTML;
                              document.body.appendChild(host);
                              await lifecycle.bootstrap(addReducers);
                          },
                          mount: async (store) => {
                              host.innerHTML = bodyHTML;
                              await lifecycle.mount(host, store);
                          },
                          unmount: async (store) => {
                              await lifecycle.unmount(host, store);
                              host.innerHTML = "";
                          }
                      };
                  },
                  meta: app.meta
              };
          }));
      }
      return {
          ...app,
          register: register
      };
  }

  exports.combineReducers = combineReducers;
  exports.createApp = createApp;
  exports.createRemoteApp = createRemoteApp;
  exports.createRouter = createRouter;
  exports.createStore = createStore;
  exports.createSyncStore = createSyncStore;
  exports.importHtml = importHtml;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
