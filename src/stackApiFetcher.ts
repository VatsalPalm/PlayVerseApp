import type { StackApiContext } from "./stackApiContext";

import { instance } from "./services/request";
import { AxiosRequestConfig } from "axios";

const baseUrl = "https://peptide-web-app.onrender.com";

export type ErrorWrapper<TError> =
  | TError
  | { status: "unknown"; payload: string };

export type StackApiFetcherOptions<TBody, THeaders, TQueryParams, TPathParams> =
  {
    url: string;
    method: string;
    body?: TBody;
    headers?: THeaders;
    queryParams?: TQueryParams;
    pathParams?: TPathParams;
    signal?: AbortSignal;
  } & StackApiContext["fetcherOptions"];

export async function stackApiFetch<
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
}: StackApiFetcherOptions<
  TBody,
  THeaders,
  TQueryParams,
  TPathParams
>): Promise<TData> {
  try {
    const requestHeaders: any = {
      ...headers,
    };

    /**
     * As the fetch API is being used, when multipart/form-data is specified
     * the Content-Type header must be deleted so that the browser can set
     * the correct boundary.
     * https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects#sending_files_using_a_formdata_object
     */
    if (
      requestHeaders["Content-Type"]
        ?.toLowerCase()
        .includes("multipart/form-data")
    ) {
      delete requestHeaders["Content-Type"];
    }

    const response = await instance({
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
