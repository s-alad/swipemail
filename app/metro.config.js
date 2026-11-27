const { getDefaultConfig } = require('expo/metro-config')
const { withUnistylesConfig } = require('react-native-unistyles/metro')

module.exports = withUnistylesConfig(getDefaultConfig(__dirname))
