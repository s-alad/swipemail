import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const api = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const auth = createAuthClient({
  baseURL: api,
  plugins: [expoClient({ scheme: 'swipemail', storagePrefix: 'swipemail', storage: SecureStore })],
})

export const call = async (path: string, init?: RequestInit) => {
  const response = Platform.OS === 'web'
    ? await fetch(`${api}${path}`, { ...init, credentials: 'include' })
    : await fetch(`${api}${path}`, { ...init, credentials: 'omit', headers: { cookie: await auth.getCookie() } })
  if (!response.ok) throw new Error(`${response.status}`)
  return response
}
