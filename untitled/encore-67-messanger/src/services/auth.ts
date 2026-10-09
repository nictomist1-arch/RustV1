import type Database from "@tauri-apps/plugin-sql";

import type { AuthCredentials } from "../types/auth";
import type { User } from "../types/user";

interface Account extends User{
  password_hash: string | null;
  password_salt: string | null;
}

function toHex(bytes: Uint8Array){
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string){
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 210000,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(new Uint8Array(result));
}

export async function authenticate(db: Database, credentials: AuthCredentials): Promise<User>{
  const username = credentials.username.trim();

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)){
    throw new Error("Логин: от 3 до 32 латинских букв, цифр или символов _.");
  }

  if (!credentials.password || credentials.password.length > 128){
    throw new Error("Введите пароль длиной до 128 символов.");
  }

  const accounts = await db.select<Account[]>(
    `SELECT * FROM users WHERE lower(username) = lower($1) LIMIT 1`,
    [username],
  );
  let account = accounts[0];

  if (credentials.registering){
    const displayName = credentials.displayName.trim();

    if (!displayName || displayName.length > 40){
      throw new Error("Введите имя длиной от 1 до 40 символов.");
    }
    if (credentials.password.length < 6){
      throw new Error("Пароль должен содержать минимум 6 символов.");
    }
    if (account){
      throw new Error("Этот логин уже занят.");
    }

    const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const hash = await hashPassword(credentials.password, salt);
    const result = await db.execute(
      `INSERT INTO users (username, display_name, password_hash, password_salt)
       VALUES ($1, $2, $3, $4)`,
      [username, displayName, hash, salt],
    );
    const created = await db.select<Account[]>(
      `SELECT * FROM users WHERE id = $1`,
      [result.lastInsertId],
    );
    account = created[0];
  } else {
    const hash = await hashPassword(credentials.password, account?.password_salt ?? "missing-account");
    if (!account?.password_hash || !account.password_salt || hash !== account.password_hash){
      throw new Error("Неверный логин или пароль.");
    }
  }

  if (!account){
    throw new Error("Не удалось загрузить пользователя.");
  }

  return {
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    avatar_path: account.avatar_path,
    status: account.status,
    created_at: account.created_at,
  };
}
