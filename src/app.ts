import { AppConfig, AppLifecycle } from "./interface";

enum AppStatus {
  NOT_LOAD,
  NOT_MOUNTED,
  MOUNTED
}

interface App extends AppConfig, AppLifecycle {
  status: AppStatus;
}

const registeredApps: App[] = [];

export function registerApps(apps: AppConfig): void;
export function registerApps(apps: AppConfig[]): void;
export function registerApps(apps: AppConfig | AppConfig[]) {
  if (!Array.isArray(apps)) {
    apps = [apps];
  }
  apps.forEach((app) => {
    if (__DEV__) {
      if (registeredApps.find(d => d.name === app.name)) {
        console.error(`存在与 ${app.name} 同名的应用已经被注册`);
      }
    }
    const runtimeApp = {
      ...app,
      status: AppStatus.NOT_LOAD
    };
    registeredApps.push(runtimeApp as App);
  });
}

function diffApps() {
  const appsToLoad: App[] = [];
  const appsToMount: App[] = [];
  const appsToUnmount: App[] = [];
  registeredApps.forEach((app) => {
    const isActive = shouldActive(app);
    switch (app.status) {
      case AppStatus.NOT_LOAD:
        if (isActive) {
          appsToLoad.push(app);
          appsToMount.push(app);
        }
        break;
      case AppStatus.NOT_MOUNTED:
        if (isActive) {
          appsToMount.push(app);
        }
        break;
      case AppStatus.MOUNTED:
        if (!isActive) {
          appsToUnmount.push(app);
        }
        break;
    }
  });
  return { appsToLoad, appsToMount, appsToUnmount };
}

function shouldActive(app: App) {
  try {
    return app.active();
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function loadApp(app: App) {
  try {
    const { bootstrap, mount, unmount } = await app.loader();
    app.bootstrap = bootstrap;
    app.mount = mount;
    app.unmount = unmount;
    await bootstrap();
  } catch (e) {
    console.error(e);
  }
}

async function mountApp(app: App) {
  try {
    await app.mount();
    app.status = AppStatus.MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

async function unmountApp(app: App) {
  try {
    await app.unmount();
    app.status = AppStatus.NOT_MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

export async function updateApps() {
  const { appsToLoad, appsToMount, appsToUnmount } = diffApps();
  await appsToUnmount.map((app) => unmountApp(app));
  await Promise.all(appsToLoad.map((app) => loadApp(app)));
  await Promise.all(appsToMount.map((app) => mountApp(app)));
}
