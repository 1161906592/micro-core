import { updateApps } from "./app";

export class MicroRouter {
  base: string;

  constructor(base?: string) {
    this.base = normalizeBase(base);
    window.addEventListener("popstate", function () {
      updateApps();
    });
  }

  push(url: string) {
    if (this.getCurrentLocation() === url) {
      return;
    }
    history.pushState(null, "", url);
    updateApps();
  }

  replace(url: string) {
    history.replaceState(null, "", url);
    updateApps();
  }

  go(delta: number) {
    history.go(delta);
  }

  getCurrentLocation(): string {
    return getLocation(this.base);
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
