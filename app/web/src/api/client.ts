async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    ...init,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string) {
    return requestJson<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return requestJson<T>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown) {
    return requestJson<T>(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T>(path: string, body?: unknown) {
    return requestJson<T>(path, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
};
