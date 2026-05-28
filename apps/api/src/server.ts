import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { checkDatabaseConnection, queryDatabase } from "./db.js";

const apiHost = process.env.API_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.API_PORT ?? "3001");

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get("/health", async () => {
  return {
    ok: true,
    service: "diez-control-center-api",
    version: "0.0.0"
  };
});

app.get("/health/db", async (_request, reply) => {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    return reply.code(503).send(result);
  }

  return result;
});

app.get("/units", async () => {
  return queryDatabase<{
    id: number;
    code: string;
    name: string;
  }>(
    `
      select
        id,
        code,
        name
      from app.units
      order by code
    `
  );
});

app.get("/material-categories", async () => {
  return queryDatabase<{
    id: number;
    name: string;
    description: string | null;
  }>(
    `
      select
        id,
        name,
        description
      from app.material_categories
      order by name
    `
  );
});

try {
  await app.listen({
    host: apiHost,
    port: apiPort
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
