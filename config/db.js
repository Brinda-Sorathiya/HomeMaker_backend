import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const { PG_USER, PG_PASSWORD, PG_HOST, PG_DATABASE } = process.env;

export const sql = neon(
    `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}/${PG_DATABASE}?sslmode=require`
);