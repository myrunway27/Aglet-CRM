import { readJson } from "./api-types";

/** JSON request to our own API. Browsers attach Origin, which write routes check. */
export async function api<T>(url: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  return readJson<T>(res);
}
