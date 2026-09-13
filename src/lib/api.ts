export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisá los datos e intentá de nuevo.",
  401: "Tu sesión expiró. Volvé a entrar.",
  404: "No encontramos lo que buscabas.",
  409: "Hubo cambios mientras editabas. Recargá e intentá de nuevo.",
  413: "El archivo es demasiado grande.",
};

/** Server messages are shown only when they are human-readable Spanish; everything else maps to a generic message. */
async function parseErrorMessage(res: Response): Promise<string> {
  let message: string | undefined;
  try {
    message = ((await res.json()) as { error?: string }).error;
  } catch {
    // non-JSON body
  }
  const readable = message && !message.trim().startsWith("[") && !message.trim().startsWith("{") && /[áéíóúñ¿¡]|\b(el|la|los|las|de|no|tu|un|una)\b/i.test(message);
  if (readable) return message!;
  return STATUS_MESSAGES[res.status] ?? (res.status >= 500 ? "Algo falló en el servidor. Intentá de nuevo en un rato." : "No se pudo completar la acción.");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Sin conexión. Revisá tu internet e intentá de nuevo.");
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
