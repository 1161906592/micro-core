export interface ApplicationLifecycle {
  bootstrap: () => Promise<void>[];
  mount: () => Promise<void>[];
  unmount: () => Promise<void>[];
}

export interface Application {
  name: string;
  active: () => boolean;
  loader: () => Promise<ApplicationLifecycle>
}

enum ApplicationStatus {
  NOT_LOAD,
  NOT_MOUNTED,
  MOUNTED
}

interface RuntimeApplication extends Application {
  status: ApplicationStatus;
  bootstrap?: () => Promise<void>[];
  mount?: () => Promise<void>[];
  unmount?: () => Promise<void>[];
}

const apps: RuntimeApplication[] = [];

export function registerApplication(app: Application) {
  if (__DEV__) {
    if (apps.find(d => d.name === app.name)) {
      console.error(`存在与 ${app.name} 同名的应用已经被注册`);
    }
  }
  const runtimeApp: RuntimeApplication = {
    ...app,
    status: ApplicationStatus.NOT_LOAD
  };
  apps.push(runtimeApp);
}

function diffApplications() {
  const appsToLoad: RuntimeApplication[] = [];
  const appsToMount: RuntimeApplication[] = [];
  const appsToUnmount: RuntimeApplication[] = [];
  apps.forEach((app) => {
    const isActive = shouldActive(app);
    switch (app.status) {
      case ApplicationStatus.NOT_LOAD:
        if (isActive) {
          appsToLoad.push(app);
          appsToMount.push(app);
        }
        break;
      case ApplicationStatus.NOT_MOUNTED:
        if (isActive) {
          appsToMount.push(app);
        }
        break;
      case ApplicationStatus.MOUNTED:
        if (!isActive) {
          appsToUnmount.push(app);
        }
        break;
    }
  });
  return { appsToLoad, appsToMount, appsToUnmount };
}

function shouldActive(app: RuntimeApplication) {
  try {
    return app.active();
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function loadApp(app: RuntimeApplication) {
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

async function mountApp(app: RuntimeApplication) {
  try {
    await app.mount!();
    app.status = ApplicationStatus.MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

async function unmountApp(app: RuntimeApplication) {
  try {
    await app.unmount!();
    app.status = ApplicationStatus.NOT_MOUNTED;
  } catch (e) {
    console.error(e);
  }
}

export async function updateApplications() {
  const { appsToLoad, appsToMount, appsToUnmount } = diffApplications();
  appsToUnmount.map((app) => unmountApp(app));
  await Promise.all(appsToLoad.map((app) => loadApp(app)));
  await Promise.all(appsToMount.map((app) => mountApp(app)));
}
