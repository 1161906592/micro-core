import {
  AddReducers,
  CreatedApp,
  RemoteAppConfig,
  Router,
  Store
} from "./interface";
import { createApp } from "./app";
import { importHtml } from "./html-loader";

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
          const { lifecycle, bodyHTML } = await importHtml(app);
          let host: HTMLDivElement;
          return {
            bootstrap: async (addReducers?: AddReducers) => {
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
