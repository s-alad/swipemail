import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { auth } from './auth.ts'
import { db } from './db.ts'
import { account } from './auth-schema.ts'
import { email, swipe, actions } from './schema.ts'
import { inbox, act } from './gmail.ts'

const app = new Hono<{ Variables: { user: string, token: string } }>()

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.use('/mail/*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.body(null, 401)
  const [google] = await db.select({ id: account.id }).from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'google')))
  const { accessToken } = await auth.api.getAccessToken({ body: { accountId: google.id }, headers: c.req.raw.headers })
  c.set('user', session.user.id)
  c.set('token', accessToken)
  await next()
})

app.get('/mail', async (c) => {
  const userId = c.get('user')
  const seen = await db.select({ id: swipe.emailId }).from(swipe).where(eq(swipe.userId, userId))
  const emails = await inbox(c.get('token'), new Set(seen.map((s) => s.id)))
  if (emails.length) await db.insert(email).values(emails.map(({ text, ...e }) => ({ ...e, userId }))).onConflictDoNothing()
  return c.json(emails)
})

app.post('/mail/:id/:action', async (c) => {
  const { id, action } = c.req.param()
  if (!isaction(action)) return c.body(null, 400)
  await act(c.get('token'), id, action)
  await db.insert(swipe).values({ userId: c.get('user'), emailId: id, action })
  return c.body(null, 204)
})

const isaction = (value: string): value is typeof actions[number] => actions.some((a) => a === value)

serve({ fetch: app.fetch, port: 3000 }, (info) => console.log(`http://localhost:${info.port}`))
