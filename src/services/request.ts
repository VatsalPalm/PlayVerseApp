import { api } from "../utils/api";
import { METHODS } from "../utils/types";
import axios, { AxiosProgressEvent, InternalAxiosRequestConfig } from 'axios';


export const env = 3;


export const getURL = (env: number) => {
    if (env === 3) return 'https://crmsutra.merciglobal.com/apis/crmsutra/ws.php';
    if (env == 2) return 'https://0xsnvf4n-3320.inc1.devtunnels.ms/api';
    else return 'https://8lqg2hx4-3339.inc1.devtunnels.ms/';
};


export const instance = axios.create({
    baseURL: getURL(env),
    headers: {
        "X-Tunnel-Skip-AntiSpam": "true",
    }
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
                'Content-Type': 'application/x-www-form-urlencoded'

            },

            data: method
                ? method === METHODS.GET || method === METHODS.DELETE
                    ? undefined
                    : data
                : undefined,
        });
        if (url == api.panel) {
            return { ...response }
        } else {
            return { ...response.data };

        }
    } catch (error: any) {
        throw error;
    }
};