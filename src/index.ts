import {
  AddReducers,
  CreatedApp,
  RemoteAppConfig,
  Router,
  Store
} from "./interface";
import { createApp } from "./app";
import { importHtml, loadCSSURL, loadStyle } from "./html-loader";

export function createRemoteApp(option?: { router?: Router, store?: any }): CreatedApp<RemoteAppConfig> {
  const app = createApp(option);

  function register(apps: RemoteAppConfig | RemoteAppConfig[]) {
    if (!Array.isArray(apps)) {
      apps = [apps];
    }
    app.register(apps.map((app) => {
      return {
        name: app.name,
        active: app.active,
        loader: async () => {
          const { lifecycle, bodyHTML, cssResult } = await importHtml(app);
          let host: HTMLDivElement;
          return {
            bootstrap: async (addReducers?: AddReducers) => {
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
            mount: async (store?: Store) => {
              host.innerHTML = bodyHTML;
              await lifecycle.mount(host, store);
            },
            unmount: async (store?: Store) => {
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


export { createApp } from "./app";
export { importHtml } from "./html-loader";
export { createRouter } from "./router";
export { createStore, combineReducers, createSyncStore } from "./store";
