import { updateApps } from "./app";

export class Router {
  base: string;
  private current: string;
  private beforeHooks: Function[];
  private listeners: Function[];

  constructor(base?: string) {
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

  push(url: string) {
    this.transitionTo(url, () => {
      pushState(cleanPath(this.base + url));
    });
  }

  replace(url: string) {
    this.transitionTo(url, () => {
      pushState(cleanPath(this.base + url), true);
    });
  }

  go(delta: number) {
    history.go(delta);
  }

  back() {
    this.go(-1);
  }

  beforeEach(fn: Function): Router {
    this.beforeHooks.push(fn);
    return this;
  }

  destroy() {
    this.listeners.forEach(cleanupListener => {
      cleanupListener();
    });
    this.listeners = [];
  }

  private ensureURL(push?: boolean) {
    if (getLocation(this.base) !== this.current) {
      const current = cleanPath(this.base + this.current);
      push ? pushState(current) : pushState(current, true);
    }
  }

  private transitionTo(url: string, cb?: Function) {
    if (this.current === url) {
      return;
    }
    runQueue(this.beforeHooks, (hook: Function, next: Function) => {
      hook(url, this.current, (to?: boolean | string | { path: string; replace: boolean }) => {
        if (to === false) {
          this.ensureURL(true);
        } else if (typeof to === "string" || typeof to === "object") {
          if (typeof to === "object") {
            if (to.replace) {
              this.replace(to.path);
            } else {
              this.push(to.path);
            }
          } else {
            this.push(to);
          }
        } else {
          next();
        }
      });
    }, () => {
      cb && cb();
      this.commit(url);
    });
  }

  private commit(url: string) {
    this.current = url;
    updateApps();
  }
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

function runQueue(queue: Function[], fn: Function, cb: Function) {
  next(0);

  function next(index: number) {
    if (index >= queue.length) {
      cb();
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
