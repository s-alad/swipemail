import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { StyleSheet } from 'react-native-unistyles'
import { call } from './auth'

type Email = { id: string, from: string, subject: string, text: string }
type Action = 'keep' | 'delete' | 'archive'

export function Deck() {
  const [emails, setEmails] = useState<Email[]>([])
  const x = useSharedValue(0)
  const y = useSharedValue(0)

  const load = () => call('/mail').then((r) => r.json()).then(setEmails)
  useEffect(() => { load() }, [])

  const swipe = (action: Action) => {
    const [top, ...rest] = emails
    call(`/mail/${top.id}/${action}`, { method: 'POST' })
    x.value = 0
    y.value = 0
    setEmails(rest)
    if (!rest.length) load()
  }

  const pan = usePanGesture({
    onUpdate: (e) => {
      x.value = e.translationX
      y.value = e.translationY
    },
    onDeactivate: () => {
      const up = y.value < -120 && Math.abs(y.value) > Math.abs(x.value)
      const action = up ? 'archive' : x.value > 120 ? 'keep' : x.value < -120 ? 'delete' : null
      if (!action) {
        x.value = withSpring(0)
        y.value = withSpring(0)
        return
      }
      if (up) y.value = withTiming(-1000, { duration: 200 }, () => scheduleOnRN(swipe, action))
      else x.value = withTiming(Math.sign(x.value) * 1000, { duration: 200 }, () => scheduleOnRN(swipe, action))
    },
  })

  const moving = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${x.value / 20}deg` }],
  }))

  const [top, next] = emails
  return (
    <View style={styles.screen}>
      <View style={styles.stack}>
        {next && <Card email={next} />}
        {top && (
          <GestureDetector gesture={pan}>
            <Animated.View key={top.id} style={[styles.layer, moving]}>
              <Card email={top} />
            </Animated.View>
          </GestureDetector>
        )}
        {!top && <Text style={styles.muted}>inbox zero</Text>}
      </View>
      <Text style={styles.muted}>← delete    ↑ archive    keep →</Text>
    </View>
  )
}

function Card({ email }: { email: Email }) {
  return (
    <View style={[styles.layer, styles.card]}>
      <Text style={styles.muted} numberOfLines={1}>{email.from}</Text>
      <Text style={styles.subject} numberOfLines={3}>{email.subject}</Text>
      <Text style={styles.body}>{email.text}</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: theme.gap(4),
    padding: theme.gap(4),
    paddingTop: rt.insets.top + theme.gap(4),
    paddingBottom: rt.insets.bottom + theme.gap(4),
    backgroundColor: theme.colors.background,
  },
  stack: { flex: 1, width: '100%', maxWidth: 480, justifyContent: 'center', alignItems: 'center' },
  layer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  card: {
    gap: theme.gap(2),
    padding: theme.gap(5),
    overflow: 'hidden',
    borderRadius: theme.gap(6),
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  subject: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  muted: { fontSize: 14, color: theme.colors.muted },
}))
