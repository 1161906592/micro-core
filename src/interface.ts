import { createStore } from "./store";

export interface CreatedApp<T extends AppBaseConfig = AppConfig> {
  register: (apps: T | T[]) => void;
  update: () => Promise<void>
}

export interface AppLifecycle {
  bootstrap: (addReducers?: AddReducers) => Promise<void>;
  mount: (store?: Store) => Promise<void>;
  unmount: (store?: Store) => Promise<void>;
}

export interface RemoteAppLifecycle {
  bootstrap: (addReducers?: AddReducers) => Promise<void>;
  mount: (host: HTMLDivElement, store?: Store) => Promise<void>;
  unmount: (host: HTMLDivElement, store?: Store) => Promise<void>;
}

export interface AppBaseConfig {
  name: string;
  active: () => boolean;
  meta: ProxyType;
}

export interface AppConfig extends AppBaseConfig {
  loader: () => Promise<AppLifecycle>
}

export interface RemoteAppConfig extends AppBaseConfig {
  entry: string;
}

export type ProxyType = Record<string, any>;

export interface Router {
  push: (url: string) => void;
  replace: (url: string) => void;
  go: (delta: number) => void;
  back: () => void;
  beforeEach: (fn: (to: string, from: string, next: (to: boolean | string | { path: string; replace: boolean }) => void) => void) => Router;
  afterEach: (fn: (current: string, next: () => void) => void) => Router;
  destroy: () => void;
}

export interface StoreAction {
  type: string;
}

export type StoreReducer<S extends ProxyType = ProxyType, A extends StoreAction = StoreAction> = (state: S, action: A) => S

export type StoreReducersMapObject<S extends ProxyType = ProxyType, A extends StoreAction = StoreAction> = {
  [K in keyof S]: StoreReducer<S[K], A>
}

export type StoreStateFromReducersMapObject<M> = { [P in keyof M]: M[P] }

export type Store = ReturnType<typeof createStore>;

export type AddReducers = (reducers: StoreReducersMapObject) => void;

export interface CreatedSyncStore {
  store: Store;
  addReducers: AddReducers;
}
