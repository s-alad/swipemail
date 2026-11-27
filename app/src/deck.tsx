import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, Text, View } from 'react-native'
import { call } from './auth'

type Email = { id: string, from: string, subject: string, text: string }
type Action = 'keep' | 'delete' | 'archive'

export function Deck() {
  const [emails, setEmails] = useState<Email[]>([])
  const position = useRef(new Animated.ValueXY()).current

  const load = () => call('/mail').then((r) => r.json()).then(setEmails)
  useEffect(() => { load() }, [])

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, { dx, dy }) => {
      const action = pick(dx, dy)
      if (!action) return Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
      const [top, ...rest] = emails
      call(`/mail/${top.id}/${action}`, { method: 'POST' })
      position.setValue({ x: 0, y: 0 })
      setEmails(rest)
      if (!rest.length) load()
    },
  }), [emails])

  const top = emails[0]
  if (!top) return <Text style={{ margin: 40 }}>inbox zero</Text>
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Animated.View
        {...responder.panHandlers}
        style={{ transform: position.getTranslateTransform(), padding: 20, borderRadius: 16, backgroundColor: '#fff', elevation: 4, shadowOpacity: 0.15, shadowRadius: 12 }}
      >
        <Text style={{ color: '#666' }}>{top.from}</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', marginVertical: 8 }}>{top.subject}</Text>
        <Text numberOfLines={16}>{top.text}</Text>
      </Animated.View>
    </View>
  )
}

function pick(dx: number, dy: number): Action | null {
  if (dy < -120 && Math.abs(dy) > Math.abs(dx)) return 'archive'
  if (dx > 120) return 'keep'
  if (dx < -120) return 'delete'
  return null
}
