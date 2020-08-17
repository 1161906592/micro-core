import Loadable from "react-loadable";
import Loading from "@components/Loading/Loading";

const routeMap = [
  {
    path: "/",
    redirect: "/home"
  },
  {
    path: '/login',
    name: '登录',
    component: Loadable({
      loader: () => import('@pages/login/Login'),
      loading: Loading
    })
  },
  {
    path: '/register',
    name: '注册',
    component: Loadable({
      loader: () => import('@pages/register/Register'),
      loading: Loading
    })
  },
  {
    path: "/home",
    component: Loadable({
      loader: () => import('@components/Layout/MainLayout'),
      loading: Loading
    }),
    children: [
      {
        path: "/",
        name: '主页',
        component: Loadable({
          loader: () => import('@pages/home/Home'),
          loading: Loading
        })
      },
      {
        path: "/strategy",
        name: '攻略',
        component: Loadable({
          loader: () => import('@pages/strategy/Strategy'),
          loading: Loading
        })
      }
    ]
  },
  {
    path: '/404',
    name: '找不到页面呢~',
    component: Loadable({
      loader: () => import('@pages/errorPage/404/NotFound'),
      loading: Loading
    })
  }
];

export default routeMap;
