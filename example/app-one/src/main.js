import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

let instance;

export const bootstrap = () => {};
export const mount = (host) => {
  const div = document.createElement("div");
  host.appendChild(div);
  instance = new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount(div);
};
export const unmount = () => {
  instance.$destroy();
};
