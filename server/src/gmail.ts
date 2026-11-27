import { gmail, auth } from '@googleapis/gmail'
import { simpleParser } from 'mailparser'
import type { actions } from './schema.ts'

export async function inbox(token: string, seen: Set<string>) {
  const api = client(token)
  const { data } = await api.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults: 500 })
  const ids = (data.messages ?? []).map((m) => m.id!).filter((id) => !seen.has(id)).slice(0, 20)
  return Promise.all(ids.map(async (id) => {
    const { data } = await api.users.messages.get({ userId: 'me', id, format: 'raw' })
    const mail = await simpleParser(Buffer.from(data.raw!, 'base64url'))
    const from = mail.from?.value[0]?.address ?? ''
    const list = mail.headers.get('list') as { id?: { name?: string }, unsubscribe?: object } | undefined
    return {
      id,
      from,
      domain: from.split('@')[1] ?? '',
      subject: mail.subject ?? '',
      date: mail.date ?? new Date(),
      list: list?.id?.name ?? null,
      unsubscribe: Boolean(list?.unsubscribe),
      text: mail.text?.replace(/\s*\n\s*/g, '\n').trim() || data.snippet || '',
    }
  }))
}

export async function act(token: string, id: string, action: typeof actions[number]) {
  const api = client(token)
  if (action === 'delete') await api.users.messages.trash({ userId: 'me', id })
  if (action === 'archive') await api.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['INBOX'] } })
}

function client(token: string) {
  const oauth = new auth.OAuth2()
  oauth.setCredentials({ access_token: token })
  return gmail({ version: 'v1', auth: oauth })
}
