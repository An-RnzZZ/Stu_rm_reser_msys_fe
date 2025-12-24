// src/utils/request.ts
import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosRequestHeaders
} from 'axios';

// 读取 Vite 环境变量（TS 类型已正确声明）
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

// 创建 axios 实例
const request = axios.create({
  baseURL: baseURL, // 生产环境为空 → 请求路径就是 /api/xxx
  timeout: 5000,
  withCredentials: true // 如需携带cookie，保留；否则可注释
});


// 请求拦截器（使用 Axios 1.x+ 原生的 InternalAxiosRequestConfig 类型）
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // 强制初始化 headers，避免 undefined（核心修复点）
    config.headers = config.headers || ({} as AxiosRequestHeaders);

    // 添加 Token（类型安全）
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // 返回类型严格匹配 InternalAxiosRequestConfig
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器（类型严格匹配）
request.interceptors.response.use(
  (response: AxiosResponse): any => {
    // 直接返回响应数据（可根据后端格式调整返回类型）
    return response.data;
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('响应错误:', error);

    // 处理错误状态码
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('未授权，请重新登录');
          // window.location.href = '/login'; // 可选：跳登录页
          break;
        case 403:
          console.error('拒绝访问');
          break;
        case 404:
          console.error('请求地址不存在');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        default:
          console.error(`请求失败，状态码：${status}`);
      }
    } else if (error.request) {
      console.error('网络错误，无法连接到服务器');
    }

    return Promise.reject(error);
  }
);

export default request;

// 可选：扩展后端响应的通用类型（增强 TS 提示）
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}
