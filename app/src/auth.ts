import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { hc } from 'hono/client'
import type { AppType } from '../../server/src/index.ts'

export const api = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const auth = createAuthClient({
  baseURL: api,
  plugins: [expoClient({ scheme: 'swipemail', storagePrefix: 'swipemail', storage: SecureStore })],
})

export const client = hc<AppType>(api, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    if (Platform.OS !== 'web') headers.set('cookie', await auth.getCookie())
    const response = await fetch(input, { ...init, headers, credentials: Platform.OS === 'web' ? 'include' : 'omit' })
    if (!response.ok) throw new Error(`${response.status}`)
    return response
  },
})
