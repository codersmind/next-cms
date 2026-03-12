import { fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

function getJwt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt");
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  prepareHeaders(headers) {
    const token = getJwt();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && typeof window !== "undefined") {
    const url = typeof args === "string" ? args : (args as FetchArgs).url;
    const isLoginRequest = typeof url === "string" && url.includes("/api/auth/login");
    const alreadyOnLogin = window.location.pathname === "/admin/login";
    if (!isLoginRequest && !alreadyOnLogin) {
      window.location.href = "/admin/login";
    }
  }
  return result;
};
