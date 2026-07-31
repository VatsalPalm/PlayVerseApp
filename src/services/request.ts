import { api } from "../utils/api";
import { METHODS } from "../utils/types";
import axios, { AxiosProgressEvent, InternalAxiosRequestConfig } from "axios";

export const env = 3;

export const getURL = (env: number) => {
  if (env === 3) return "https://8lqg2hx4-3339.inc1.devtunnels.ms/";
  if (env == 2) return "https://0xsnvf4n-3320.inc1.devtunnels.ms/api";
  else return "http://192.168.29.234:3320/api";
};

export const instance = axios.create({
  baseURL: getURL(env),
});

export const request = async (
  method: METHODS = METHODS.GET,
  url?: string,
  data?: any,
) => {
  try {
    const response = await instance({
      method,
      url,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      data: method
        ? method === METHODS.GET || method === METHODS.DELETE
          ? undefined
          : data
        : undefined,
    });
    if (url == api.panel) {
      return { ...response };
    } else {
      return { ...response.data };
    }
  } catch (error: any) {
    throw error;
  }
};
