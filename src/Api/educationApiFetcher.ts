import type { EducationApiContext } from "./educationApiContext";
import axios from "axios";
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const baseUrl = "https://8lqg2hx4-3339.inc1.devtunnels.ms";
// Local instance to avoid interference
const localInstance = axios.create();

export type ErrorWrapper<TError> =
  | TError
  | { status: "unknown"; payload: string };

export type EducationApiFetcherOptions<
  TBody,
  THeaders,
  TQueryParams,
  TPathParams,
> = {
  url: string;
  method: string;
  body?: TBody;
  headers?: THeaders;
  queryParams?: TQueryParams;
  pathParams?: TPathParams;
  signal?: AbortSignal;
} & EducationApiContext["fetcherOptions"];

export async function educationApiFetch<
  TData,
  TError,
  TBody extends {} | FormData | undefined | null,
  THeaders extends {},
  TQueryParams extends {},
  TPathParams extends {},
>({
  url,
  method,
  body,
  headers,
  pathParams,
  queryParams,
  signal,
}: EducationApiFetcherOptions<
  TBody,
  THeaders,
  TQueryParams,
  TPathParams
>): Promise<TData> {
  try {
    const token = storage.getString('accessToken');
    const requestHeaders: any = {
      ...headers,
      "X-Tunnel-Skip-AntiSpam": "true",
    };

    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }

    if (body instanceof FormData) {
      requestHeaders["Content-Type"] = "multipart/form-data";
    } else if (
      requestHeaders["Content-Type"]
        ?.toLowerCase()
        .includes("multipart/form-data")
    ) {
      delete requestHeaders["Content-Type"];
    }

    const response = await localInstance({
      baseURL: baseUrl,
      url: resolveUrl(url, queryParams, pathParams),
      method: method.toUpperCase(),
      data: body,
      headers: requestHeaders,
      signal,
    });
    return response.data as TData;
  } catch (e: any) {
    let errorObject: ErrorWrapper<TError> = {
      status: "unknown",
      payload: e.message || "Unknown error"
    }

    if (e.response && e.response.data) {
      throw e.response.data;
    }

    throw errorObject;
  }
}

const resolveUrl = (
  url: string,
  queryParams: Record<string, string> = {},
  pathParams: Record<string, string> = {},
) => {
  let query = new URLSearchParams(queryParams).toString();
  if (query) query = `?${query}`;
  return (
    url.replace(/\{\w*\}/g, (key) => pathParams[key.slice(1, -1)] ?? "") + query
  );
};
