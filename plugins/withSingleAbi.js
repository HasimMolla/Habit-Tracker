const { withGradleProperties } = require('expo/config-plugins');

/**
 * Restricts the native build to 64-bit ARM.
 *
 * By default React Native compiles its C++ for four architectures
 * (armeabi-v7a, arm64-v8a, x86, x86_64). Three of those exist only for old
 * 32-bit handsets and for emulators on Intel machines, and each one roughly
 * quarters the build time, the local build output, and the size of the APK.
 *
 * Every Android phone shipped since about 2019 is arm64-v8a, as is the
 * Apple-silicon emulator, so this is the right default here. Restore the full
 * list before publishing to the Play Store if you need to support older
 * devices — or ship an app bundle, which splits per architecture anyway.
 */
const ABIS = 'arm64-v8a';

module.exports = function withSingleAbi(config) {
  return withGradleProperties(config, (gradleConfig) => {
    const properties = gradleConfig.modResults;

    const existing = properties.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );

    if (existing) {
      existing.value = ABIS;
    } else {
      properties.push({ type: 'property', key: 'reactNativeArchitectures', value: ABIS });
    }

    return gradleConfig;
  });
};
