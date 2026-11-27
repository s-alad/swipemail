# swipemail

## Idea

swipemail cleans a huge inbox by swiping. You swipe through emails (delete, keep, archive, group), and from your first swipes it learns your habits and suggests bulk actions across the whole mailbox, like "delete all Amazon promos (3,214)" or "put all Amazon order emails in amazon-order". You approve a suggestion and it runs across tens of thousands of emails at once. Approved rules keep applying to new mail.

The goal is a real product, so decisions are made for the long term.

## Stack (agreed)

- App: Expo (SDK 58) with Expo Router, Better Auth's Expo plugin.
- Server: Hono on Node 26, Better Auth with Google sign-in only (tokens encrypted).
- Mail: Gmail API (`@googleapis/gmail`) first. IMAP (ImapFlow) is a later second backend for other providers.
- Data: Postgres through Drizzle, run locally by devenv.
- Repo: npm workspaces (`app/`, `server/`), devenv in `.nixdev/`.

## Data

- Better Auth's tables: user, session, account, verification.
- `email`: provider-neutral metadata per message (sender, domain, subject, date, `List-Id`, `List-Unsubscribe`). Same fields for Gmail and IMAP.
- `swipe`: one row per action, logged from day one so learning has history.
- `rule` (later): approved bulk rules.
- Email bodies are shown in the app but not stored at first (data size and Google's security review). Add body text with Postgres full-text search only if needed.

## Learning

- No LLM to start. Rules come from counting actions over structured fields in SQL (sender, domain, mailing-list headers, subject). Example: deleted 9 of 10 Amazon list emails, so suggest deleting the rest.
- Rules are filters on our own `email` table, so they work the same for Gmail and IMAP. Only the final apply step (trash, archive, label/folder) is provider-specific.
- An LLM is a later option only if simple rules miss meaning-based groups (orders vs shipping from the same sender).

## Provider notes

- Gmail uses labels (an email can have several). IMAP uses folders (one per email). Archive = remove Inbox label (Gmail) or move to Archive folder (IMAP).
- Gmail API is free. Full mailbox access is a restricted Google scope: up to 100 test users while in Testing (sign-in expires every 7 days), and a yearly third-party security review before public launch. This applies to IMAP over Google sign-in too.

## Roadmap

1. First build: Google sign-in, swipe deck from Gmail (left delete, right keep, up archive), `email` and `swipe` tables.
2. Grouping and SQL-based rule suggestions with bulk apply.
3. IMAP backend. Body text and/or LLM only if needed.
