import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: ['./src/auth-schema.ts', './src/schema.ts'],
  dbCredentials: { url: process.env.DATABASE_URL! },
})
