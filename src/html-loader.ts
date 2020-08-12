import { RemoteAppConfig, RemoteAppLifecycle, ProxyType } from "./interface";
import { runQueue } from "./utils";

const URL_REGEX = "(?:(?:https?):\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]";

const CSS_URL_STYLE_RE = new RegExp(`<link[^>]+href=["']?(${URL_REGEX}*)["']?[^/>]*/?>|<style\\s*>([^<]*)</style\\s*>`, "g");

const SCRIPT_URL_REGEX = `<script[^>]+src=["']?(${URL_REGEX}*)["']?[^>]*></script\\s*>`;

const SCRIPT_URL_RE = new RegExp(SCRIPT_URL_REGEX, "g");

const SCRIPT_URL_CONTENT_RE = new RegExp(`${SCRIPT_URL_REGEX}|<script\\s*>([\\w\\W]+?)</script\\s*>`, "g");

const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;

const REPLACED_BY_BERIAL = "Script replaced by MicroCore.";

export async function importHtml(app: RemoteAppConfig): Promise<{
  lifecycle: RemoteAppLifecycle;
  bodyHTML: string
}> {
  const template = await request(app.entry);
  const [lifecycle] = await Promise.all([(loadScript(template, window, app.name) as Promise<RemoteAppLifecycle>), loadCSS(template)]);
  const bodyHTML = loadBody(template);
  return { lifecycle, bodyHTML };
}

export async function loadScript(template: string, global: ProxyType, name: string) {
  return new Promise(resolve => {
    const result = parseScript(template);
    runQueue(result.map((item) => {
      switch (item.type) {
        case "script":
          return runScript.bind(void 0, item.value, global);
        case "scriptURL":
          return loadScriptURL.bind(void 0, item.value);
      }
    }), async (loader: Function, next: Function) => {
      await loader();
      next();
    }, () => {
      resolve(global[name]);
    });
  });
}

function parseScript(template: string) {
  const result: { type: "scriptURL" | "script", value: string }[] = [];
  SCRIPT_URL_CONTENT_RE.lastIndex = 0;
  let match;

  while ((match = SCRIPT_URL_CONTENT_RE.exec(template))) {
    let [, scriptURL, script] = match;
    scriptURL = (scriptURL || "").trim();
    script = (script || "").trim();
    scriptURL && result.push({
      type: "scriptURL",
      value: scriptURL
    });
    script && result.push({
      type: "script",
      value: script
    });
  }
  return result;
}

function runScript(script: string, global: ProxyType): RemoteAppLifecycle {
  const resolver = new Function(
  "window",
  `
    try {
      ${script}
    }
    catch(e) {
      console.log(e)
    }
  `
  );
  return resolver.call(global, global);
}

const loadedScript: ProxyType = {};

async function loadScriptURL(scriptURL: string) {
  return new Promise((resolve, reject) => {
    if (loadedScript[scriptURL]) {
      return resolve();
    }
    const scriptNode = document.createElement("script");
    scriptNode.onload = () => {
      loadedScript[scriptURL] = 1;
      resolve();
    };
    scriptNode.onerror = reject;
    scriptNode.src = scriptURL;
    document.head.appendChild(scriptNode);
  }).catch((e) => {
    console.error(`script: ${scriptURL} 加载失败`, e);
  });
}

async function loadCSS(template: string) {
  const cssResult = parseCSS(template);
  // 加载样式
  await Promise.all(cssResult.map((item) => {
    switch (item.type) {
      case "style":
        return loadStyle(item.value);
      case "cssURL":
        return loadCSSURL(item.value);
    }
  }));
}

// 按顺序解析行内css和外链css
function parseCSS(template: string) {
  const result: { type: "cssURL" | "style", value: string }[] = [];
  CSS_URL_STYLE_RE.lastIndex = 0;
  let match;

  while ((match = CSS_URL_STYLE_RE.exec(template))) {
    let [, cssURL, style] = match;
    cssURL = (cssURL || "").trim();
    style = (style || "").trim();
    // todo 替换相对路径
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

const loadedCSSURL: ProxyType = {};

async function loadCSSURL(cssURL: string) {
  return new Promise((resolve, reject) => {
    if (loadedCSSURL[cssURL]) {
      return resolve();
    }
    const linkNode = document.createElement("link");
    linkNode.rel = "stylesheet";
    linkNode.onload = () => {
      loadedCSSURL[cssURL] = 1;
      resolve();
    };
    linkNode.onerror = reject;
    linkNode.href = cssURL;
    document.head.appendChild(linkNode);
  }).catch((e) => {
    console.error(`css: ${cssURL} 加载失败`, e);
  });
}

function loadStyle(style: string) {
  const styleNode = document.createElement("style");
  styleNode.appendChild(document.createTextNode(style));
  document.head.appendChild(styleNode);
}

function loadBody(template: string): string {
  let bodyHTML = template.match(BODY_CONTENT_RE)?.[1] ?? "";
  bodyHTML = bodyHTML.replace(SCRIPT_ANY_RE, scriptReplacer);

  return bodyHTML;

  function scriptReplacer(substring: string): string {
    const matchedURL = SCRIPT_URL_RE.exec(substring);
    if (matchedURL) {
      return `<!-- ${REPLACED_BY_BERIAL} Original script url: ${matchedURL[1]} -->`;
    }
    return `<!-- ${REPLACED_BY_BERIAL} Original script: inline script -->`;
  }
}

function request(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
          resolve(xhr.responseText);
        } else {
          reject(xhr);
        }
      }
    };
    xhr.open("get", url);
    xhr.send();
  });
}
