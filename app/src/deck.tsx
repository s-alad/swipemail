import { useLayoutEffect, useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import * as Linking from 'expo-linking'
import * as Haptics from 'expo-haptics'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
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
  { action: 'keep', color: '#00c46a', hint: 'keep →' },
  null,
  null,
  { action: 'unsubscribe', color: '#ffb300', hint: '↙ unsubscribe' },
  { action: 'delete', color: '#ff1f3d', hint: '← delete' },
  null,
  { action: 'archive', color: '#1e6bff', hint: '↑ archive' },
  null,
] as const

const pull = { mass: 1, stiffness: 300, damping: 20 }
const bounce = { mass: 1, stiffness: 200, damping: 15 }

const sector = (x: number, y: number) => {
  'worklet'
  return (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8
}

export function Deck() {
  const client = useQueryClient()
  const { width, height } = useWindowDimensions()
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const ox = useSharedValue(0)
  const oy = useSharedValue(0)
  const hover = useSharedValue(-1)
  const zone = useSharedValue(-1)
  const flash = useSharedValue(-1)
  const glow = useSharedValue(0)
  const reach = useDerivedValue(() => Math.min(Math.hypot(x.value, y.value) / 100, 1))
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

  useLayoutEffect(() => {
    x.value = 0
    y.value = 0
    ox.value = 0
    oy.value = 0
    hover.value = -1
    zone.value = -1
  }, [top?.id])

  const swipe = (action: Exclude<Action, 'unsubscribe'>) => {
    mutation.mutate({ email: emails[0], action })
    setOpen(false)
  }

  const splash = (i: number) => {
    'worklet'
    flash.value = i
    glow.value = withSequence(withTiming(0.7, { duration: 50 }), withTiming(0, { duration: 400 }))
  }

  const fling = (i: 0 | 4 | 6) => {
    'worklet'
    const out = { duration: 260, easing: Easing.out(Easing.cubic) }
    const angle = (i * Math.PI) / 4
    splash(i)
    hover.value = i
    zone.value = i
    x.value = withTiming(x.value + Math.round(Math.cos(angle)) * width * 1.4, out, () =>
      scheduleOnRN(swipe, zones[i].action),
    )
    y.value = withTiming(y.value + Math.round(Math.sin(angle)) * height, out)
  }

  const pan = usePanGesture({
    activeOffsetX: open ? [-20, 20] : undefined,
    failOffsetY: open ? [-20, 20] : undefined,
    onUpdate: (e) => {
      x.value = e.translationX
      y.value = e.translationY
      const i = sector(x.value, y.value)
      const angle = (i * Math.PI) / 4
      const along = (x.value * Math.cos(angle) + y.value * Math.sin(angle)) * 0.75 + 50
      hover.value = reachable(i) ? i : -1
      const next = Math.hypot(x.value, y.value) > (zone.value === i ? 70 : 100) ? hover.value : -1
      ox.value = withSpring(next < 0 ? 0 : Math.cos(angle) * along - x.value * 0.75, pull)
      oy.value = withSpring(next < 0 ? 0 : Math.sin(angle) * along - y.value * 0.75, pull)
      if (next === zone.value) return
      zone.value = next
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle[next < 0 ? 'Light' : 'Medium'])
    },
    onDeactivate: (e) => {
      const flick = sector(e.velocityX, e.velocityY)
      const fast = Math.hypot(e.velocityX, e.velocityY) > 800 && hover.value === flick && reach.value > 0.3
      const i = zone.value >= 0 ? zone.value : fast ? flick : -1
      if (i >= 0) scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Heavy)
      if (i === 0 || i === 4 || i === 6) return fling(i)
      if (i === 3) {
        splash(i)
        scheduleOnRN(unsubscribe.mutate, top)
      }
      hover.value = -1
      zone.value = -1
      x.value = withSpring(0, { ...bounce, velocity: e.velocityX })
      y.value = withSpring(0, { ...bounce, velocity: e.velocityY })
      ox.value = withSpring(0, bounce)
      oy.value = withSpring(0, bounce)
    },
  })

  const tap = useTapGesture({ enabled: !open, runOnJS: true, onActivate: () => setOpen(true) })
  const gesture = useCompetingGestures(pan, tap)

  const moving = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + ox.value },
      { translateY: y.value + oy.value },
      { rotate: `${(x.value + ox.value) / 18}deg` },
      { scale: 1 - Math.min(Math.hypot(x.value, y.value) / width, 1) * 0.2 },
    ],
  }))

  const under = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + reach.value * 0.08 }] }))

  const paint = useAnimatedStyle(() => ({
    backgroundColor: zones[hover.value]?.color ?? 'transparent',
    opacity: reach.value * 0.5 + (zone.value < 0 ? 0 : 0.4),
  }))

  const burst = useAnimatedStyle(() => ({
    backgroundColor: zones[flash.value]?.color ?? 'transparent',
    opacity: glow.value,
  }))

  return (
    <View style={styles.screen}>
      <View style={[styles.stack, open && styles.wide]}>
        {next && !open && (
          <Animated.View style={[styles.layer, under]}>
            <Card email={next} />
          </Animated.View>
        )}
        {zones.map((z, i) => z && <Blob key={z.action} index={i} hover={hover} zone={zone} reach={reach} />)}
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
              <Animated.View style={[styles.layer, styles.paint, paint]} pointerEvents="none">
                {zones.map((z, i) => z && <Label key={z.action} index={i} hover={hover} zone={zone} />)}
              </Animated.View>
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
      <View style={styles.bar}>
        {open
          ? ([4, 6, 0] as const).map((i) => (
              <Pressable key={i} style={[styles.button, { backgroundColor: zones[i].color }]} onPress={() => fling(i)}>
                <Text style={styles.label}>{zones[i].action}</Text>
              </Pressable>
            ))
          : ([4, 6, 0, 3] as const).map((i) => (
              <Text key={i} style={[styles.hint, { color: zones[i].color }]}>
                {zones[i].hint}
              </Text>
            ))}
      </View>
      <Animated.View style={[styles.layer, burst]} pointerEvents="none" />
    </View>
  )
}

