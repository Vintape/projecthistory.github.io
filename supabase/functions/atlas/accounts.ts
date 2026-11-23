import { timingSafeEqual } from "node:crypto";

const passwordIterations = 600_000;
const encoder = new TextEncoder();
// Python treats these four separators as whitespace as well.
// deno-lint-ignore no-control-regex
const whitespace = /[\p{White_Space}\u001c-\u001f]+/u;
const surrogate = /\p{Surrogate}/u;
const routeFields = ["id", "title", "overview", "stops", "format"] as const;
const nameError = "Введите имя длиной до 100 символов.";
const routeError = "Не удалось сохранить маршрут.";
const loginRequired = "Войдите в семейный кабинет.";
const unavailable = "Семейный кабинет временно недоступен.";

type Input = Record<string, unknown>;
type Route = Record<typeof routeFields[number], unknown> & { id: string };
type ProfileFields = {
  name?: string;
  childAge?: number | null;
  ancestorPlace?: string;
};
type Credentials = {
  id: string;
  salt: string;
  hash: string;
  iterations: number;
};

export type Profile = {
  name: string;
  email: string;
  childAge: number | null;
  ancestorPlace: string;
  familyNote: string;
  researchQuestion: string;
  routes: Route[];
};

type Login = { profile: Profile; token: string };

export class AccountError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AccountError";
  }
}

function object(value: unknown): value is Input {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function input(value: unknown): Input {
  if (!object(value)) throw new AccountError(400, "Проверьте данные формы.");
  return value;
}

function normalizedText(
  value: unknown,
  limit: number,
  message: string,
  required = false,
): string {
  if (value == null && !required) return "";
  if (typeof value !== "string") throw new AccountError(400, message);
  const normalized = value.split(whitespace).filter(Boolean).join(" ")
    .normalize("NFC");
  if (
    [...normalized].length > limit || /(?! )[\p{C}\p{Z}]/u.test(normalized) ||
    (required && !normalized)
  ) {
    throw new AccountError(400, message);
  }
  return normalized;
}

function emailAddress(value: unknown): string {
  const message = "Введите адрес электронной почты.";
  const text = normalizedText(value, 254, message, true);
  // Unicode case folding matches the local pilot, including multi-letter forms such as ß.
  const email = Array.from(text, (character) => {
    if (character === "ı") return character;
    if (character === "ẞ") return "ss";
    if (/\p{Script=Cherokee}/u.test(character)) return character.toUpperCase();
    return character.toUpperCase().toLowerCase();
  }).join("");
  if (
    [...email].length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(email)
  ) {
    throw new AccountError(400, message);
  }
  return email;
}

function passwordBytes(value: unknown) {
  const length = typeof value === "string" ? [...value].length : 0;
  if (typeof value !== "string" || length < 8 || length > 256) {
    throw new AccountError(
      400,
      "Пароль должен содержать от 8 до 256 символов.",
    );
  }
  if (surrogate.test(value)) {
    throw new AccountError(400, "Введите пароль заново.");
  }
  return encoder.encode(value);
}

function childAge(value: unknown): number | null {
  if (typeof value === "string") {
    const trimmed = value.split(whitespace).filter(Boolean).join(" ");
    if (!trimmed) return null;
    if (/^[0-9]{1,2}$/.test(trimmed)) value = Number(trimmed);
  }
  if (value === null) return null;
  if (
    typeof value === "number" && Number.isInteger(value) && value >= 0 &&
    value <= 18
  ) return value;
  throw new AccountError(400, "Укажите возраст ребёнка от 0 до 18 лет.");
}

function profileFields(data: Input): ProfileFields {
  const fields: ProfileFields = {};
  if (Object.hasOwn(data, "name")) {
    fields.name = normalizedText(data.name, 100, nameError, true);
  }
  if (Object.hasOwn(data, "childAge")) {
    fields.childAge = childAge(data.childAge);
  }
  if (Object.hasOwn(data, "ancestorPlace")) {
    fields.ancestorPlace = normalizedText(
      data.ancestorPlace,
      160,
      "Укажите место предков длиной до 160 символов.",
    );
  }
  return fields;
}

function journalFields(data: Input) {
  const fields: Record<string, string> = {};
  for (
    const [key, limit, message] of [
      ["familyNote", 1200, "Сократите семейную заметку до 1200 символов."],
      ["researchQuestion", 350, "Сократите вопрос до 350 символов."],
    ] as const
  ) {
    if (!Object.hasOwn(data, key)) continue;
    const value = data[key];
    if (typeof value !== "string") throw new AccountError(400, message);
    const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n")
      .split("\n").map((line) => normalizedText(line, limit, message)).join(
        "\n",
      ).trim();
    if ([...normalized].length > limit) throw new AccountError(400, message);
    fields[key] = normalized;
  }
  return fields;
}

function routeSnapshot(route: Input): Route {
  if (
    !object(route) || !routeFields.every((field) => Object.hasOwn(route, field))
  ) {
    throw new AccountError(400, routeError);
  }
  const { title, overview, stops, format } = route;
  const snapshot = {
    id: normalizedText(route.id, 128, routeError, true),
    title,
    overview,
    stops,
    format,
  };
  try {
    JSON.stringify(snapshot, (key, value) => {
      if (
        value === undefined || typeof value === "function" ||
        typeof value === "symbol" ||
        (typeof value === "number" && !Number.isFinite(value)) ||
        key.includes("\0") || surrogate.test(key) ||
        (typeof value === "string" &&
          (value.includes("\0") || surrogate.test(value)))
      ) {
        throw new Error(routeError);
      }
      return value;
    });
  } catch {
    throw new AccountError(400, routeError);
  }
  return snapshot;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function fromHex(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derivePassword(
  password: BufferSource,
  salt: BufferSource,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", password, "PBKDF2", false, [
    "deriveBits",
  ]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(hash);
}

async function tokenDigest(token: string): Promise<string> {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(token)),
    ),
  );
}

