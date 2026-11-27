import { Button, View } from 'react-native'
import * as Linking from 'expo-linking'
import { auth } from '../auth'
import { Deck } from '../deck'

export default function Index() {
  const { data, isPending } = auth.useSession()
  if (isPending) return null
  if (data) return <Deck />
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Button title="sign in with google" onPress={() => auth.signIn.social({ provider: 'google', callbackURL: Linking.createURL('/') })} />
    </View>
  )
}
