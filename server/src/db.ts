import { drizzle } from 'drizzle-orm/node-postgres'
import * as authschema from './auth-schema.ts'
import * as schema from './schema.ts'

export const db = drizzle(process.env.DATABASE_URL!, { schema: { ...authschema, ...schema } })
