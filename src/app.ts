import { AppConfig, AppLifecycle, CreatedApp } from "./interface";

enum AppStatus {
  NOT_LOAD,
  LOADING,
  NOT_BOOTSTRAPPED,
  BOOTSTRAPPING,
  NOT_MOUNTED,
  MOUNTING,
  MOUNTED,
  UN_MOUNTING
}

interface App extends AppConfig, AppLifecycle {
  status: AppStatus;
}

export function createApp(): CreatedApp {
  const registeredApps: App[] = [];

  function register(apps: AppConfig | AppConfig[]) {
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

  async function update() {
    const { appsToLoad, appsToMount, appsToUnmount } = diffApps();
    await Promise.all(appsToUnmount.map(async (app) => {
      return unmountApp(app);
    }));
    appsToLoad.forEach(async (app) => {
      await loadApp(app);
      await bootStrapApp(app);
      await mountApp(app);
    });
    appsToMount.forEach(async (app) => {
      await mountApp(app);
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
          isActive && appsToLoad.push(app);
          break;
        case AppStatus.NOT_MOUNTED:
          isActive && appsToMount.push(app);
          break;
        case AppStatus.MOUNTED:
          !isActive && appsToUnmount.push(app);
          break;
      }
    });
    return { appsToLoad, appsToMount, appsToUnmount };
  }

  return {
    register: register,
    update: update
  };
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
    app.status = AppStatus.LOADING;
    const { bootstrap, mount, unmount } = await app.loader();
    app.bootstrap = bootstrap;
    app.mount = mount;
    app.unmount = unmount;
    app.status = AppStatus.NOT_BOOTSTRAPPED;
  } catch (e) {
    console.error(`${app.name} 加载失败。`, e);
  }
}

async function bootStrapApp(app: App) {
  if (app.status !== AppStatus.NOT_BOOTSTRAPPED) {
    return;
  }
  try {
    app.status = AppStatus.BOOTSTRAPPING;
    await app.bootstrap();
    app.status = AppStatus.NOT_MOUNTED;
  } catch (e) {
    console.error(`${app.name} 初始化失败。`, e);
  }
}

async function mountApp(app: App) {
  if (app.status !== AppStatus.NOT_MOUNTED || !app.active()) {
    return;
  }
  try {
    app.status = AppStatus.MOUNTING;
    await app.mount();
    app.status = AppStatus.MOUNTED;
    if (!app.active()) {
      await unmountApp(app);
    }
  } catch (e) {
    console.error(`${app.name} 挂载失败。`, e);
  }
}

async function unmountApp(app: App) {
  if (app.status !== AppStatus.MOUNTED || app.active()) {
    return;
  }
  try {
    app.status = AppStatus.UN_MOUNTING;
    await app.unmount();
    app.status = AppStatus.NOT_MOUNTED;
  } catch (e) {
    console.error(`${app.name} 卸载失败。`, e);
  }
}
