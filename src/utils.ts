export function request(url: string): Promise<string> {
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

export function runQueue(queue: Function[], fn: Function, cb?: Function) {
  next(0);

  function next(index: number) {
    if (index >= queue.length) {
      cb && cb();
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          next(index + 1);
        });
      } else {
        next(index + 1);
      }
    }
  }
}

const EXTERNAL_RE = /^(https?:)?\/\//;

export function isExternalUrl(url: string) {
  return EXTERNAL_RE.test(url);
}

const DOMAIN_RE = /(?:https?:)?\/\/[^/]+/;

export function getDomain(url: string) {
  return DOMAIN_RE.exec(url)?.[0] ?? "";
}

export async function asyncReplace(input: string, re: RegExp, replacer: (match: RegExpExecArray) => string | Promise<string>) {
  let match: RegExpExecArray | null;
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
