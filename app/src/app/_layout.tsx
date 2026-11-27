import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const client = new QueryClient()

export default function Layout() {
  return (
    <QueryClientProvider client={client}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Slot />
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}
