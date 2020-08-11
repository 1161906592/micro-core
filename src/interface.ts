export interface AppLifecycle {
  bootstrap: () => Promise<void>;
  mount: () => Promise<void>;
  unmount: () => Promise<void>;
}

export interface RemoteAppLifecycle {
  mount: (host: HTMLDivElement) => Promise<void>;
  unmount: (host: HTMLDivElement) => Promise<void>;
}

export interface AppConfig {
  name: string;
  active: () => boolean;
  meta: ProxyType;
  loader: () => Promise<AppLifecycle>
}

export interface RemoteAppConfig {
  name: string;
  active: () => boolean;
  meta: ProxyType;
  entry: string;
}

export type ProxyType = Record<string, any>;

export interface StoreAction {
  type: string;
}

export type StoreReducer<S = any, A extends StoreAction = StoreAction> = (state: S | undefined, action: A) => S

export type StoreReducersMapObject<S = any, A extends StoreAction = StoreAction> = {
  [K in keyof S]: StoreReducer<S[K], A>
}

export type StoreStateFromReducersMapObject<M> = M extends StoreReducersMapObject ? { [P in keyof M]: M[P] extends StoreReducer<infer S, any> ? S : never } : never

declare const $CombinedState: unique symbol;
export type CombinedState<S> = { readonly [$CombinedState]?: undefined } & S
