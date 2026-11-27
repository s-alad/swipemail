import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import * as Haptics from 'expo-haptics'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, {
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { parseResponse, type InferRequestType, type InferResponseType } from 'hono/client'
import { client as api } from './auth'
import EmailView from './email-view'

type Email = InferResponseType<typeof api.mail.$get>[number]
type Action = InferRequestType<(typeof api.mail)[':id'][':action']['$post']>['param']['action']

const zones = [
  { action: 'keep', color: '#22c55e', at: { right: 16, top: '45%' } },
  null,
  null,
  { action: 'unsubscribe', color: '#f59e0b', at: { left: 16, bottom: 96 } },
  { action: 'delete', color: '#ef4444', at: { left: 16, top: '45%' } },
  null,
  { action: 'archive', color: '#3b82f6', at: { top: 64, alignSelf: 'center' } },
  null,
] as const

export function Deck() {
  const client = useQueryClient()
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const zone = useSharedValue(-1)
  const [open, setOpen] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState<string[]>([])

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

  const unsubscribe = useMutation({
    mutationFn: (email: Email) =>
      parseResponse(api.mail[':id'][':action'].$post({ param: { id: email.id, action: 'unsubscribe' } })),
    onSuccess: ({ open }, email) => {
      setUnsubscribed((ids) => [...ids, email.id])
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (open) Linking.openURL(open)
    },
    onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  })

  const [top, next] = emails
  const stamped = !!top && unsubscribed.includes(top.id)
  const reachable = (i: number) => {
    'worklet'
    return !!zones[i] && (!open || i % 4 === 0) && (i !== 3 || (!!top?.unsubscribe && !stamped))
  }

  const swipe = (action: Exclude<Action, 'unsubscribe'>) => {
    mutation.mutate({ email: emails[0], action })
    x.value = 0
    y.value = 0
    setOpen(false)
  }

  const fling = (action: Exclude<Action, 'unsubscribe'>) => {
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
      const i = (Math.round(Math.atan2(y.value, x.value) / (Math.PI / 4)) + 8) % 8
      const next = Math.hypot(x.value, y.value) > 100 && reachable(i) ? i : -1
      if (next === zone.value) return
      zone.value = next
      if (next >= 0) scheduleOnRN(Haptics.selectionAsync)
    },
    onDeactivate: () => {
      const action = zones[zone.value]?.action
      zone.value = -1
      if (action === 'unsubscribe') scheduleOnRN(unsubscribe.mutate, top)
      else if (action) {
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Heavy)
        return fling(action)
      }
      x.value = withSpring(0)
      y.value = withSpring(0)
    },
  })

  const tap = useTapGesture({ enabled: !open, runOnJS: true, onActivate: () => setOpen(true) })
  const gesture = useCompetingGestures(pan, tap)

  const moving = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${x.value / 20}deg` },
      { scale: withSpring(zone.value >= 0 ? 0.94 : 1) },
    ],
  }))

  const tint = useAnimatedStyle(() => ({
    backgroundColor: zones[zone.value]?.color ?? 'transparent',
    opacity: Math.min(Math.hypot(x.value, y.value) / 300, 0.45),
  }))

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.tint, tint]} pointerEvents="none" />
      <View style={[styles.stack, open && styles.wide]}>
        {next && !open && <Card email={next} />}
        {top && (
          <GestureDetector gesture={gesture}>
            <Animated.View key={top.id} layout={LinearTransition} style={[styles.layer, moving]}>
              <Card
                email={top}
                open={open}
                stamped={stamped}
                onClose={() => setOpen(false)}
                onUnsubscribe={() => unsubscribe.mutate(top)}
              />
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
        <Text style={styles.muted}>{'← delete   ↑ archive   keep →   ↙ unsubscribe'}</Text>
      )}
      {zones.map((z, i) => z && <Label key={z.action} index={i} zone={zone} />)}
    </View>
  )
}

function Label({ index, zone }: { index: number; zone: SharedValue<number> }) {
  const { action, color, at } = zones[index]!
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(zone.value === index ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withSpring(zone.value === index ? 1.15 : 0.6) }],
  }))
  return (
    <Animated.Text style={[styles.zone, at, { color }, style]} pointerEvents="none">
      {action}
    </Animated.Text>
  )
}

type CardProps = { email: Email; open?: boolean; stamped?: boolean; onClose?: () => void; onUnsubscribe?: () => void }

function Card({ email, open, stamped, onClose, onUnsubscribe }: CardProps) {
  const { theme } = useUnistyles()
  return (
    <View style={[styles.layer, styles.card]}>
      <View style={styles.header}>
        <Text style={[styles.muted, styles.from]} numberOfLines={1}>
          {email.from}
        </Text>
        {open && email.unsubscribe && !stamped && (
          <Pressable onPress={onUnsubscribe}>
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
      {stamped && <Text style={styles.stamp}>unsubscribed</Text>}
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
  tint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  zone: { position: 'absolute', fontSize: 32, fontWeight: '900', textTransform: 'uppercase' },
  stamp: {
    position: 'absolute',
    top: theme.gap(20),
    right: theme.gap(5),
    padding: theme.gap(2),
    borderWidth: 3,
    borderRadius: theme.gap(2),
    borderColor: '#f59e0b',
    color: '#f59e0b',
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
    transform: [{ rotate: '-12deg' }],
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
