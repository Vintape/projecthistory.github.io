import {AccountError, Accounts} from "./accounts.ts";
import {answerGuide, CatalogError, cloudAvailable, getCatalog, planRoute} from "./catalog.ts";

const allowedOrigin = Deno.env.get("PERVOISTOCHNIK_FRONTEND_ORIGIN") || "https://vintape.github.io";
const guestLimit = 3;
const maxRequestBytes = 16_384;
const encoder = new TextEncoder();

function response(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Vary": "Origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].toLowerCase() !== "application/json") {
    throw new AccountError(415, "Ожидается JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AccountError(400, "Проверьте данные формы.");

  const bytes = new Uint8Array(maxRequestBytes);
  let length = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    if (length + value.byteLength > maxRequestBytes) {
      await reader.cancel();
      throw new AccountError(413, "Запрос слишком длинный.");
    }
    bytes.set(value, length);
    length += value.byteLength;
  }

  try {
    const data = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes.subarray(0, length)));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new SyntaxError();
    return data;
  } catch {
    throw new AccountError(400, "Проверьте данные формы.");
  }
}

async function fingerprint(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function credentials() {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !key) throw new Error("Database configuration missing");
  return {projectUrl, key};
}

async function consumeLimit(request: Request, operation: string) {
  const {projectUrl, key} = credentials();
  const address = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  const subject = operation === "guide_cloud" ? "all" : await fingerprint(key + ":" + address);
  const result = await fetch(projectUrl + "/rest/v1/rpc/atlas_consume_limit", {
    method: "POST",
    headers: {"Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}`},
    body: JSON.stringify({p_subject: subject, p_operation: operation}),
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  if (!result.ok) throw new Error("Rate limit storage unavailable");
  const remaining = await result.json();
  if (!Number.isInteger(remaining)) throw new Error("Invalid rate limit response");
  return remaining;
}

async function handle(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) return response({error: "Откройте атлас на GitHub Pages."}, 403);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }

  // Supabase forwards either /atlas/... or /functions/v1/atlas/... to the function.
  const path = new URL(request.url).pathname.replace(/^\/(?:functions\/v1\/)?atlas(?:\/|$)/, "");
  const authHeader = request.headers.get("authorization");
  const token = /^Bearer ([\w-]{43})$/.exec(authHeader || "")?.[1] || "";
  if (request.method === "GET" && path === "atlas") {
    return response({...getCatalog(), cloudAvailable: cloudAvailable(), guestLimit});
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return response({error: "Метод запроса не поддерживается."}, 405);
  }

  const accounts = new Accounts();
  if (request.method === "GET") {
    if (path === "profile") {
      const profile = token ? await accounts.get(token) : null;
      if (authHeader && !profile) throw new AccountError(401, "Сеанс истёк. Войдите в семейный кабинет.");
      return response({profile});
    }
    return response({error: "Страница не найдена."}, 404);
  }

  const payload = await readPayload(request);
  if (path === "register" || path === "login") {
    if (await consumeLimit(request, path) < 0) {
      return response({error: "Слишком много попыток. Попробуйте позже."}, 429);
    }
    const session = path === "register" ? await accounts.register(payload) : await accounts.login(payload);
    if (token) await accounts.logout(token);
    return response(session);
  }
  if (path === "logout") {
    if (token) await accounts.logout(token);
    return response({profile: null});
  }
  if (path === "profile") return response({profile: await accounts.update(token, payload)});
  if (path === "routes/remove") return response({profile: await accounts.removeRoute(token, payload.id)});

  if (path === "route" || path === "routes") {
    const profile = token ? await accounts.get(token) : null;
    if (path === "routes" && !profile) throw new AccountError(401, "Войдите в семейный кабинет.");
    const route = planRoute({
      ...payload,
      ancestorPlace: payload.ancestorPlace ?? profile?.ancestorPlace,
      childAge: payload.childAge ?? profile?.childAge,
    });
    if (path === "route") return response(route);
    const id = (await fingerprint(JSON.stringify(route))).slice(0, 24);
    return response({profile: await accounts.saveRoute(token, {...route, id})});
  }
  if (path === "guide") {
    if (payload.mode === "child") payload.allowCloud = false;
    const usesCloud = payload.allowCloud === true && cloudAvailable();
    const profile = usesCloud && token ? await accounts.get(token) : null;
    const remaining = usesCloud && !profile ? await consumeLimit(request, "guide_guest") : null;
    if (remaining !== null && remaining < 0) {
      return response({error: "На сегодня вопросы гостя закончились. Войдите в семейный кабинет, чтобы продолжить.", remaining: 0}, 429);
    }
    if (usesCloud && await consumeLimit(request, "guide_cloud") < 0) {
      payload.allowCloud = false;
    }
    return response({...await answerGuide(payload), remaining});
  }
  return response({error: "Страница не найдена."}, 404);
}

Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch (error) {
    if (error instanceof AccountError) return response({error: error.message}, error.status);
    if (error instanceof CatalogError) return response({error: error.message}, 400);
    console.error("Pervoistochnik request failed", error instanceof Error ? error.name : "unknown");
    return response({error: "Сервис временно недоступен. Попробуйте позже."}, 500);
  }
});
