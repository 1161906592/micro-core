import axios from "axios";
import NProgress from "nprogress"
import { message } from "antd";
NProgress.configure({ showSpinner: false });

const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:3001", // api的base_url
  timeout: 0, // 请求超时时间
  withCredentials: true,
  headers: {
    "Content-Type": "application/json;charset=utf-8"
  }
});

axiosInstance.interceptors.request.use((config) => {
  NProgress.start();
  config.headers["token"] = localStorage.getItem("token");
  return config
});

axiosInstance.interceptors.response.use((response) => {
  NProgress.done();
  return response;
}, (error) => {
  NProgress.done();
  message.error("网络错误");
  return Promise.reject(error);
});

export default axiosInstance;
