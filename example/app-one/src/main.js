import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

const lifecycle = window.appStarter.createVueAppLifecycle({
  Vue,
  appOptions: () => {
    return {
      router,
      store,
      render: h => h(App)
    };
  }
});

export const bootstrap = lifecycle.bootstrap;
export const mount = lifecycle.mount;
export const unmount = lifecycle.unmount;
