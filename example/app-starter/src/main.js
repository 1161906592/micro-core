import { createRouter, createRemoteApp, createAsyncStore, createVueAppLifecycle, request } from "./bundle";

const basePath = "/micro-core";
const time = Date.now();

// 应用运行的路由
function pathsInclude (paths) {
  const pathArr = Array.isArray(paths) ? paths : [paths];
  return pathArr.some((path) => location.pathname.startsWith(basePath + path));
}

// 应用不运行的路由
function pathsExclude (paths) {
  const pathArr = Array.isArray(paths) ? paths : [paths];
  return pathArr.every((path) => !location.pathname.startsWith(basePath + path));
}

async function main () {
  const application = JSON.parse(await request(`/application.json?=${time}`));

  const app = createRemoteApp();

  const router = createRouter(basePath);

  const asyncStore = createAsyncStore({});

  app.register(application.applications.map((app) => {
    return {
      name: app.name,
      active: function () {
        return app.includes ? pathsInclude(app.includes) : (app.excludes && pathsExclude(app.excludes));
      },
      entry: `${app.entry}?=${time}`
    };
  }));

  window.appStarter = {
    router,
    asyncStore,
    createVueAppLifecycle
  };

  // 必须 将路由与应用绑定
  router.afterEach((current, next) => {
    app.update();
    next();
  });

  router.beforeEach((to, form, next) => {
    console.log(to);
    if (to === "/b") {
      next("/c");
    } else {
      next();
    }
  });

  router.beforeEach(function (to, from, next) {
    if (to !== "/a") {
      next();
    } else {
      next({
        path: "/b"
      });
    }
  });

  app.update();
}

main();
