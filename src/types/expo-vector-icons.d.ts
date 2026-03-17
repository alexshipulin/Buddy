declare module '@expo/vector-icons' {
  import * as React from 'react';
  import { TextProps } from 'react-native';

  export type ExpoIconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
  };

  export const MaterialIcons: React.ComponentType<ExpoIconProps>;
}
