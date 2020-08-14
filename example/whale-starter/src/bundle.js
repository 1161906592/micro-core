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
function createApp() {
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
            return unmountApp(app);
        }));
        appsToLoad.forEach(async (app) => {
            await loadApp(app);
            await bootStrapApp(app);
            await mountApp(app);
        });
        appsToMount.forEach(async (app) => {
            await mountApp(app);
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
async function bootStrapApp(app) {
    if (app.status !== AppStatus.NOT_BOOTSTRAPPED) {
        return;
    }
    try {
        app.status = AppStatus.BOOTSTRAPPING;
        await app.bootstrap();
        app.status = AppStatus.NOT_MOUNTED;
    }
    catch (e) {
        console.error(`${app.name} 初始化失败。`, e);
    }
}
async function mountApp(app) {
    if (app.status !== AppStatus.NOT_MOUNTED || !app.active()) {
        return;
    }
    try {
        app.status = AppStatus.MOUNTING;
        await app.mount();
        app.status = AppStatus.MOUNTED;
        if (!app.active()) {
            await unmountApp(app);
        }
    }
    catch (e) {
        console.error(`${app.name} 挂载失败。`, e);
    }
}
async function unmountApp(app) {
    if (app.status !== AppStatus.MOUNTED || app.active()) {
        return;
    }
    try {
        app.status = AppStatus.UN_MOUNTING;
        await app.unmount();
        app.status = AppStatus.NOT_MOUNTED;
    }
    catch (e) {
        console.error(`${app.name} 卸载失败。`, e);
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
const EXTERNAL_RE = /^(https?:)?\/\//;
function isExternalUrl(url) {
    return EXTERNAL_RE.test(url);
}
const DOMAIN_RE = /(?:https?:)?\/\/[^/]+/;
function getDomain(url) {
    return DOMAIN_RE.exec(url)?.[0] ?? "";
}
async function asyncReplace(input, re, replacer) {
    let match;
    let remaining = input;
    let rewritten = "";
    while ((match = re.exec(remaining))) {
        rewritten += remaining.slice(0, match.index);
        rewritten += await replacer(match);
        remaining = remaining.slice(match.index + match[0].length);
    }
    rewritten += remaining;
    return rewritten;
}

// 目前只识别 .css结尾的css外链
const CSS_URL_STYLE_RE = new RegExp(`<link[^>]+href=["']?([^"']*.css)["']?[^/>]*/?>|<style\\s*>([^<]*)</style\\s*>`, "g");
// 目前只识别 .js结尾的js外链
const SCRIPT_URL_REGEX = `<script[^>]+src=["']?([^"']*.js)["']?[^>]*></script\\s*>`;
const SCRIPT_URL_RE = new RegExp(SCRIPT_URL_REGEX, "g");
const SCRIPT_URL_CONTENT_RE = new RegExp(`${SCRIPT_URL_REGEX}|<script\\s*>([\\w\\W]+?)</script\\s*>`, "g");
const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;
const REPLACED_BY_BERIAL = "Script replaced by MicroCore.";
async function importHtml(app) {
    const { template, parsedCSSs, parsedScripts } = await parseEntry(app.entry);
    // 目前采用css与js并行加载的模式
    const [lifecycle] = await Promise.all([loadScript(parsedScripts, window, app.name), loadCSS(parsedCSSs)]);
    const bodyHTML = loadBody(template);
    return { lifecycle, bodyHTML };
}
async function prefetchApps(apps) {
    const requestIdleCallback = window.requestIdleCallback;
    requestIdleCallback && requestIdleCallback(() => {
        apps.forEach(async (app) => {
            const { parsedCSSs, parsedScripts } = await parseEntry(app.entry);
            [...parsedCSSs, ...parsedScripts].forEach((item) => {
                if (item.type === "url") {
                    prefetchURL(item.value);
                }
            });
        });
    });
}
function prefetchURL(url) {
    if (urlLoadedMap[url]) {
        return;
    }
    const linkNode = document.createElement("link");
    linkNode.href = url;
    linkNode.rel = "prefetch";
    document.head.append(linkNode);
}
const entryMap = {};
async function parseEntry(entry) {
    const loader = entryMap[entry];
    return await (loader ? loader : entryMap[entry] = entryLoader());
    async function entryLoader() {
        const domain = getDomain(entry);
        const template = await request(entry);
        const parsedCSSs = await parseCSS(template, domain, entry);
        const parsedScripts = await parseScript(template, domain, entry);
        return { template, parsedCSSs, parsedScripts };
    }
}
async function parseScript(template, domain, entry) {
    const result = [];
    SCRIPT_URL_CONTENT_RE.lastIndex = 0;
    let match;
    while ((match = SCRIPT_URL_CONTENT_RE.exec(template))) {
        let [, scriptURL, script] = match;
        scriptURL = scriptURL?.trim();
        script = script?.trim();
        scriptURL && result.push({
            type: "url",
            value: isExternalUrl(scriptURL) ? scriptURL : rewriteURL(scriptURL, domain, entry)
        });
        script && result.push({
            type: "code",
            value: script
        });
    }
    return result;
}
function loadScript(parsedScripts, global, name) {
    return new Promise(async (resolve) => {
        runQueue(parsedScripts.map((item) => {
            switch (item.type) {
                case "url":
                    return loadScriptURL.bind(void 0, item.value);
                case "code":
                    return runScript.bind(void 0, item.value, global);
            }
        }), async (loader, next) => {
            await loader();
            next();
        }, () => {
            resolve(global[name]);
        });
    });
}
function runScript(script, global) {
    const resolver = new Function("window", `
    try {
      ${script}
    }
    catch(e) {
      console.log(e)
    }
  `);
    return resolver.call(global, global);
}
// 目前认定同一个链接不会同时是script和css
const urlLoadedMap = {};
async function loadScriptURL(scriptURL) {
    return new Promise((resolve, reject) => {
        if (urlLoadedMap[scriptURL]) {
            return resolve();
        }
        urlLoadedMap[scriptURL] = 1;
        const scriptNode = document.createElement("script");
        scriptNode.onload = resolve;
        scriptNode.onerror = reject;
        scriptNode.src = scriptURL;
        document.head.appendChild(scriptNode);
    }).catch((e) => {
        console.error(`script: ${scriptURL} 加载失败`, e);
    });
}
// 按顺序解析行内css和外链css
async function parseCSS(template, domain, entry) {
    const result = [];
    CSS_URL_STYLE_RE.lastIndex = 0;
    let match;
    while ((match = CSS_URL_STYLE_RE.exec(template))) {
        let [, cssURL, style] = match;
        cssURL = cssURL?.trim();
        style = style?.trim();
        cssURL && result.push({
            type: "url",
            value: isExternalUrl(cssURL) ? cssURL : rewriteURL(cssURL, domain, entry)
        });
        style && result.push({
            type: "code",
            value: await rewriteCSSURLs(style, domain, entry)
        });
    }
    return result;
}
async function loadCSS(parsedCSSs) {
    // css按顺序并行加载
    await Promise.all(parsedCSSs.map((item) => {
        switch (item.type) {
            case "url":
                return loadCSSURL(item.value);
            case "code":
                return loadCSSCode(item.value);
        }
    }));
}
function rewriteURL(url, domain, relative) {
    if (url.startsWith("/")) {
        return domain + url;
    }
    return relative.replace(/[^/]*$/, url);
}
const CSS_URL_RE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/;
function rewriteCSSURLs(css, domain, relative) {
    return asyncReplace(css, CSS_URL_RE, async (match) => {
        let [matched, rawUrl] = match;
        let wrap = "";
        const first = rawUrl[0];
        if (first === `"` || first === `'`) {
            wrap = first;
            rawUrl = rawUrl.slice(1, -1);
        }
        if (isExternalUrl(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("#")) {
            return matched;
        }
        return `url(${wrap}${rewriteURL(rawUrl, domain, relative)}${wrap})`;
    });
}
async function loadCSSURL(cssURL) {
    return new Promise((resolve, reject) => {
        if (urlLoadedMap[cssURL]) {
            return resolve();
        }
        urlLoadedMap[cssURL] = 1;
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
function loadCSSCode(style) {
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
function createAsyncStore(reducers) {
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

function createVueAppLifecycle({ Vue, appOptions, store }) {
    let instance;
    let router;
    async function bootstrap() {
        if (store) {
            store.asyncStore.addReducers(store.reducer);
        }
    }
    async function mount(host) {
        const div = document.createElement("div");
        host.appendChild(div);
        const options = appOptions();
        router = options.router;
        instance = new Vue(options).$mount(div);
    }
    async function unmount() {
        instance.$destroy();
        const teardownListeners = router.teardownListeners;
        teardownListeners && teardownListeners();
    }
    return {
        bootstrap,
        mount,
        unmount
    };
}

function createRemoteApp() {
    const app = createApp();
    function register(apps) {
        if (!Array.isArray(apps)) {
            apps = [apps];
        }
        app.register(apps.map((app) => {
            return {
                name: app.name,
                active: app.active,
                loader: async () => {
                    const { lifecycle, bodyHTML } = await importHtml(app);
                    let host;
                    return {
                        bootstrap: async () => {
                            host = document.createElement("div");
                            host.id = "micro-" + app.name;
                            host.innerHTML = bodyHTML;
                            document.body.appendChild(host);
                            await lifecycle.bootstrap();
                        },
                        mount: async () => {
                            host.innerHTML = bodyHTML;
                            await lifecycle.mount(host);
                        },
                        unmount: async () => {
                            await lifecycle.unmount(host);
                            host.innerHTML = "";
                        }
                    };
                },
                meta: app.meta
            };
        }));
        prefetchApps(apps);
    }
    return {
        ...app,
        register: register
    };
}

export { combineReducers, createApp, createAsyncStore, createRemoteApp, createRouter, createStore, createVueAppLifecycle, importHtml, request };
