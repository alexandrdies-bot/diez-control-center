import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, "../../..");

dotenv.config({
  path: path.join(repoRoot, ".env")
});

type BootstrapUserRole = "manager" | "admin";

type BootstrapUserRow = {
  id: string;
  login: string;
  role: BootstrapUserRole;
};

const { queryDatabase, withDatabaseTransaction } = await import("./db.js");

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function getBootstrapRole(): BootstrapUserRole {
  const value = process.env.BOOTSTRAP_USER_ROLE?.trim() || "admin";

  if (value === "manager" || value === "admin") {
    return value;
  }

  throw new Error("BOOTSTRAP_USER_ROLE must be manager or admin");
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);

  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

async function bootstrapUser() {
  const login = getRequiredEnv("BOOTSTRAP_USER_LOGIN");
  const password = getRequiredEnv("BOOTSTRAP_USER_PASSWORD");
  const displayName = getRequiredEnv("BOOTSTRAP_USER_DISPLAY_NAME");
  const email = getOptionalEnv("BOOTSTRAP_USER_EMAIL");
  const role = getBootstrapRole();
  const passwordHash = createPasswordHash(password);

  const existingUsers = await queryDatabase<BootstrapUserRow>(
    `
      select
        id::text as id,
        login,
        role
      from app.users
      where lower(login) = lower($1)
      limit 1
    `,
    [login]
  );
  const existingUser = existingUsers[0];

  const result = await withDatabaseTransaction(async (client) => {
    if (existingUser) {
      const updatedUser = await client.query<BootstrapUserRow>(
        `
          update app.users
          set
            password_hash = $2,
            display_name = $3,
            email = $4,
            role = $5,
            is_active = true
          where id = $1
          returning
            id::text as id,
            login,
            role
        `,
        [existingUser.id, passwordHash, displayName, email, role]
      );

      return {
        action: "updated",
        user: updatedUser.rows[0]
      };
    }

    const insertedUser = await client.query<BootstrapUserRow>(
      `
        insert into app.users (
          login,
          email,
          display_name,
          password_hash,
          role,
          is_active
        )
        values ($1, $2, $3, $4, $5, true)
        returning
          id::text as id,
          login,
          role
      `,
      [login, email, displayName, passwordHash, role]
    );

    return {
      action: "created",
      user: insertedUser.rows[0]
    };
  });

  console.log(
    JSON.stringify(
      {
        action: result.action,
        id: Number(result.user.id),
        login: result.user.login,
        role: result.user.role
      },
      null,
      2
    )
  );
}

try {
  await bootstrapUser();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown bootstrap error";
  console.error(`Bootstrap admin failed: ${message}`);
  process.exitCode = 1;
}
