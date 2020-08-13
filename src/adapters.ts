import {
  RemoteAppLifecycle,
  AsyncStore,
  StoreReducersMapObject
} from "./interface";
import { Vue, VueConstructor } from "vue/types/vue";
import { VueRouter } from "vue-router/types/router";

interface AdapterVueOption {
  Vue: VueConstructor;
  appOptions: () => any;
  store?: {
    asyncStore: AsyncStore;
    reducer: StoreReducersMapObject;
  }
}

export function createVueAppLifecycle({ Vue, appOptions, store }: AdapterVueOption): RemoteAppLifecycle {
  let instance: Vue;
  let router: VueRouter;

  async function bootstrap() {
    if (store) {
      store.asyncStore.addReducers(store.reducer);
    }
  }

  async function mount(host: HTMLDivElement) {
    const div = document.createElement("div");
    host.appendChild(div);
    const options = appOptions();
    router = options.router;
    instance = new Vue(options).$mount(div);
  }

  async function unmount() {
    instance.$destroy();
    const teardownListeners = (router as any).teardownListeners;
    teardownListeners && teardownListeners();
  }

  return {
    bootstrap,
    mount,
    unmount
  };
}
