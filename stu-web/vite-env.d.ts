// src/vite-env.d.ts
/// <reference types="vite/client" />

// 扩展 ImportMeta 类型，解决 env 不存在的报错
interface ImportMeta {
  env: {
    VITE_API_BASE_URL: string;
    [key: string]: string | boolean | undefined;
  };
}

// 兼容 Vite 官方的 ImportMetaEnv 声明
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
