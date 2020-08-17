import React from "react";
import { HashRouter, Switch, Route, Redirect, matchPath } from "react-router-dom";
import routeMap from "./routeMap";

const baseRoutes = [ "/", "/home", "/home/strategy", "/login", "/register", "/404" ];

const authenticateRoute = (item) => {
  let routes = [];
  let storageRoutes = localStorage.getItem("userRoutes");
  if (storageRoutes) {
    routes = storageRoutes.split(",");
  }
  if (baseRoutes.concat(routes).some((pathname) => !!matchPath(pathname, { path: item.fullPath }))) {
    if (item.name) {
      document.title = item.name;
      if (item.fullPath !== "/login") {
        localStorage.setItem("currentPath", item.fullPath)
      }
    }
    return <item.component />;
  }
  // 已登录但匹配不到路由时定向到 404
  return <Redirect to={{ pathname: "/404" }} />;
};

const createRouteTree = (routeMap, path = "") => {
  const children = routeMap.map((item, index) => {
    item.fullPath = path + item.path;
    let redirect = null;
    if (item.redirect) {
      const render = () => <Redirect to={{ pathname: item.redirect }} />;
      redirect = <Route exact={true} path={item.fullPath} key={index} render={render} />;
    }
    if (item.component) {
      if (item.children) {
        return (
        <item.component path={item.fullPath} key={index}>
          {createRouteTree(item.children, item.fullPath)}
          {redirect}
        </item.component>
        );
      }
      const render = () => authenticateRoute(item);
      return <Route exact={true} path={item.fullPath} key={index} render={render} />;
    }
    return redirect;
  });
  return (
  <Switch>
    {children}
    <Redirect to={{ pathname: "/404" }} />
  </Switch>
  );
};

const RouterView = () => (
<HashRouter>
  {createRouteTree(routeMap)}
</HashRouter>
);

export default RouterView;
