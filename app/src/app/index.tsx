import { Pressable, Text, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import * as Linking from 'expo-linking'
import { auth } from '../auth'
import { Deck } from '../deck'

export default function Index() {
  const { data, isPending } = auth.useSession()
  if (isPending) return <View style={styles.screen} />
  if (data) return <Deck />
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>swipemail</Text>
      <Text style={styles.subtitle}>clean your inbox one swipe at a time</Text>
      <Pressable
        style={styles.button}
        onPress={() => auth.signIn.social({ provider: 'google', callbackURL: Linking.createURL('/') })}
      >
        <Text style={styles.label}>continue with google</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.gap(3),
    padding: theme.gap(6),
    paddingTop: rt.insets.top,
    backgroundColor: theme.colors.background,
  },
  title: { fontSize: 40, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 16, color: theme.colors.muted, marginBottom: theme.gap(6) },
  button: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: theme.gap(4),
    borderRadius: theme.gap(4),
    backgroundColor: theme.colors.accent,
  },
  label: { fontSize: 16, fontWeight: '600', color: theme.colors.accenttext },
}))
