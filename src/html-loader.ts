import { RemoteAppConfig, RemoteAppLifecycle, ProxyType } from "./interface";

const URL_REGEX = "(?:(https?):\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]";
const MATCH_ANY_OR_NO_PROPERTY = /["'=\w\s\/]*/;
const SCRIPT_URL_RE = new RegExp(
"<\\s*script" +
MATCH_ANY_OR_NO_PROPERTY.source +
"(?:src=\"(.+?)\")" +
MATCH_ANY_OR_NO_PROPERTY.source +
"(?:\\/>|>[\\s]*<\\s*\\/script>)?",
"g"
);
const SCRIPT_CONTENT_RE = new RegExp(
"<\\s*script" +
MATCH_ANY_OR_NO_PROPERTY.source +
">([\\w\\W]+?)<\\s*\\/script>",
"g"
);

const CSS_URL_STYLE_RE = new RegExp(
`<\\s*link[^>]*href=["']?(${URL_REGEX}*)["']?[^/>]*/?>|<\\s*style\\s*>([^<]*)<\\s*/style>`,
"g"
);

const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/;
const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g;
const TEST_URL = /^(?:https?):\/\/[-a-zA-Z0-9.]+/;

const REPLACED_BY_BERIAL = "Script replaced by MicroCore.";

export async function importHtml(app: RemoteAppConfig): Promise<{
  lifecycle: RemoteAppLifecycle;
  cssResult: { type: "cssURL" | "style"; value: string }[];
  bodyHTML: string
}> {
  const template = await request(app.entry);
  const cssResult = await parseCSS(template);
  const bodyHTML = loadBody(template);
  const lifecycle = await loadScript(template, window, app.name);
  return { lifecycle, cssResult, bodyHTML };
}

export async function loadScript(template: string, global: ProxyType, name: string): Promise<RemoteAppLifecycle> {
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

function parseScript(template: string): { scriptURLs: string[]; scripts: string[]; } {
  const scriptURLs: string[] = [];
  const scripts: string[] = [];
  SCRIPT_URL_RE.lastIndex = SCRIPT_CONTENT_RE.lastIndex = 0;
  let match;
  while ((match = SCRIPT_URL_RE.exec(template))) {
    let captured = match[1].trim();
    if (!captured) continue;
    if (!TEST_URL.test(captured)) {
      captured = window.location.origin + captured;
    }
    scriptURLs.push(captured);
  }
  while ((match = SCRIPT_CONTENT_RE.exec(template))) {
    const captured = match[1].trim();
    if (!captured) continue;
    scripts.push(captured);
  }
  return {
    scriptURLs,
    scripts
  };
}

function runScript(script: string, global: ProxyType, umdName: string): RemoteAppLifecycle {
  const resolver = new Function(
  "window",
  `
    try {
      ${script}
      return window['${umdName}']
    }
    catch(e) {
      console.log(e)
    }
  `
  );
  return resolver.call(global, global);
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

export async function loadCSSURL(cssURL: string) {
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

export function loadStyle(style: string) {
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
