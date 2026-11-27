import { StyleSheet } from 'react-native-unistyles'

const light = {
  colors: {
    background: '#f4f4f5',
    card: '#ffffff',
    text: '#18181b',
    muted: '#71717a',
    border: '#e4e4e7',
    accent: '#18181b',
    accenttext: '#ffffff',
  },
  gap: (n: number) => n * 4,
}

const dark: typeof light = {
  colors: {
    background: '#09090b',
    card: '#18181b',
    text: '#fafafa',
    muted: '#a1a1aa',
    border: '#27272a',
    accent: '#fafafa',
    accenttext: '#09090b',
  },
  gap: light.gap,
}

type themes = { light: typeof light, dark: typeof dark }

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends themes {}
}

StyleSheet.configure({ themes: { light, dark }, settings: { adaptiveThemes: true } })
