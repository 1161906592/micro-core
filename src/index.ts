import { RemoteAppConfig } from "./interface";
import { registerApps } from "./app";
import { importHtml } from "./html-loader";

export function register(apps: RemoteAppConfig): void;
export function register(apps: RemoteAppConfig[]): void;
export function register(apps: RemoteAppConfig | RemoteAppConfig[]) {
  if (!Array.isArray(apps)) {
    apps = [apps];
  }
  registerApps(apps.map((app) => {
    return {
      name: app.name,
      active: app.active,
      loader: async () => {
        const { lifecycle, styleNodes } = await importHtml(app);
        let host: HTMLDivElement;
        return {
          bootstrap: async () => {
            host = document.createElement("div");
            host.id = "micro-" + app.name;
            document.body.appendChild(host);
            styleNodes.forEach((styleNode) => {
              document.head.appendChild(styleNode);
            });
          },
          mount: async () => {
            lifecycle.mount(host);
          },
          unmount: lifecycle.unmount
        };
      }
    };
  }));
}

export { registerApps, updateApps } from "./app";
export { Router } from "./router";
export { importHtml } from "./html-loader";