function hashToken(token: string): Promise<string> | null {
  if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(token)) {
    return null;
  }
  return tokenDigest(token);
}

async function newSession(): Promise<{ token: string; tokenHash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-")
    .replaceAll("/", "_").replace(/=+$/, "");
  return { token, tokenHash: await tokenDigest(token) };
}

export class Accounts {
  async #rpc<T>(operation: string, parameters: Input): Promise<T> {
    try {
      const base = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!base || !key) throw new Error();
      const url = new URL(`/rest/v1/rpc/atlas_family_${operation}`, base);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parameters),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error();
      }
      return response.status === 204 ? null as T : await response.json() as T;
    } catch {
      throw new AccountError(503, unavailable);
    }
  }

  async get(token: string): Promise<Profile | null> {
    const tokenHash = await hashToken(token);
    return tokenHash === null
      ? null
      : this.#rpc<Profile | null>("profile", { p_token_hash: tokenHash });
  }

  async register(data: Input): Promise<Login> {
    data = input(data);
    const fields = profileFields(data);
    if (!fields.name) throw new AccountError(400, nameError);
    const email = emailAddress(data.email);
    const password = passwordBytes(data.password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePassword(password, salt, passwordIterations);
    const { token, tokenHash } = await newSession();
    const profile = await this.#rpc<Profile | null>("register", {
      p_name: fields.name,
      p_email: email,
      p_password_hash: hex(hash),
      p_password_salt: hex(salt),
      p_password_iterations: passwordIterations,
      p_child_age: fields.childAge ?? null,
      p_ancestor_place: fields.ancestorPlace ?? "",
      p_token_hash: tokenHash,
    });
    if (!profile) {
      throw new AccountError(
        400,
        "Аккаунт с такой почтой уже существует. Войдите в кабинет.",
      );
    }
    return { profile, token };
  }

  async login(data: Input): Promise<Login> {
    data = input(data);
    const email = emailAddress(data.email);
    const password = passwordBytes(data.password);
    const credentials = await this.#rpc<Credentials | null>("credentials", {
      p_email: email,
    });
    const salt = credentials ? fromHex(credentials.salt) : new Uint8Array(16);
    const hash = await derivePassword(
      password,
      salt,
      credentials?.iterations ?? passwordIterations,
    );
    if (!credentials || !timingSafeEqual(hash, fromHex(credentials.hash))) {
      throw new AccountError(401, "Проверьте почту и пароль.");
    }
    const { token, tokenHash } = await newSession();
    const profile = await this.#rpc<Profile>("start_session", {
      p_account_id: credentials.id,
      p_token_hash: tokenHash,
    });
    return { profile, token };
  }

  async logout(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    if (tokenHash !== null) {
      await this.#rpc<null>("logout", { p_token_hash: tokenHash });
    }
  }

  async #mutate(token: string, parameters: () => Input): Promise<Profile> {
    const tokenHash = await hashToken(token);
    if (tokenHash === null) throw new AccountError(401, loginRequired);
    let changes: Input;
    try {
      changes = parameters();
    } catch (error) {
      if (
        error instanceof AccountError &&
        !await this.#rpc<Profile | null>("profile", { p_token_hash: tokenHash })
      ) {
        throw new AccountError(401, loginRequired);
      }
      throw error;
    }
    const profile = await this.#rpc<Profile | null>("mutate_profile", {
      p_token_hash: tokenHash,
      ...changes,
    });
    if (!profile) throw new AccountError(401, loginRequired);
    return profile;
  }

  update(token: string, data: Input): Promise<Profile> {
    data = input(data);
    return this.#mutate(
      token,
      () => ({ p_fields: { ...profileFields(data), ...journalFields(data) } }),
    );
  }

  saveRoute(token: string, route: Input): Promise<Profile> {
    return this.#mutate(token, () => ({ p_route: routeSnapshot(route) }));
  }

  removeRoute(token: string, id: unknown): Promise<Profile> {
    return this.#mutate(token, () => ({
      p_remove_route: normalizedText(
        id,
        128,
        "Укажите маршрут, который нужно удалить.",
        true,
      ),
    }));
  }
}
