import { CreatedApp, RemoteAppConfig } from "./interface";
import { createApp } from "./app";
import { importHtml, prefetchApps } from "./html-loader";

export function createRemoteApp(): CreatedApp<RemoteAppConfig> {
  const app = createApp();

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
            bootstrap: async () => {
              host = document.createElement("div");
              host.id = "micro-" + app.name;
              host.innerHTML = bodyHTML;
              document.body.appendChild(host);
              await lifecycle.bootstrap();
            },
            mount: async () => {
              host.innerHTML = bodyHTML;
              await lifecycle.mount(host);
            },
            unmount: async () => {
              await lifecycle.unmount(host);
              host.innerHTML = "";
            }
          };
        },
        meta: app.meta
      };
    }));
    prefetchApps(apps);
  }

  return {
    ...app,
    register: register
  };
}


export { createApp } from "./app";
export { importHtml } from "./html-loader";
export { createRouter } from "./router";
export { createStore, combineReducers, createAsyncStore } from "./store";
export { createVueAppLifecycle } from "./adapters";
