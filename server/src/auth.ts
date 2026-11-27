import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { db } from './db.ts'
import { env } from './env.ts'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg' }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ['https://www.googleapis.com/auth/gmail.modify'],
      accessType: 'offline',
      prompt: 'consent',
    },
  },
  account: { encryptOAuthTokens: true },
  plugins: [expo()],
  trustedOrigins: ['swipemail://', 'exp://', 'http://localhost:8081'],
})
