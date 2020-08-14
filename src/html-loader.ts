import { RemoteAppConfig, RemoteAppLifecycle, ProxyType } from "./interface";
import {
  asyncReplace,
  getDomain,
  isExternalUrl,
  request,
  runQueue
} from "./utils";

// 只对rel为prefetch进行处理
const PREFETCH_RE = /<link[^>]+rel=["']?prefetch["']?[^/>]*\/?>/;

const PREFETCH_URL_RE = /href=["']?([^"']*)["']?/;

// 目前只识别 .css结尾的css外链
const CSS_URL_STYLE_RE = /<link[^>]+href=["']?([^"']*.css)["']?[^/>]*\/?>|<style\s*>([^<]*)<\/style\s*>/;

// 目前只识别 .js结尾的js外链
const SCRIPT_URL_CONTENT_RE = /<script[^>]+src=["']?([^"']*.js)["']?[^>]*><\/scripts*>|<script\s*>([\w\W]+?)<\/script\s*>/;

const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;

export async function importHtml(app: RemoteAppConfig): Promise<{
  lifecycle: RemoteAppLifecycle;
  bodyHTML: string
}> {
  const { template, parsedCSSs, parsedScripts } = await parseEntry(app.entry);
  // 目前采用css与js并行加载的模式
  const [lifecycle] = await Promise.all([loadScript(parsedScripts, window, app.name), loadCSS(parsedCSSs)]);
  const bodyHTML = loadBody(template);
  return { lifecycle, bodyHTML };
}

export async function prefetchApps(apps: RemoteAppConfig[]) {
  const requestIdleCallback = (window as any).requestIdleCallback;
  requestIdleCallback && requestIdleCallback(() => {
    apps.forEach(async (app) => {
      const { parsedCSSs, parsedScripts, parsedPrefetchUrl } = await parseEntry(app.entry);
      [...parsedCSSs, ...parsedScripts].forEach((item) => {
        if (item.type === "url") {
          prefetchURL(item.value);
        }
      });
      parsedPrefetchUrl.forEach((url) => {
        prefetchURL(url);
      });
    });
  });
}

function prefetchURL(url: string) {
  if (urlLoadedMap[url]) {
    return;
  }
  const linkNode = document.createElement("link");
  linkNode.href = url;
  linkNode.rel = "prefetch";
  document.head.append(linkNode);
}

interface PrefetchAppResult {
  template: string;
  parsedCSSs: ParsedResult;
  parsedScripts: ParsedResult;
  parsedPrefetchUrl: string[];
}

const entryMap: { [key: string]: Promise<PrefetchAppResult> } = {};

async function parseEntry(entry: string): Promise<PrefetchAppResult> {
  const loader = entryMap[entry];

  return await (loader ? loader : entryMap[entry] = entryLoader());

  async function entryLoader() {
    const domain = getDomain(entry);
    const tpl = await request(entry);
    const { tpl: parsedPrefetchTpl, result: parsedPrefetchUrl } = await parsePrefetch(tpl, domain, entry);
    const { tpl: parsedCSSTpl, result: parsedCSSs } = await parseCSS(parsedPrefetchTpl, domain, entry);
    const { tpl: parsedScriptTpl, result: parsedScripts } = await parseScript(parsedCSSTpl, domain, entry);
    return {
      template: parsedScriptTpl,
      parsedCSSs,
      parsedScripts,
      parsedPrefetchUrl
    };
  }
}

async function parsePrefetch(template: string, domain: string, entry: string) {
  const result: string[] = [];
  const replacedTpl = await asyncReplace(template, PREFETCH_RE, async (match) => {
    const [link] = match;
    let [, rawUrl] = PREFETCH_URL_RE.exec(link) || [];
    rawUrl = rawUrl?.trim();
    rawUrl && result.push(isExternalUrl(rawUrl) ? rawUrl : rewriteURL(rawUrl, domain, entry));
    return "";
  });
  return {
    tpl: replacedTpl,
    result
  };
}

type ParsedResult = { type: "url" | "code", value: string }[];

async function parseScript(template: string, domain: string, entry: string) {
  const result: ParsedResult = [];
  const replacedTpl = await asyncReplace(template, SCRIPT_URL_CONTENT_RE, async (match) => {
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
    return "";
  });
  return {
    tpl: replacedTpl,
    result
  };
}

function loadScript(parsedScripts: ParsedResult, global: ProxyType, name: string): Promise<RemoteAppLifecycle> {
  return new Promise(async resolve => {
    runQueue(parsedScripts.map((item) => {
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

// 目前认定同一个链接不会同时是script和css
const urlLoadedMap: { [key: string]: 1 } = {};

async function loadScriptURL(scriptURL: string) {
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
async function parseCSS(template: string, domain: string, entry: string) {
  const result: ParsedResult = [];
  const replacedTpl = await asyncReplace(template, CSS_URL_STYLE_RE, async (match) => {
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
    return "";
  });
  return {
    tpl: replacedTpl,
    result
  };
}

async function loadCSS(parsedCSSs: ParsedResult) {
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

function rewriteURL(url: string, domain: string, relative: string) {
  if (url.startsWith("/")) {
    return domain + url;
  }
  return relative.replace(/[^/]*$/, url);
}

const CSS_URL_RE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/;

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

async function loadCSSURL(cssURL: string) {
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

function loadCSSCode(style: string) {
  const styleNode = document.createElement("style");
  styleNode.appendChild(document.createTextNode(style));
  document.head.appendChild(styleNode);
}

function loadBody(template: string): string {
  return template.match(BODY_CONTENT_RE)?.[1] ?? "";
}
