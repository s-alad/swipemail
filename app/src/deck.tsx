import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { client as api } from './auth'
import EmailView from './email-view'

type Email = InferResponseType<typeof api.mail.$get>[number]
type Action = InferRequestType<(typeof api.mail)[':id'][':action']['$post']>['param']['action']

export function Deck() {
  const client = useQueryClient()
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const [open, setOpen] = useState(false)

  const mail = useQuery({ queryKey: ['mail'], queryFn: () => api.mail.$get().then((r) => r.json()) })
  const emails = mail.data ?? []

  const mutation = useMutation({
    mutationFn: ({ email, action }: { email: Email; action: Action }) =>
      api.mail[':id'][':action'].$post({ param: { id: email.id, action } }),
    onMutate: ({ email }) => client.setQueryData<Email[]>(['mail'], (list) => list?.filter((e) => e.id !== email.id)),
    onError: (_, { email }) => client.setQueryData<Email[]>(['mail'], (list) => [email, ...(list ?? [])]),
    onSettled: () =>
      client.isMutating() === 1 &&
      !client.getQueryData<Email[]>(['mail'])?.length &&
      client.invalidateQueries({ queryKey: ['mail'] }),
    retry: 2,
  })

  const swipe = (action: Action) => {
    mutation.mutate({ email: emails[0], action })
    x.value = 0
    y.value = 0
    setOpen(false)
  }

  const fling = (action: Action) => {
    'worklet'
    if (action === 'archive') y.value = withTiming(-1000, { duration: 200 }, () => scheduleOnRN(swipe, action))
    else x.value = withTiming(action === 'keep' ? 1000 : -1000, { duration: 200 }, () => scheduleOnRN(swipe, action))
  }

  const pan = usePanGesture({
    activeOffsetX: open ? [-20, 20] : undefined,
    failOffsetY: open ? [-20, 20] : undefined,
    onUpdate: (e) => {
      x.value = e.translationX
      y.value = e.translationY
    },
    onDeactivate: () => {
      const up = y.value < -120 && Math.abs(y.value) > Math.abs(x.value)
      const action = up ? 'archive' : x.value > 120 ? 'keep' : x.value < -120 ? 'delete' : null
      if (action) return fling(action)
      x.value = withSpring(0)
      y.value = withSpring(0)
    },
  })

  const tap = useTapGesture({ enabled: !open, runOnJS: true, onActivate: () => setOpen(true) })
  const gesture = useCompetingGestures(pan, tap)

  const moving = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${x.value / 20}deg` }],
  }))

  const [top, next] = emails
  return (
    <View style={styles.screen}>
      <View style={[styles.stack, open && styles.wide]}>
        {next && !open && <Card email={next} />}
        {top && (
          <GestureDetector gesture={gesture}>
            <Animated.View key={top.id} layout={LinearTransition} style={[styles.layer, moving]}>
              <Card email={top} open={open} onClose={() => setOpen(false)} />
            </Animated.View>
          </GestureDetector>
        )}
        {mail.isFetching && !top && <Text style={styles.muted}>loading</Text>}
        {mail.isError && (
          <Pressable onPress={() => mail.refetch()}>
            <Text style={styles.muted}>couldn't load, tap to retry</Text>
          </Pressable>
        )}
        {mail.isSuccess && !mail.isFetching && !top && <Text style={styles.muted}>inbox zero</Text>}
      </View>
      {open ? (
        <View style={styles.bar}>
          {(['delete', 'archive', 'keep'] as const).map((action) => (
            <Pressable key={action} style={styles.button} onPress={() => fling(action)}>
              <Text style={styles.label}>{action}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>{'← delete     ↑ archive     keep →'}</Text>
      )}
    </View>
  )
}

function Card({ email, open, onClose }: { email: Email; open?: boolean; onClose?: () => void }) {
  const { theme } = useUnistyles()
  return (
    <View style={[styles.layer, styles.card]}>
      <View style={styles.header}>
        <Text style={[styles.muted, styles.from]} numberOfLines={1}>
          {email.from}
        </Text>
        {open && email.unsubscribe && (
          <Pressable onPress={() => Linking.openURL(email.unsubscribe!)}>
            <Text style={styles.muted}>unsubscribe</Text>
          </Pressable>
        )}
        {open && (
          <Pressable onPress={onClose}>
            <Text style={styles.muted}>close</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.subject} numberOfLines={open ? undefined : 3}>
        {email.subject}
      </Text>
      {email.html ? (
        <View style={styles.email} pointerEvents={open ? 'auto' : 'none'}>
          <EmailView
            html={email.html}
            fade={open ? null : theme.colors.card}
            dom={{ scrollEnabled: false, onOpenWindow: (e) => Linking.openURL(e.nativeEvent.targetUrl) }}
          />
        </View>
      ) : (
        <Text style={styles.body}>{email.text}</Text>
      )}
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
  wide: { maxWidth: 800 },
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
  header: { flexDirection: 'row', gap: theme.gap(4) },
  from: { flex: 1 },
  subject: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  email: { flex: 1, marginHorizontal: -theme.gap(5), marginBottom: -theme.gap(5) },
  body: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  muted: { fontSize: 14, color: theme.colors.muted },
  bar: { flexDirection: 'row', gap: theme.gap(3) },
  button: {
    paddingVertical: theme.gap(2),
    paddingHorizontal: theme.gap(5),
    borderRadius: theme.gap(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: { fontSize: 15, color: theme.colors.text },
}))
