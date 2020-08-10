export interface AppLifecycle {
  bootstrap: () => Promise<void>;
  mount: () => Promise<void>;
  unmount: () => Promise<void>;
}

export interface RemoteAppLifecycle {
  mount: (host?: HTMLDivElement) => Promise<void>;
  unmount: () => Promise<void>;
}

export interface AppConfig {
  name: string;
  active: () => boolean;
  loader: () => Promise<AppLifecycle>
}

export interface RemoteAppConfig {
  name: string;
  active: () => boolean;
  entry: string;
}

export type ProxyType = Record<string, any>;
