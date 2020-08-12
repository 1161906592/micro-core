import { Router } from "./interface";

export function createRouter(base?: string): Router {
  let basePath = normalizeBase(base);
  let current = "/";
  let beforeHooks: Function[] = [];
  let afterHooks: Function[] = [];
  let listeners: Function[] = [];

  window.addEventListener("popstate", handleRoutingEvent);
  listeners.push(() => {
    window.removeEventListener("popstate", handleRoutingEvent);
  });

  function handleRoutingEvent() {
    transitionTo(getLocation(basePath));
  }

  function push(url: string) {
    transitionTo(url, () => {
      pushState(cleanPath(basePath + url));
    });
  }

  function replace(url: string) {
    transitionTo(url, () => {
      pushState(cleanPath(basePath + url), true);
    });
  }

  function go(delta: number) {
    history.go(delta);
  }

  function back() {
    go(-1);
  }

  function beforeEach(fn: Function) {
    beforeHooks.push(fn);
  }

  function afterEach(fn: Function) {
    afterHooks.push(fn);
  }

  function destroy() {
    listeners.forEach(cleanupListener => {
      cleanupListener();
    });
    listeners = [];
  }

  function ensureURL(push?: boolean) {
    if (getLocation(basePath) !== current) {
      const cur = cleanPath(base + current);
      push ? pushState(cur) : pushState(cur, true);
    }
  }

  function transitionTo(url: string, cb?: Function) {
    if (current === url) {
      return;
    }
    runQueue(beforeHooks, (hook: Function, next: Function) => {
      hook(url, current, (to?: boolean | string | { path: string; replace: boolean }) => {
        if (to === false) {
          ensureURL(true);
        } else if (typeof to === "string" || typeof to === "object") {
          if (typeof to === "object") {
            if (to.replace) {
              replace(to.path);
            } else {
              push(to.path);
            }
          } else {
            push(to);
          }
        } else {
          next();
        }
      });
    }, () => {
      current = url;
      cb && cb();
      runQueue(afterHooks, (hook: Function, next: Function) => {
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
    beforeEach(fn: Function) {
      beforeEach(fn);
      return this;
    },
    afterEach(fn: Function) {
      afterEach(fn);
      return this;
    },
    destroy: destroy
  };
}

function pushState(url: string, replace?: boolean) {
  const history = window.history;
  try {
    if (replace) {
      history.replaceState("", "", url);
    } else {
      history.pushState("", "", url);
    }
  } catch (e) {
    window.location[replace ? "replace" : "assign"](url);
  }
}

function normalizeBase(base?: string): string {
  if (!base) {
    base = "/";
  }
  if (base.charAt(0) !== "/") {
    base = "/" + base;
  }
  return base.replace(/\/$/, "");
}

function getLocation(base: string): string {
  let path = decodeURI(window.location.pathname);
  if (base && path.indexOf(base) === 0) {
    path = path.slice(base.length);
  }
  return (path || "/") + window.location.search + window.location.hash;
}

// /a//b/c -> /a/b/c
function cleanPath(path: string): string {
  return path.replace(/\/\//g, "/");
}

function runQueue(queue: Function[], fn: Function, cb?: Function) {
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
