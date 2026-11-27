import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, ne } from 'drizzle-orm'
import { auth } from './auth.ts'
import { db } from './db.ts'
import { account } from './auth-schema.ts'
import { email, swipe, actions } from './schema.ts'
import { inbox, act } from './gmail.ts'

const app = new Hono<{ Variables: { user: string; token: string } }>()
  .use(cors({ origin: 'http://localhost:8081', credentials: true }))
  .on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
  .use('/mail/*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.body(null, 401)
    const [google] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'google')))
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: google.id },
      headers: c.req.raw.headers,
    })
    c.set('user', session.user.id)
    c.set('token', accessToken)
    await next()
  })
  .get('/mail', async (c) => {
    const userId = c.get('user')
    const seen = await db
      .select({ id: swipe.emailId })
      .from(swipe)
      .where(and(eq(swipe.userId, userId), ne(swipe.action, 'unsubscribe')))
    const emails = await inbox(c.get('token'), new Set(seen.map((s) => s.id)))
    if (emails.length)
      await db
        .insert(email)
        .values(
          emails.map(({ text, html, unsubscribe, ...e }) => ({ ...e, unsubscribe: Boolean(unsubscribe), userId })),
        )
        .onConflictDoNothing()
    return c.json(emails)
  })
  .post('/mail/:id/:action', zValidator('param', z.object({ id: z.string(), action: z.enum(actions) })), async (c) => {
    const { id, action } = c.req.valid('param')
    const open = await act(c.get('token'), id, action)
    await db.insert(swipe).values({ userId: c.get('user'), emailId: id, action })
    return c.json({ open })
  })

export type AppType = typeof app

serve({ fetch: app.fetch, port: 3000 }, (info) => console.log(`http://localhost:${info.port}`))
