import React from "react";
import RouterView from "./router/RouterView";
import { LocaleProvider } from "antd";
import zhCN from "antd/lib/locale-provider/zh_CN";
import "antd/lib/style/index.css";
import "./app.scss";
import hideGlobalLoading from "@utils/base/hideGlobalLoading";
import { StoreProvider } from "@store";

function App () {
  hideGlobalLoading();
  return (
  <StoreProvider>
    <LocaleProvider locale={zhCN}>
      <RouterView />
    </LocaleProvider>
  </StoreProvider>
  )
}

export default App;
