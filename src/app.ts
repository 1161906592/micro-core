export interface AppLifecycle {
  bootstrap: () => Promise<void>[];
  mount: () => Promise<void>[];
  unmount: () => Promise<void>[];
}

export interface App {
  name: string;
  active: () => boolean;
  loader: () => Promise<AppLifecycle>
}

enum AppStatus {
  NOT_LOAD,
  NOT_MOUNTED,
  MOUNTED
}

interface RuntimeApp extends App {
  status: AppStatus;
  bootstrap?: () => Promise<void>[];
  mount?: () => Promise<void>[];
  unmount?: () => Promise<void>[];
}

const registeredApps: RuntimeApp[] = [];

export function registerApps(apps: App): void;
export function registerApps(apps: App[]): void;
export function registerApps(apps: App | App[]) {
  if (!Array.isArray(apps)) {
    apps = [apps];
  }
  apps.forEach((app) => {
    if (__DEV__) {
      if (registeredApps.find(d => d.name === app.name)) {
        console.error(`存在与 ${app.name} 同名的应用已经被注册`);
      }
    }
    const runtimeApp: RuntimeApp = {
      ...app,
      status: AppStatus.NOT_LOAD
    };
    registeredApps.push(runtimeApp);
  });
}

function diffApps() {
  const appsToLoad: RuntimeApp[] = [];
  const appsToMount: RuntimeApp[] = [];
  const appsToUnmount: RuntimeApp[] = [];
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

function shouldActive(app: RuntimeApp) {
  try {
    return app.active();
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function loadApp(app: RuntimeApp) {
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

async function mountApp(app: RuntimeApp) {
  try {
    await app.mount!();
    app.status = AppStatus.MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

async function unmountApp(app: RuntimeApp) {
  try {
    await app.unmount!();
    app.status = AppStatus.NOT_MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

export async function updateApps() {
  const { appsToLoad, appsToMount, appsToUnmount } = diffApps();
  appsToUnmount.map((app) => unmountApp(app));
  await Promise.all(appsToLoad.map((app) => loadApp(app)));
  await Promise.all(appsToMount.map((app) => mountApp(app)));
}
