import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../config/runtime";
import axios from "axios";

const api = axios.create({
  baseURL: QSM_RUNTIME_API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qsm_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;