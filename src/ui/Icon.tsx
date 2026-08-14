import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

type IconProps = {
  name: AndroidSymbol | string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Thin wrapper over `SymbolView` that pins the platform to Android's Material
 * Symbols, so screens don't repeat the `{ android: … }` shape everywhere.
 */
export function Icon({ name, size = 24, color, style }: IconProps) {
  return (
    <SymbolView
      name={{ android: name as AndroidSymbol }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}