type ZoneProps = { index: number; hover: SharedValue<number>; zone: SharedValue<number> }

function Blob({ index, hover, zone, reach }: ZoneProps & { reach: SharedValue<number> }) {
  const { width } = useWindowDimensions()
  const angle = (index * Math.PI) / 4
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(
          zone.value === index
            ? 1.1
            : hover.value === index
              ? 0.25 + reach.value * 0.6
              : hover.value < 0
                ? 0.25
                : 0.25 - reach.value * 0.25,
          pull,
        ),
      },
    ],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: width * 1.5,
          margin: -width * 0.75,
          left: `${50 + Math.round(Math.cos(angle)) * 50}%`,
          top: `${50 + Math.round(Math.sin(angle)) * 50}%`,
          backgroundColor: zones[index]!.color,
        },
        style,
      ]}
    />
  )
}

function Label({ index, hover, zone }: ZoneProps) {
  const style = useAnimatedStyle(() => ({
    opacity: hover.value === index ? 1 : 0,
    transform: [{ scale: withSpring(zone.value === index ? 1 : 0.7, pull) }],
  }))
  return <Animated.Text style={[styles.zone, style]}>{zones[index]!.action}</Animated.Text>
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
  blob: { position: 'absolute', aspectRatio: 1, borderRadius: 9999 },
  paint: { justifyContent: 'center', alignItems: 'center', borderRadius: theme.gap(6) },
  zone: { position: 'absolute', fontSize: 38, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },
  stamp: {
    position: 'absolute',
    top: theme.gap(20),
    right: theme.gap(5),
    padding: theme.gap(2),
    borderWidth: 3,
    borderRadius: theme.gap(2),
    borderColor: '#ffb300',
    color: '#ffb300',
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
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(3) },
  hint: { fontSize: 14, fontWeight: '700' },
  button: { paddingVertical: theme.gap(2), paddingHorizontal: theme.gap(5), borderRadius: theme.gap(4) },
  label: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', color: '#ffffff' },
}))
