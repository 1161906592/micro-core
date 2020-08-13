import { RemoteAppConfig, RemoteAppLifecycle, ProxyType } from "./interface";
import {
  asyncReplace,
  getDomain,
  isExternalUrl,
  request,
  runQueue
} from "./utils";

// const URL_REGEX = "(?:(?:https?):\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]";

// 目前只识别 .css结尾的css外链
const CSS_URL_STYLE_RE = new RegExp(`<link[^>]+href=["']?([^"']*.css)["']?[^/>]*/?>|<style\\s*>([^<]*)</style\\s*>`, "g");

// 目前只识别 .js结尾的js外链
const SCRIPT_URL_REGEX = `<script[^>]+src=["']?([^"']*.js)["']?[^>]*></script\\s*>`;

const SCRIPT_URL_RE = new RegExp(SCRIPT_URL_REGEX, "g");

const SCRIPT_URL_CONTENT_RE = new RegExp(`${SCRIPT_URL_REGEX}|<script\\s*>([\\w\\W]+?)</script\\s*>`, "g");

const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;

const REPLACED_BY_BERIAL = "Script replaced by MicroCore.";

export async function importHtml(app: RemoteAppConfig): Promise<{
  lifecycle: RemoteAppLifecycle;
  bodyHTML: string
}> {
  const domain = getDomain(app.entry);
  const template = await request(app.entry);
  // 暂时采用css与js并行加载的模式
  const [lifecycle] = await Promise.all([loadScript(template, window, app.name, domain, app.entry), loadCSS(template, domain, app.entry)]);
  const bodyHTML = loadBody(template);
  return { lifecycle, bodyHTML };
}

export function loadScript(template: string, global: ProxyType, name: string, domain: string, entry: string): Promise<RemoteAppLifecycle> {
  return new Promise(resolve => {
    const result = parseScript(template, domain, entry);
    runQueue(result.map((item) => {
      switch (item.type) {
        case "url":
          return loadScriptURL.bind(void 0, item.value);
        case "code":
          return runScript.bind(void 0, item.value, global);
      }
    }), async (loader: Function, next: Function) => {
      await loader();
      next();
    }, () => {
      resolve(global[name]);
    });
  });
}

function parseScript(template: string, domain: string, entry: string) {
  const result: { type: "url" | "code", value: string }[] = [];
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

const scriptURLMap = new Map<string, 1>();
scriptURLMap.forEach((item) => {
  console.log(item);
})

async function loadScriptURL(scriptURL: string) {
  return new Promise((resolve, reject) => {
    if (scriptURLMap.get(scriptURL)) {
      return resolve();
    }
    const scriptNode = document.createElement("script");
    scriptNode.onload = () => {
      scriptURLMap.set(scriptURL, 1);
      resolve();
    };
    scriptNode.onerror = reject;
    scriptNode.src = scriptURL;
    document.head.appendChild(scriptNode);
  }).catch((e) => {
    console.error(`script: ${scriptURL} 加载失败`, e);
  });
}

async function loadCSS(template: string, domain: string, entry: string) {
  const cssResult = await parseCSS(template, domain, entry);
  // css按顺序并行加载
  await Promise.all(cssResult.map((item) => {
    switch (item.type) {
      case "url":
        return loadCSSURL(item.value);
      case "code":
        return loadCSSCode(item.value);
    }
  }));
}

// 按顺序解析行内css和外链css
async function parseCSS(template: string, domain: string, entry: string) {
  const result: { type: "url" | "code", value: string }[] = [];
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

function rewriteURL(url: string, domain: string, relative: string) {
  if (url.startsWith("/")) {
    return domain + url;
  }
  return relative.replace(/[^/]*$/, url);
}

export const CSS_URL_RE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/;

function rewriteCSSURLs(css: string, domain: string, relative: string) {
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

const cssURLMap = new Map<string, 1>();

async function loadCSSURL(cssURL: string) {
  return new Promise((resolve, reject) => {
    if (cssURLMap.get(cssURL)) {
      return resolve();
    }
    const linkNode = document.createElement("link");
    linkNode.rel = "stylesheet";
    linkNode.onload = () => {
      cssURLMap.set(cssURL, 1);
      resolve();
    };
    linkNode.onerror = reject;
    linkNode.href = cssURL;
    document.head.appendChild(linkNode);
  }).catch((e) => {
    console.error(`css: ${cssURL} 加载失败`, e);
  });
}

function loadCSSCode(style: string) {
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
