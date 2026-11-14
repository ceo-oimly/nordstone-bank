import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
export const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
