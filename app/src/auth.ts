import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const api = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const auth = createAuthClient({
  baseURL: api,
  plugins: [expoClient({ scheme: 'swipemail', storagePrefix: 'swipemail', storage: SecureStore })],
})

export const call = async (path: string, init?: RequestInit) => Platform.OS === 'web'
  ? fetch(`${api}${path}`, { ...init, credentials: 'include' })
  : fetch(`${api}${path}`, { ...init, credentials: 'omit', headers: { cookie: await auth.getCookie() } })
