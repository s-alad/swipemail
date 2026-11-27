import { pgTable, text, timestamp, boolean, serial, primaryKey } from 'drizzle-orm/pg-core'
import { user } from './auth-schema.ts'

export const actions = ['keep', 'delete', 'archive'] as const

export const email = pgTable('email', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  from: text('from').notNull(),
  domain: text('domain').notNull(),
  subject: text('subject').notNull(),
  date: timestamp('date').notNull(),
  list: text('list'),
  unsubscribe: boolean('unsubscribe').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })])

export const swipe = pgTable('swipe', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  emailId: text('email_id').notNull(),
  action: text('action', { enum: actions }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
