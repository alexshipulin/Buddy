# UI Full Interface Dump
Generated for handoff to external agent.
Includes design tokens, navigation, reusable UI components, all screens, mocks, and QA docs.

## FILE: `src/design/tokens.ts`
```tsx
/** Single source of truth for UI tokens. Use via design/theme and design/spec. */

export const colors = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0B0F1A',
  muted: '#6B7280',
  border: '#E6EAF0',
  primary: '#0B0F1A',
  primaryText: '#FFFFFF',
  disabledBg: '#D1D5DB',
  disabledText: '#FFFFFF',
  accent: '#7C3AED',
  accentSoft: '#EDE9FE',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
} as const;

/** 8pt grid; multiples of 4. Prefer 8 for gaps. */
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

/** Semantic spacing scale (xs → 3xl) for components. */
export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const radius = {
  card: 24,
  sheet: 32,
  input: 14,
  chip: 16,
  pill: 18,
  button: 28,
} as const;

/** Semantic radius scale (iOS HIG) */
export const radiusScale = {
  small: 12,
  medium: 16,
  large: 20,
  xl: 24,
} as const;

export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
} as const;

/**
 * iOS text styles mapping (HIG). Exact line heights per Figma/Apple HIG.
 * Do not hardcode fontFamily (system font = SF Pro on iOS).
 */
export const typographyTokens = {
  // Canonical iOS styles (fontSize / lineHeight)
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const },

  // Aliases (screens/components)
  hero: { fontSize: 40, lineHeight: 44, fontWeight: '800' as const },
  h1: { fontSize: 34, lineHeight: 41, fontWeight: '800' as const },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h3: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const },
  bodySemibold: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;
```

## FILE: `src/design/theme.ts`
```tsx
import { colors, radius, spacing, spacingScale, cardShadow, typographyTokens } from './tokens';

export const appTheme = {
  colors: {
    ...colors,
    background: colors.bg,
    textPrimary: colors.ink,
    textSecondary: colors.muted,
    primary: colors.primary,
    primaryButton: colors.primary,
    secondaryButton: colors.border,
    accent: colors.accent,
    accentSoft: colors.accentSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    warning: colors.warning,
    warningSoft: colors.warningSoft,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
    border: colors.border,
    progressTrack: colors.border,
  },
  spacing: {
    ...spacing,
    xs: spacingScale.xs,
    sm: spacingScale.sm,
    md: spacingScale.md,
    lg: spacingScale.lg,
    xl: spacingScale.xl,
    '2xl': spacingScale['2xl'],
    '3xl': spacingScale['3xl'],
  },
  radius: {
    ...radius,
    sm: radius.input,
    md: radius.chip,
    lg: radius.card,
    xl: radius.card,
    pill: radius.pill,
  },
  shadows: { card: { ...cardShadow, elevation: 4 } },
  typography: typographyTokens,
};

export type AppTheme = typeof appTheme;
```

## FILE: `src/design/spec.ts`
```tsx
/**
 * Authoritative UI spec used by components and screens.
 * All spacing, typography, colors, and component dimensions derive from here.
 */
import { colors, spacing, radius, cardShadow, typographyTokens } from './tokens';

export const spec = {
  colors,
  spacing,
  radius,
  cardShadow,

  /** Semantic typography (use with Text style). Default allowFontScaling, maxFontSizeMultiplier 1.2 */
  typography: typographyTokens,

  /** Layout */
  screenPaddingHorizontal: spacing[20],
  screenPaddingBottomOffset: spacing[16],
  headerContentHeight: 56,
  headerPaddingTopOffset: spacing[8],
  headerPillHeight: 36,
  headerPillRadius: 18,
  headerPillPaddingX: 14,
  headerPillFontSize: 15,

  /** Buttons */
  primaryButtonHeight: 56,
  primaryButtonRadius: radius.button,
  primaryButtonPaddingHorizontal: spacing[16],

  /** Chips */
  chipHeight: 32,
  chipRadius: radius.chip,
  chipPaddingX: 12,
  chipSmallHeight: 28,
  chipSmallRadius: 14,
  chipSmallPaddingX: 10,

  /** Cards */
  cardRadius: radius.card,
  cardPadding: spacing[20],
  cardBorderWidth: 1,

  /** Inputs */
  inputHeight: 52,
  inputRadius: radius.input,
  inputPaddingX: 16,

  /** Bottom sheet (Welcome) */
  sheetRadius: 32,
  sheetPaddingTop: 28,
  sheetPaddingHorizontal: spacing[20],

  /** Step indicator */
  stepDotSize: 8,
  stepActiveWidth: 22,
  stepActiveHeight: 8,
  stepGap: 8,
  stepMarginTop: 16,
  stepMarginBottom: 20,

  /** Touch targets */
  minTouchTarget: 44,
} as const;

export type Spec = typeof spec;

export const fontScaleMax = 1.2;
```

## FILE: `src/app/navigation/AppNavigator.tsx`
```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { appTheme } from '../../design/theme';
import { ChatScreen } from '../../screens/ChatScreen';
import { DietaryProfileScreen } from '../../screens/DietaryProfileScreen';
import { GoalSelectionScreen } from '../../screens/GoalSelectionScreen';
import { HomeScreen } from '../../screens/HomeScreen';
import { MenuResultsScreen } from '../../screens/MenuResultsScreen';
import { PaywallScreen } from '../../screens/PaywallScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { ScanMenuScreen } from '../../screens/ScanMenuScreen';
import { SignInNudgeScreen } from '../../screens/SignInNudgeScreen';
import { TrackMealScreen } from '../../screens/TrackMealScreen';
import { WelcomeScreen } from '../../screens/WelcomeScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: appTheme.colors.background },
        headerShadowVisible: false,
        headerTintColor: appTheme.colors.textPrimary,
        contentStyle: { backgroundColor: appTheme.colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="DietaryProfile" component={DietaryProfileScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ScanMenu" component={ScanMenuScreen} />
      <Stack.Screen name="MenuResults" component={MenuResultsScreen} />
      <Stack.Screen name="TrackMeal" component={TrackMealScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SignInNudge" component={SignInNudgeScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
```

## FILE: `src/app/navigation/types.ts`
```tsx
export type RootStackParamList = {
  Welcome: undefined;
  GoalSelection: undefined;
  DietaryProfile: undefined;
  Home: undefined;
  ScanMenu: undefined;
  MenuResults: { resultId?: string; paywallAfterOpen?: boolean; trialDaysLeft?: number } | undefined;
  TrackMeal: { mealId?: string; readOnly?: boolean } | undefined;
  Chat: { resultId?: string; systemMessage?: string } | undefined;
  Paywall: { trialDaysLeft?: number; source?: 'first_result' | 'limit' | 'chat' } | undefined;
  SignInNudge: { source?: 'auto' | 'manual' } | undefined;
  Profile: { section?: 'baseParams' } | undefined;
};
```

## FILE: `src/components/AppScreen.tsx`
```tsx
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = ViewProps & {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  background?: 'default' | 'surface';
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  respectInsets?: boolean;
  dismissKeyboardOnTouch?: boolean;
};

export function AppScreen({
  children,
  style,
  scroll = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = 'handled',
  background = 'default',
  contentStyle,
  padded = true,
  respectInsets = true,
  dismissKeyboardOnTouch = false,
  ...rest
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const topInset = respectInsets ? insets.top : 0;
  const bottomInset = respectInsets ? insets.bottom : 0;
  const paddingStyle: ViewStyle = padded
    ? {
        paddingHorizontal: spec.screenPaddingHorizontal,
        paddingBottom: bottomInset + spec.screenPaddingBottomOffset,
      }
    : { paddingBottom: bottomInset };
  const backgroundColor = background === 'surface' ? appTheme.colors.surface : appTheme.colors.background;

  const containerContent = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
      style={styles.flex}
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, paddingStyle, contentStyle]} {...rest}>
      {children}
    </View>
  );

  const keyboardWrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {containerContent}
    </KeyboardAvoidingView>
  ) : (
    containerContent
  );

  const wrappedContent = dismissKeyboardOnTouch ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {keyboardWrapped}
    </TouchableWithoutFeedback>
  ) : (
    keyboardWrapped
  );

  return <View style={[styles.root, { backgroundColor }, style]}>{wrappedContent}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
```

## FILE: `src/components/ScreenHeader.tsx`
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';

type Props = {
  /** Center title (no page labels from React Navigation) */
  title: string;
  /** Left: back button (if onBack) or pill label e.g. "Welcome", "Goal", "Home" */
  leftLabel?: string;
  onBack?: () => void;
  /** Right: e.g. "Skip" pill or custom node */
  rightLabel?: string;
  onRightPress?: () => void;
  rightAction?: React.ReactNode;
};

export function ScreenHeader({ title, leftLabel, onBack, rightLabel, onRightPress, rightAction }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + spec.headerPaddingTopOffset;

  return (
    <View style={[styles.row, { paddingTop, paddingHorizontal: spec.screenPaddingHorizontal }]}>
      <View style={styles.side}>
        {onBack != null ? (
          <Pressable
            onPress={onBack}
            style={styles.pill}
            hitSlop={8}
          >
            <Text style={styles.pillText}>‹</Text>
          </Pressable>
        ) : leftLabel ? (
          <View style={styles.pill}>
            <Text style={styles.pillText} numberOfLines={1}>{leftLabel}</Text>
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.title} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <View style={styles.side}>
        {rightAction != null ? (
          rightAction
        ) : rightLabel != null ? (
          <Pressable onPress={onRightPress} style={styles.pill} hitSlop={8}>
            <Text style={styles.pillText} numberOfLines={1}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: spec.headerContentHeight,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  side: { minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: spec.minTouchTarget, height: spec.minTouchTarget },
  pill: {
    minHeight: spec.headerPillHeight,
    minWidth: spec.minTouchTarget,
    maxHeight: spec.headerPillHeight,
    borderRadius: spec.headerPillRadius,
    paddingHorizontal: spec.headerPillPaddingX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  pillText: {
    fontSize: spec.headerPillFontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: appTheme.typography.bodySemibold.fontSize,
    lineHeight: appTheme.typography.bodySemibold.lineHeight,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.textPrimary,
  },
});
```

## FILE: `src/components/PrimaryButton.tsx`
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean };

export function PrimaryButton({ title, onPress, style, disabled, loading = false }: Props): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && !isDisabled ? styles.pressed : null, isDisabled ? styles.disabled : null]}
      disabled={isDisabled}
      hitSlop={Math.max(0, (spec.minTouchTarget - spec.primaryButtonHeight) / 2)}
    >
      {loading ? <ActivityIndicator color={appTheme.colors.primaryText} size="small" /> : <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.primaryButton,
    borderRadius: spec.primaryButtonRadius,
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
    minHeight: spec.primaryButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    ...appTheme.shadows.card,
  },
  text: {
    color: appTheme.colors.primaryText,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    fontSize: appTheme.typography.bodySemibold.fontSize,
  },
  pressed: { opacity: 0.92 },
  disabled: { backgroundColor: appTheme.colors.disabledBg, opacity: 1, shadowOpacity: 0, elevation: 0 },
});
```

## FILE: `src/components/SecondaryButton.tsx`
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = { title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean };

export function SecondaryButton({ title, onPress, style, disabled, loading = false }: Props): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={isDisabled} hitSlop={Math.max(0, (spec.minTouchTarget - spec.primaryButtonHeight) / 2)} style={({ pressed }) => [styles.button, style, pressed && !isDisabled ? styles.pressed : null, isDisabled ? styles.disabled : null]}>
      {loading ? <ActivityIndicator color={appTheme.colors.textSecondary} size="small" /> : <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: spec.primaryButtonRadius,
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
    minHeight: spec.primaryButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: appTheme.colors.textSecondary, fontWeight: appTheme.typography.bodySemibold.fontWeight, fontSize: appTheme.typography.bodySemibold.fontSize },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
```

## FILE: `src/components/Card.tsx`
```tsx
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { appTheme } from '../design/theme';

type Props = ViewProps & { children: React.ReactNode };

export function Card({ children, style, ...rest }: Props): React.JSX.Element {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: appTheme.radius.xl,
    padding: appTheme.spacing.md,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    ...appTheme.shadows.card,
  },
});
```

## FILE: `src/components/Chip.tsx`
```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';

type Props = { label: string; selected?: boolean };

/** Legacy Chip (no onPress). Prefer ui/components/Chip for tappable chips. */
export function Chip({ label, selected = false }: Props): React.JSX.Element {
  return (
    <View style={[styles.chip, selected && styles.selectedChip]}>
      <Text style={[styles.text, selected && styles.selectedText]} maxFontSizeMultiplier={1.2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: spec.chipHeight,
    borderRadius: spec.chipRadius,
    paddingHorizontal: spec.chipPaddingX,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.footnote.fontSize, fontWeight: '600' },
  selectedChip: { backgroundColor: appTheme.colors.ink, borderColor: appTheme.colors.ink },
  selectedText: { color: appTheme.colors.primaryText },
});
```

## FILE: `src/ui/components/Screen.tsx`
```tsx
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  padded?: boolean;
  /** Max content width on wide screens (default: 460). Set to 0 to disable. */
  maxContentWidth?: number;
  /** Padding bottom offset when BottomCTA is present */
  bottomCTAPadding?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  maxContentWidth = 460,
  bottomCTAPadding = 0,
  contentContainerStyle,
  style,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const basePaddingBottom = bottomCTAPadding > 0 ? bottomCTAPadding : insets.bottom + spec.screenPaddingBottomOffset;
  const containerPadding: ViewStyle = padded
    ? {
        paddingHorizontal: spec.screenPaddingHorizontal,
        paddingBottom: basePaddingBottom,
      }
    : { paddingBottom: basePaddingBottom };

  const contentWrapperStyle: ViewStyle = maxContentWidth > 0
    ? {
        maxWidth: maxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }
    : {};

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[containerPadding, styles.scrollGrow, contentWrapperStyle, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, containerPadding, contentWrapperStyle, contentContainerStyle]}>{children}</View>
  );

  if (!keyboardAvoiding) {
    return <View style={[styles.root, style]}>{content}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, style]}>
        {content}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  flex: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
});
```

## FILE: `src/ui/components/BottomCTA.tsx`
```tsx
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spec } from '../../design/spec';
import { appTheme } from '../../design/theme';

type Props = {
  children: React.ReactNode;
  /** Additional padding top (default: 16) */
  paddingTop?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fixed bottom CTA container with safe area support.
 * Use for primary actions that should be pinned to bottom (e.g., Continue, Save Changes).
 */
export function BottomCTA({ children, paddingTop, style }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const topPadding = paddingTop ?? spec.screenPaddingBottomOffset;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + spec.screenPaddingBottomOffset,
          paddingTop: topPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: appTheme.colors.background,
    paddingHorizontal: spec.screenPaddingHorizontal,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
});
```

## FILE: `src/ui/components/AppHeader.tsx`
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type Props = {
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
};

export function AppHeader({ title, onBack, rightAction }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </Text>
      <View style={styles.side}>{rightAction ?? <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', marginBottom: uiTheme.spacing.sm },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 24, height: 24 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFFCC',
  },
  backGlyph: { color: uiTheme.colors.textPrimary, fontSize: 28, lineHeight: 28, marginTop: -2 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: uiTheme.colors.textPrimary,
  },
});
```

## FILE: `src/ui/components/AppIcon.tsx`
```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type IconName = 'scan' | 'meal' | 'profile' | 'diet' | 'sparkles' | 'camera';

type Props = {
  name: IconName;
  size?: number;
};

export function AppIcon({ name, size = 20 }: Props): React.JSX.Element {
  if (name === 'scan') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#F1E9FF' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#7C3AED' }]}>⌁</Text>
      </View>
    );
  }
  if (name === 'meal') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#FFF2E8' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#EA580C' }]}>⋈</Text>
      </View>
    );
  }
  if (name === 'profile') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EEF1F6' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#475569' }]}>◉</Text>
      </View>
    );
  }
  if (name === 'diet') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EAFBF2' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#16A34A' }]}>✿</Text>
      </View>
    );
  }
  if (name === 'camera') {
    return (
      <View style={[styles.wrap, { backgroundColor: '#EEF1F6' }]}>
        <Text style={[styles.glyph, { fontSize: size, color: '#94A3B8' }]}>◌</Text>
      </View>
    );
  }
  return (
    <View style={[styles.wrap, { backgroundColor: '#F3EBFF' }]}>
      <Text style={[styles.glyph, { fontSize: size, color: uiTheme.colors.accent }]}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontWeight: '700' },
});
```

## FILE: `src/ui/components/Card.tsx`
```tsx
import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style, ...rest }: Props): React.JSX.Element {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
    padding: spec.cardPadding,
    ...appTheme.shadows.card,
  },
});
```

## FILE: `src/ui/components/Chip.tsx`
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Small variant: height 28, radius 14, caption font */
  small?: boolean;
};

export function Chip({ label, selected = false, onPress, small = false }: Props): React.JSX.Element {
  const height = small ? spec.chipSmallHeight : spec.chipHeight;
  const radius = small ? spec.chipSmallRadius : spec.chipRadius;
  const paddingX = small ? spec.chipSmallPaddingX : spec.chipPaddingX;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { height, borderRadius: radius, paddingHorizontal: paddingX },
        selected && styles.selected,
      ]}
    >
      <Text
        style={[small ? styles.textSmall : styles.text, selected && styles.selectedText]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: spec.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  selected: {
    backgroundColor: appTheme.colors.ink,
    borderColor: appTheme.colors.ink,
  },
  text: {
    fontSize: appTheme.typography.body.fontSize,
    fontWeight: appTheme.typography.body.fontWeight,
    color: appTheme.colors.muted,
  },
  textSmall: {
    fontSize: appTheme.typography.caption.fontSize,
    fontWeight: appTheme.typography.caption.fontWeight,
    color: appTheme.colors.muted,
  },
  selectedText: {
    color: appTheme.colors.primaryText,
    fontWeight: '600',
  },
});
```

## FILE: `src/ui/components/PrimaryButton.tsx`
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, disabled = false, loading = false, style }: Props): React.JSX.Element {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
      ]}
      hitSlop={Math.max(0, (spec.minTouchTarget - spec.primaryButtonHeight) / 2)}
    >
      {loading ? (
        <ActivityIndicator color={appTheme.colors.primaryText} />
      ) : (
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
    ...appTheme.shadows.card,
  },
  text: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    lineHeight: appTheme.typography.bodySemibold.lineHeight,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.primaryText,
  },
  pressed: { opacity: 0.92 },
  disabled: {
    backgroundColor: appTheme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
});
```

## FILE: `src/ui/components/SecondaryButton.tsx`
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({ title, onPress, disabled = false, loading = false, style }: Props): React.JSX.Element {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [styles.button, style, pressed && !blocked && styles.pressed, blocked && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={appTheme.colors.muted} /> : <Text style={styles.text} maxFontSizeMultiplier={1.2}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spec.primaryButtonPaddingHorizontal,
  },
  text: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: appTheme.typography.bodySemibold.fontWeight,
    color: appTheme.colors.textPrimary,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
});
```

## FILE: `src/ui/components/TextField.tsx`
```tsx
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, placeholderTextColor, ...rest }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      {label != null ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={placeholderTextColor ?? appTheme.colors.muted}
        maxFontSizeMultiplier={1.2}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: appTheme.typography.caption.fontSize,
    fontWeight: appTheme.typography.caption.fontWeight,
    color: appTheme.colors.muted,
  },
  input: {
    height: spec.inputHeight,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    paddingHorizontal: spec.inputPaddingX,
    backgroundColor: appTheme.colors.surface,
    fontSize: appTheme.typography.body.fontSize,
    lineHeight: appTheme.typography.body.lineHeight,
    color: appTheme.colors.textPrimary,
  },
});
```

## FILE: `src/ui/components/SelectField.tsx`
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function SelectField<T extends string>({ label, value, options, onChange }: Props<T>): React.JSX.Element {
  const currentIdx = options.findIndex((item) => item.value === value);
  const active = options[currentIdx]?.label ?? value;

  const cycle = (): void => {
    if (!options.length) return;
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % options.length;
    onChange(options[nextIdx].value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={cycle}>
        <Text style={styles.value} numberOfLines={1}>{active}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  label: {
    fontSize: appTheme.typography.caption.fontSize,
    color: appTheme.colors.muted,
  },
  field: {
    minHeight: spec.inputHeight,
    borderRadius: spec.inputRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: spec.inputPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    flex: 1,
    fontSize: appTheme.typography.body.fontSize,
    color: appTheme.colors.textPrimary,
    fontWeight: '500',
  },
  chevron: { color: appTheme.colors.muted, fontSize: 18, lineHeight: 18 },
});
```

## FILE: `src/ui/components/SegmentedControl.tsx`
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from '../theme';

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} style={[styles.item, active ? styles.itemActive : null]} onPress={() => onChange(option)}>
            <Text style={[styles.itemText, active ? styles.itemTextActive : null]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#F3F4F7',
    borderRadius: uiTheme.radius.pill,
    padding: 3,
    flexDirection: 'row',
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: 36,
    borderRadius: uiTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: { backgroundColor: uiTheme.colors.primary },
  itemText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  itemTextActive: { color: '#FFFFFF' },
});
```

## FILE: `src/ui/components/DesignQAOverlay.tsx`
```tsx
import React from 'react';
import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { appTheme } from '../../design/theme';
import { spec } from '../../design/spec';

type Props = {
  /** Reference image URI (local asset or remote) */
  referenceImageUri: string;
  /** Current opacity (0-100) */
  opacity: number;
  /** Callback when opacity changes */
  onOpacityChange: (opacity: number) => void;
  /** Callback to close */
  onClose: () => void;
  visible: boolean;
};

/**
 * Design QA overlay: shows reference image over current UI for pixel-perfect comparison.
 * Usage: Enable via dev gesture (e.g., 5 taps on title) or dev toggle.
 */
export function DesignQAOverlay({ referenceImageUri, opacity, onOpacityChange, onClose, visible }: Props): React.JSX.Element | null {
  const [sliderWidth, setSliderWidth] = React.useState(0);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.controls}>
          <Text style={styles.label}>Reference opacity: {opacity}%</Text>
          <View style={styles.sliderContainer}>
            <Pressable
              style={styles.sliderTrack}
              onLayout={(e: LayoutChangeEvent) => setSliderWidth(e.nativeEvent.layout.width)}
              onPress={(e) => {
                if (sliderWidth > 0) {
                  const newOpacity = Math.round((e.nativeEvent.locationX / sliderWidth) * 100);
                  onOpacityChange(Math.max(0, Math.min(100, newOpacity)));
                }
              }}
            >
              <View style={[styles.sliderFill, { width: `${opacity}%` }]} />
            </Pressable>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <Image
          source={{ uri: referenceImageUri }}
          style={[styles.referenceImage, { opacity: opacity / 100 }]}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controls: {
    position: 'absolute',
    top: 60,
    left: spec.screenPaddingHorizontal,
    right: spec.screenPaddingHorizontal,
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.radius.input,
    padding: spec.spacing[16],
    zIndex: 1000,
    gap: spec.spacing[12],
  },
  label: {
    fontSize: appTheme.typography.body.fontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: appTheme.colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: appTheme.colors.accent,
    borderRadius: 2,
  },
  closeBtn: {
    backgroundColor: appTheme.colors.accent,
    borderRadius: spec.radius.input,
    paddingVertical: spec.spacing[8],
    paddingHorizontal: spec.spacing[16],
    alignItems: 'center',
  },
  closeText: {
    color: appTheme.colors.primaryText,
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: '600',
  },
  referenceImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
```

## FILE: `src/ui/typography.ts`
```tsx
import { StyleSheet } from 'react-native';
import { appTheme } from '../design/theme';

const t = appTheme.typography;

export const typography = StyleSheet.create({
  hero: { ...t.hero, color: appTheme.colors.textPrimary },
  h1: { ...t.h1, color: appTheme.colors.textPrimary },
  h2: { ...t.h2, color: appTheme.colors.textPrimary },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: appTheme.colors.textPrimary },
  body: { ...t.body, color: appTheme.colors.textPrimary },
  bodySemibold: { ...t.bodySemibold, color: appTheme.colors.textPrimary },
  caption: { ...t.caption, color: appTheme.colors.textSecondary },
  overline: { ...t.overline, color: appTheme.colors.textSecondary, textTransform: 'uppercase' },
});
```

## FILE: `src/ui/theme.ts`
```tsx
/** Re-export design theme as single source of truth. */
export { appTheme as uiTheme } from '../design/theme';
export type { AppTheme as UiTheme } from '../design/theme';
```

## FILE: `src/screens/WelcomeScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { spec } from '../design/spec';
import { appTheme } from '../design/theme';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop' }}
        style={styles.hero}
      >
        <View style={[styles.topRow, { paddingTop: insets.top + spec.spacing[8] }]}>
          <Pressable
            style={styles.skipPill}
            onPress={() => navigation.navigate('GoalSelection')}
            hitSlop={8}
          >
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>Skip</Text>
          </Pressable>
        </View>
      </ImageBackground>
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: insets.bottom + spec.screenPaddingBottomOffset,
            paddingHorizontal: spec.sheetPaddingHorizontal,
            paddingTop: spec.sheetPaddingTop,
          },
        ]}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.textBlock}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>Pick the best dish fast</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
              Scan a menu and get simple picks that fit your goal and preferences.
            </Text>
          </View>
          <View style={styles.actionsBlock}>
            <PrimaryButton title="Get started" onPress={() => navigation.navigate('GoalSelection')} style={styles.cta} />
            <Pressable onPress={() => navigation.navigate('SignInNudge', { source: 'manual' })} style={styles.linkWrap}>
              <Text style={styles.link} maxFontSizeMultiplier={1.2}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  hero: { flex: 1, justifyContent: 'flex-start' },
  topRow: { paddingHorizontal: spec.screenPaddingHorizontal, alignItems: 'flex-end' },
  skipPill: {
    minHeight: spec.headerPillHeight,
    borderRadius: spec.headerPillRadius,
    paddingHorizontal: spec.headerPillPaddingX,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { color: appTheme.colors.primaryText, fontWeight: '600', fontSize: spec.headerPillFontSize },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: appTheme.colors.surface,
    borderTopLeftRadius: spec.sheetRadius,
    borderTopRightRadius: spec.sheetRadius,
    maxHeight: '60%',
    minHeight: 320,
  },
  bottomSheetContent: {
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spec.spacing[8],
  },
  title: {
    ...typography.hero,
    textAlign: 'center',
    marginBottom: spec.spacing[12],
  },
  subtitle: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  actionsBlock: {
    paddingTop: spec.spacing[24],
  },
  cta: { marginBottom: spec.spacing[16] },
  linkWrap: { alignItems: 'center', paddingVertical: spec.spacing[8] },
  link: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
});
```

## FILE: `src/screens/GoalSelectionScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Goal } from '../domain/models';
import { userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { BottomCTA } from '../ui/components/BottomCTA';
import { Screen } from '../ui/components/Screen';
import { AppIcon } from '../ui/components/AppIcon';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSelection'>;
type GoalCard = Goal | 'Eat healthier';
const goals: GoalCard[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

const BOTTOM_CTA_HEIGHT = 56 + spec.screenPaddingBottomOffset * 2 + 16; // button + padding + safe area estimate

export function GoalSelectionScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = React.useState<GoalCard | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - spec.screenPaddingHorizontal * 2 - spec.spacing[16]) / 2;

  const onContinue = async (): Promise<void> => {
    if (!selected) return;
    const mappedGoal: Goal = selected === 'Eat healthier' ? 'Maintain weight' : selected;
    await userRepo.saveUser({ goal: mappedGoal, dietaryPreferences: [], allergies: [] });
    navigation.navigate('DietaryProfile');
  };

  return (
    <Screen bottomCTAPadding={BOTTOM_CTA_HEIGHT}>
      <ScreenHeader leftLabel="Welcome" title="Goal" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.stepIndicator, { marginTop: spec.stepMarginTop, marginBottom: spec.stepMarginBottom }]}>
            <View style={styles.dot} />
            <View style={[styles.dotActive, { width: spec.stepActiveWidth, height: spec.stepActiveHeight }]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>Select your goal</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Buddy will tailor picks for you.</Text>
          <View style={styles.listGrid}>
            {goals.map((goal) => (
              <Pressable key={goal} onPress={() => setSelected(goal)} style={[styles.gridItem, { width: cardWidth }]}>
                <Card style={[styles.card, selected === goal && styles.cardSelected]}>
                  <View style={styles.cardTop}>
                    <View style={styles.goalIcon}>
                      <AppIcon name={goal === 'Gain muscle' ? 'meal' : goal === 'Maintain weight' ? 'sparkles' : goal === 'Eat healthier' ? 'profile' : 'diet'} />
                    </View>
                    <View style={selected === goal ? styles.radioChecked : styles.radio} />
                  </View>
                  <Text style={styles.goalText} maxFontSizeMultiplier={1.2}>{goal}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <BottomCTA>
        <PrimaryButton title="Continue" onPress={onContinue} disabled={!selected} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spec.spacing[24] },
  content: {
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spec.stepGap },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  title: { ...typography.h1, textAlign: 'center', marginTop: spec.spacing[16] },
  subtitle: { ...typography.body, color: appTheme.colors.muted, textAlign: 'center', marginTop: spec.spacing[8], marginBottom: spec.stepMarginBottom },
  listGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[16], justifyContent: 'space-between' },
  gridItem: { minWidth: 0 },
  card: { minHeight: 170, justifyContent: 'space-between', borderWidth: 1, borderColor: appTheme.colors.border },
  cardSelected: { borderColor: appTheme.colors.ink, borderWidth: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: appTheme.colors.border },
  radioChecked: { width: 24, height: 24, borderRadius: 12, backgroundColor: appTheme.colors.ink },
  goalText: { ...typography.h2 },
});
```

## FILE: `src/screens/DietaryProfileScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { Allergy, DietaryPreference } from '../domain/models';
import { userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const allergies: Allergy[] = ['Milk', 'Eggs', 'Fish', 'Crustacean shellfish (shrimp, crab, lobster)', 'Tree nuts (almonds, walnuts, cashews)', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Celery', 'Lupin', 'Molluscs (squid, mussels, snails)', 'Mustard', 'Sulphites'];
const DISLIKES_PRESET = ['Avocado', 'Mushrooms', 'Olives', 'Cilantro', 'Onions'];

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const [selectedPreferences, setSelectedPreferences] = React.useState<DietaryPreference[]>([]);
  const [selectedAllergies, setSelectedAllergies] = React.useState<Allergy[]>([]);
  const [selectedDislikes, setSelectedDislikes] = React.useState<string[]>([]);
  const [customDislikes, setCustomDislikes] = React.useState<string[]>([]);
  const [addOtherVisible, setAddOtherVisible] = React.useState(false);
  const [addOtherInput, setAddOtherInput] = React.useState('');

  const togglePref = (v: DietaryPreference): void => setSelectedPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleAllergy = (v: Allergy): void => setSelectedAllergies((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleDislike = (v: string): void => setSelectedDislikes((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const addCustomDislike = (): void => {
    const trimmed = addOtherInput.trim();
    if (trimmed && !customDislikes.includes(trimmed) && !DISLIKES_PRESET.includes(trimmed)) {
      setCustomDislikes((prev) => [...prev, trimmed]);
      setSelectedDislikes((prev) => [...prev, trimmed]);
      setAddOtherInput('');
      setAddOtherVisible(false);
    }
  };

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  const onSave = async (): Promise<void> => {
    const user = await userRepo.getUser();
    if (!user) return navigation.replace('GoalSelection');
    await userRepo.saveUser({ ...user, dietaryPreferences: selectedPreferences, allergies: selectedAllergies });
    goHome();
  };

  const allDislikes = [...DISLIKES_PRESET, ...customDislikes];

  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <ScreenHeader leftLabel="Goal" title="Dietary profile" onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <View style={[styles.stepIndicator, { marginTop: spec.stepMarginTop, marginBottom: spec.stepMarginBottom }]}>
          <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>Dietary profile</Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Optional. You can change this later.</Text>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Diet preferences</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedPreferences.length === 0} onPress={() => setSelectedPreferences([])} />
            {preferences.map((pref) => <Chip key={pref} label={pref} selected={selectedPreferences.includes(pref)} onPress={() => togglePref(pref)} />)}
          </View>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Common allergies</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedAllergies.length === 0} onPress={() => setSelectedAllergies([])} />
            {allergies.slice(0, 8).map((allergy) => <Chip key={allergy} label={allergy} selected={selectedAllergies.includes(allergy)} onPress={() => toggleAllergy(allergy)} />)}
          </View>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Dislikes</Text>
          <View style={styles.chipsWrap}>
            {allDislikes.map((label) => (
              <Chip key={label} label={label} selected={selectedDislikes.includes(label)} onPress={() => toggleDislike(label)} />
            ))}
            <Pressable style={styles.addOther} onPress={() => setAddOtherVisible(true)}>
              <Text style={styles.addOtherText}>+ Add other</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={[styles.actions, { paddingBottom: insets.bottom + spec.screenPaddingBottomOffset }]}>
          <PrimaryButton title="Save" onPress={onSave} />
          <Pressable onPress={goHome}><Text style={styles.skip} maxFontSizeMultiplier={1.2}>Skip</Text></Pressable>
        </View>
      </View>

      <Modal visible={addOtherVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOtherVisible(false)}>
          <Pressable style={styles.addOtherModal} onPress={() => undefined}>
            <Text style={styles.addOtherModalTitle}>Add dislike</Text>
            <TextInput
              style={styles.addOtherInput}
              placeholder="e.g. Broccoli"
              value={addOtherInput}
              onChangeText={setAddOtherInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.addOtherModalActions}>
              <PrimaryButton title="Add" onPress={addCustomDislike} style={styles.addOtherModalBtn} />
              <Pressable onPress={() => { setAddOtherVisible(false); setAddOtherInput(''); }}>
                <Text style={styles.addOtherCancel}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 0 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spec.stepGap },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { width: spec.stepActiveWidth, height: spec.stepActiveHeight, borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  title: { ...typography.h1, marginTop: 0 },
  subtitle: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[8] },
  content: { gap: spec.spacing[12], paddingBottom: spec.spacing[24] },
  sectionTitle: { ...typography.h2, marginTop: spec.spacing[24] },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[12] },
  addOther: {
    minHeight: spec.chipHeight,
    borderRadius: spec.chipRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: spec.chipPaddingX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOtherText: { color: appTheme.colors.muted, fontSize: appTheme.typography.body.fontSize, fontWeight: '500' },
  actions: { marginTop: 'auto', gap: spec.spacing[12] },
  skip: { textAlign: 'center', color: appTheme.colors.muted, ...appTheme.typography.bodySemibold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spec.spacing[20] },
  addOtherModal: { backgroundColor: appTheme.colors.surface, borderRadius: spec.cardRadius, padding: spec.cardPadding, gap: spec.spacing[16] },
  addOtherModalTitle: { ...typography.h2 },
  addOtherInput: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: spec.inputRadius, paddingHorizontal: spec.inputPaddingX, paddingVertical: spec.spacing[12], fontSize: appTheme.typography.body.fontSize, minHeight: spec.inputHeight },
  addOtherModalActions: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[16] },
  addOtherModalBtn: { flex: 1 },
  addOtherCancel: { color: appTheme.colors.muted, ...appTheme.typography.bodySemibold },
});
```

## FILE: `src/screens/HomeScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { HistoryItem, MacroTotals, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockHomeGreeting, mockRecentItems, mockTodayMacros } from '../mock/home';
import { historyRepo, userRepo } from '../services/container';
import { computeTodayMacrosUseCase } from '../services/computeTodayMacrosUseCase';
import { formatTimeAgo } from '../utils/time';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState('Hello');
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>({ caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [recent, setRecent] = React.useState<HistoryItem[]>([]);

  const load = React.useCallback(async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      setGreeting(mockHomeGreeting);
      setTodayMacros(mockTodayMacros);
      setRecent(mockRecentItems);
      return;
    }
    const loadedUser = await userRepo.getUser();
    const loadedMacros = await computeTodayMacrosUseCase(new Date(), { historyRepo });
    const loadedRecent = await historyRepo.listRecent(10);
    setUser(loadedUser);
    setTodayMacros(loadedMacros);
    setRecent(loadedRecent);
    const auth = await userRepo.getAuthState();
    setGreeting(auth.displayName ? `Hello, ${auth.displayName}` : 'Hello, Alex');
  }, []);
  useFocusEffect(React.useCallback(() => { void load(); return undefined; }, [load]));

  const hasTargets = Boolean(user?.baseParams);

  return (
    <Screen scroll maxContentWidth={460}>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>{greeting}</Text>
            <Text style={styles.subtitleHeader} maxFontSizeMultiplier={1.2}>Ready to scan?</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: 'https://dummyimage.com/120x120/e2e8f0/94a3b8.png&text=+' }} style={styles.avatarImage} />
          </Pressable>
        </View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>Today</Text>
            <View style={styles.eatenChip}>
              <Text style={styles.eatenText} maxFontSizeMultiplier={1.2}>Eaten</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CAL</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.caloriesKcal)}</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>PROT</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.proteinG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CARB</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.carbsG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>FAT</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.fatG)}g</Text></View>
          </View>
          {!hasTargets ? (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>Add your parameters to get your personalized daily goals.</Text>
              <SecondaryButton title="Add parameters" onPress={() => navigation.navigate('Profile', { section: 'baseParams' })} />
            </View>
          ) : null}
        </Card>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => navigation.navigate('ScanMenu')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconPurple]}><AppIcon name="scan" /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Scan menu</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TrackMeal')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconOrange]}><AppIcon name="meal" /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Track meal</Text>
            </Card>
          </Pressable>
        </View>
        <Text style={styles.recentHeader} maxFontSizeMultiplier={1.2}>Recent</Text>
        {recent.map((item) => (
          <Pressable key={item.id} onPress={() => item.type === 'menu_scan' ? navigation.navigate('MenuResults', { resultId: item.payloadRef }) : navigation.navigate('TrackMeal', { mealId: item.payloadRef, readOnly: true })}>
            <Card style={styles.recentCard}>
              <View style={styles.recentMain}><Text style={styles.recentTitle} maxFontSizeMultiplier={1.2}>{item.title}</Text><Text style={styles.recentTime}>{formatTimeAgo(item.createdAt)}</Text></View>
              <Text style={[styles.recentTag, item.type === 'menu_scan' ? styles.recentTagMenu : styles.recentTagMeal]}>{item.type === 'menu_scan' ? 'Menu' : 'Meal'}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Nutritional values are estimates based on AI analysis.{'\n'}Please verify with professional advice if needed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spec.spacing[16], paddingBottom: spec.spacing[40] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', minWidth: spec.minTouchTarget, minHeight: spec.minTouchTarget },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { ...typography.hero },
  subtitleHeader: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[4] },
  todayCard: { gap: spec.spacing[16] },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eatenChip: {
    backgroundColor: appTheme.colors.accentSoft,
    borderRadius: spec.chipSmallRadius,
    paddingHorizontal: spec.chipSmallPaddingX,
    height: spec.chipSmallHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eatenText: { color: appTheme.colors.accent, ...appTheme.typography.caption, fontWeight: '700' },
  cardTitle: { ...typography.h2 },
  macroRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between' },
  macroCell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spec.spacing[8] },
  macroLabel: { ...typography.overline, color: appTheme.colors.muted },
  macroValue: { ...typography.h1 },
  macroDivider: { width: 1, backgroundColor: appTheme.colors.border, marginHorizontal: spec.spacing[4] },
  ctaBox: { backgroundColor: appTheme.colors.infoSoft, borderRadius: spec.inputRadius, padding: spec.spacing[12], gap: spec.spacing[12] },
  ctaText: { ...typography.caption, color: appTheme.colors.muted, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: spec.spacing[16] },
  actionItem: { flex: 1 },
  actionCard: { minHeight: 165, alignItems: 'center', justifyContent: 'center', gap: spec.spacing[16] },
  actionIconWrap: { width: 56, height: 56, borderRadius: spec.primaryButtonRadius, alignItems: 'center', justifyContent: 'center' },
  actionIconPurple: { backgroundColor: appTheme.colors.accentSoft },
  actionIconOrange: { backgroundColor: appTheme.colors.warningSoft },
  actionTitle: { ...typography.h2, textAlign: 'center' },
  recentHeader: { ...typography.h2, marginTop: spec.spacing[4] },
  recentCard: { flexDirection: 'row', gap: spec.spacing[12], alignItems: 'center', minHeight: 88 },
  recentMain: { flex: 1 },
  recentTitle: { ...typography.bodySemibold },
  recentTime: { ...typography.caption, color: appTheme.colors.muted, marginTop: spec.spacing[4] },
  recentTag: { borderRadius: spec.chipRadius, paddingHorizontal: spec.chipPaddingX, paddingVertical: spec.spacing[4], ...appTheme.typography.caption, fontWeight: '700', overflow: 'hidden' },
  recentTagMenu: { color: appTheme.colors.info, backgroundColor: appTheme.colors.infoSoft },
  recentTagMeal: { color: appTheme.colors.success, backgroundColor: appTheme.colors.successSoft },
  disclaimer: { marginTop: spec.spacing[16], textAlign: 'center', ...typography.caption, color: appTheme.colors.muted },
});
```

## FILE: `src/screens/ProfileScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockProfile, mockProfileMeta } from '../mock/profile';
import { trialRepo, userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { BottomCTA } from '../ui/components/BottomCTA';
import { Screen } from '../ui/components/Screen';
import { SelectField } from '../ui/components/SelectField';
import { SegmentedControl } from '../ui/components/SegmentedControl';
import { TextField } from '../ui/components/TextField';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const BOTTOM_CTA_HEIGHT = 56 + spec.screenPaddingBottomOffset * 2 + 16;

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [trialText, setTrialText] = React.useState('Free');
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState('');
  const [activity, setActivity] = React.useState<ActivityLevel>('Low');
  const [sex, setSex] = React.useState<Sex>('Male');

  React.useEffect(() => {
    void (async () => {
      if (USE_MOCK_DATA) {
        setUser(mockProfile);
        setHeight(String(mockProfile.baseParams?.heightCm ?? ''));
        setWeight(String(mockProfile.baseParams?.weightKg ?? ''));
        setAge(String(mockProfile.baseParams?.age ?? ''));
        setActivity(mockProfile.baseParams?.activityLevel ?? 'Low');
        setSex(mockProfile.baseParams?.sex ?? 'Male');
        setTrialText(mockProfileMeta.trialText);
        return;
      }
      const u = await userRepo.getUser();
      setUser(u ?? null);
      if (u?.baseParams) {
        setHeight(String(u.baseParams.heightCm));
        setWeight(String(u.baseParams.weightKg));
        setAge(u.baseParams.age ? String(u.baseParams.age) : '');
        setActivity(u.baseParams.activityLevel);
        setSex(u.baseParams.sex ?? 'Prefer not to say');
      }
      const trial = await trialRepo.getTrial();
      setTrialText(trial.isPremium ? 'Premium' : `Trial left: ${trialRepo.getTrialDaysLeft(trial)}d`);
    })();
  }, []);

  const save = async (): Promise<void> => {
    if (USE_MOCK_DATA) return;
    const current = await userRepo.getUser();
    if (!current) return;
    const h = Number(height);
    const w = Number(weight);
    const a = Number(age);
    const next: UserProfile = {
      ...current,
      baseParams:
        Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0
          ? {
              heightCm: h,
              weightKg: w,
              age: Number.isFinite(a) && a > 0 ? a : undefined,
              activityLevel: activity,
              sex,
            }
          : undefined,
    };
    await userRepo.saveUser(next);
    setUser(next);
  };

  return (
    <Screen keyboardAvoiding bottomCTAPadding={BOTTOM_CTA_HEIGHT}>
      <ScreenHeader leftLabel="Home" title="Profile" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Status</Text>
            <View style={styles.guestPill}><Text style={styles.guestText} maxFontSizeMultiplier={1.2}>Guest</Text></View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Trial</Text>
            <Text style={styles.trialText} maxFontSizeMultiplier={1.2}>{trialText}</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>DIETARY PROFILE</Text>
          <Pressable style={styles.profileLink} onPress={() => navigation.navigate('DietaryProfile')}>
            <AppIcon name="diet" />
            <View style={styles.linkBody}>
              <Text style={styles.linkTitle} maxFontSizeMultiplier={1.2}>Edit dietary profile</Text>
              <Text style={styles.linkSubtitle} maxFontSizeMultiplier={1.2}>Preferences, allergies, diet type</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>PERSONAL PARAMETERS</Text>
          <View style={styles.paramsContent}>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <TextField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
              </View>
              <View style={styles.gridItem}>
                <TextField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
              <View style={styles.gridItem}>
                <TextField label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Optional" />
              </View>
              <View style={styles.gridItem}>
                <SelectField
                  label="Sex"
                  value={sex}
                  onChange={setSex}
                  options={mockProfileMeta.sexOptions.map((item) => ({ label: item, value: item }))}
                />
              </View>
            </View>
            <View style={styles.segmentWrap}>
              <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>Activity Level</Text>
              <SegmentedControl value={activity} options={mockProfileMeta.activityOptions} onChange={setActivity} />
            </View>
          </View>
        </Card>
        <Card style={styles.premiumCard}>
          <AppIcon name="sparkles" />
          <Text style={styles.premiumTitle} maxFontSizeMultiplier={1.2}>Unlock Premium</Text>
          <Text style={styles.premiumSubtitle} maxFontSizeMultiplier={1.2}>Get unlimited recipes and advanced AI analysis.</Text>
          <PrimaryButton title="Upgrade to Premium" onPress={() => navigation.navigate('Paywall')} />
        </Card>
        <Card style={styles.legalCard}>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Terms of Service</Text><Text style={styles.chevron}>{'>'}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Privacy Policy</Text><Text style={styles.chevron}>{'>'}</Text></View>
        </Card>
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Disclaimer: This app is for informational purposes only and does not constitute medical advice.</Text>
      </ScrollView>
      <BottomCTA>
        <PrimaryButton title="Save Changes" onPress={() => void save()} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { gap: spec.spacing[16], paddingBottom: spec.spacing[24] },
  sectionLabel: { ...typography.overline, color: appTheme.colors.muted, marginBottom: spec.spacing[8] },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: spec.minTouchTarget,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  fieldTitle: { ...typography.body, color: appTheme.colors.textPrimary, fontWeight: '500' },
  guestPill: { backgroundColor: appTheme.colors.border, borderRadius: spec.chipRadius, paddingHorizontal: spec.chipPaddingX, paddingVertical: spec.spacing[4] },
  guestText: { ...appTheme.typography.caption, color: appTheme.colors.ink, fontWeight: '700' },
  trialText: { color: appTheme.colors.success, fontWeight: '700' },
  profileLink: {
    minHeight: 72,
    borderRadius: spec.inputRadius,
    backgroundColor: appTheme.colors.infoSoft,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spec.spacing[12],
    gap: spec.spacing[8],
  },
  linkBody: { flex: 1 },
  linkTitle: { ...typography.bodySemibold },
  linkSubtitle: { ...typography.caption, color: appTheme.colors.muted },
  chevron: { color: appTheme.colors.muted, fontWeight: '700', fontSize: appTheme.typography.callout.fontSize },
  paramsContent: { gap: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[12] },
  gridItem: { width: '48%', minWidth: 0 },
  inputLabel: { ...typography.caption, color: appTheme.colors.muted },
  segmentWrap: { marginTop: spec.spacing[12], marginBottom: spec.spacing[16], gap: spec.spacing[8] },
  premiumCard: { alignItems: 'center', gap: spec.spacing[8], paddingVertical: spec.spacing[20] },
  premiumTitle: { ...typography.h2, textAlign: 'center' },
  premiumSubtitle: { ...typography.body, color: appTheme.colors.muted, textAlign: 'center', marginBottom: spec.spacing[8] },
  legalCard: { gap: spec.spacing[8] },
  disclaimer: { ...typography.caption, color: appTheme.colors.muted, textAlign: 'center' },
});
```

## FILE: `src/screens/MenuResultsScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { DishRecommendation, MenuScanResult } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockTopPicksResult } from '../mock/topPicks';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

const BOTTOM_BAR_PADDING = spec.screenPaddingBottomOffset;
const BOTTOM_BAR_APPROX_HEIGHT = spec.primaryButtonHeight + spec.spacing[12] + spec.minTouchTarget + BOTTOM_BAR_PADDING * 2;
const SCROLL_PADDING_BOTTOM = BOTTOM_BAR_APPROX_HEIGHT + spec.spacing[24];

type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

function TopPickCard({
  item,
  onTakeDish,
  onAskBuddy,
}: {
  item: DishRecommendation;
  onTakeDish: (d: DishRecommendation) => void;
  onAskBuddy: (d: DishRecommendation) => void;
}): React.JSX.Element {
  const hasMacros = Boolean(item.macros);
  return (
    <Card style={styles.topPickCard}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
          <Text style={styles.reason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
        </View>
        {item.matchPercent != null && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText} maxFontSizeMultiplier={1.2}>{item.matchPercent}% match</Text>
          </View>
        )}
      </View>
      {hasMacros && item.macros && (
        <View style={styles.macroGrid}>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>Cals</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.caloriesKcal}</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>P</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.proteinG}g</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>C</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.carbsG}g</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>F</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.fatG}g</Text>
          </View>
        </View>
      )}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <Chip key={`${item.name}_${tag}`} label={tag} small />
          ))}
        </View>
      )}
      <View style={styles.statusRow}>
        {item.warningLabel ? (
          <View style={styles.statusItem}>
            <Text style={styles.statusWarningIcon}>⚠</Text>
            <Text style={styles.statusText} maxFontSizeMultiplier={1.2}>{item.warningLabel}</Text>
          </View>
        ) : (
          <View style={styles.statusItem}>
            <Text style={styles.statusOkIcon}>✓</Text>
            <Text style={styles.statusText} maxFontSizeMultiplier={1.2}>Allergen safe</Text>
          </View>
        )}
        <View style={styles.statusItem}>
          <Text style={styles.sparkleIcon}>✦</Text>
          <Text style={styles.statusMuted} maxFontSizeMultiplier={1.2}>High confidence analysis</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <PrimaryButton title="I take it" style={styles.takeBtn} onPress={() => onTakeDish(item)} />
        <SecondaryButton title="Ask Buddy" style={styles.askBtn} onPress={() => onAskBuddy(item)} />
      </View>
    </Card>
  );
}

function CautionCard({
  item,
  onTakeDish,
}: {
  item: DishRecommendation;
  onTakeDish: (d: DishRecommendation) => void;
}): React.JSX.Element {
  const firstTag = item.tags[0];
  return (
    <Pressable style={styles.compactCard} onPress={() => onTakeDish(item)}>
      <View style={styles.compactHead}>
        <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
        {firstTag && (
          <View style={styles.cautionTag}>
            <Text style={styles.cautionTagText} maxFontSizeMultiplier={1.2}>{firstTag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
    </Pressable>
  );
}

function AvoidCard({ item }: { item: DishRecommendation }): React.JSX.Element {
  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
    </View>
  );
}

function SectionTitle({
  icon,
  iconColor,
  title,
}: {
  icon: string;
  iconColor: string;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionIcon, { color: iconColor }]}>{icon}</Text>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{title}</Text>
    </View>
  );
}

export function MenuResultsScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [whyText, setWhyText] = React.useState<string | null>(null);
  const [paywallHandled, setPaywallHandled] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      if (route.params?.resultId) {
        const byId = await historyRepo.getScanResultById(route.params.resultId);
        if (byId) return setResult(byId);
      }
      const first = (await historyRepo.listRecent(20)).find((i) => i.type === 'menu_scan');
      const latestResult = first ? await historyRepo.getScanResultById(first.payloadRef) : null;
      if (latestResult) {
        setResult(latestResult);
        return;
      }
      setResult(USE_MOCK_DATA ? mockTopPicksResult : null);
    })();
  }, [route.params?.resultId]);

  React.useEffect(() => {
    if (!result || paywallHandled || !route.params?.paywallAfterOpen) return;
    setPaywallHandled(true);
    navigation.navigate('Paywall', { source: 'first_result', trialDaysLeft: route.params?.trialDaysLeft ?? 7 });
  }, [navigation, paywallHandled, result, route.params?.paywallAfterOpen, route.params?.trialDaysLeft]);

  React.useEffect(() => {
    void (async () => {
      if (!result) return;
      const picks = result.topPicks.map((i, idx) => `${idx + 1}. ${i.name}`).join('\n');
      await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, `${result.summaryText}\nTop picks:\n${picks}`);
    })();
  }, [result]);

  const handleTakeDish = React.useCallback(async (dish: DishRecommendation): Promise<void> => {
    const mealId = createId('meal');
    const macros = dish.macros ?? { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    await addMealUseCase(
      {
        id: mealId,
        createdAt: new Date().toISOString(),
        title: dish.name,
        source: 'text',
        macros,
        notes: dish.reasonShort,
      },
      { historyRepo },
    );
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}.`);
    Alert.alert('Added', `${dish.name} logged to your day.`);
  }, []);

  const scrollPaddingBottom = insets.bottom + SCROLL_PADDING_BOTTOM;
  const bottomBarPaddingBottom = insets.bottom + BOTTOM_BAR_PADDING;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.root}>
        {/* Custom header: back, Analysis Complete, more */}
        <View style={[styles.header, { paddingTop: insets.top + spec.headerPaddingTopOffset }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              hitSlop={8}
            >
              <Text style={styles.headerBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.headerCenter} maxFontSizeMultiplier={1.2}>Analysis Complete</Text>
            <Pressable style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.headerBtnText}>⋯</Text>
            </Pressable>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>Menu picks</Text>
            <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>Based on your goal and profile</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollPaddingBottom, paddingHorizontal: spec.screenPaddingHorizontal },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!result ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>No results yet. Run a scan from Scan menu.</Text>
            </Card>
          ) : (
            <>
              <View style={styles.section}>
                <SectionTitle icon="👍" iconColor={appTheme.colors.success} title="Top picks" />
                <View style={styles.cardsColumn}>
                  {result.topPicks.map((item) => (
                    <TopPickCard
                      key={`t_${item.name}`}
                      item={item}
                      onTakeDish={handleTakeDish}
                      onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })}
                    />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMuted]}>
                <SectionTitle icon="⚠" iconColor={appTheme.colors.warning} title="OK with caution" />
                <View style={styles.cardsColumn}>
                  {result.caution.map((item) => (
                    <CautionCard key={`c_${item.name}`} item={item} onTakeDish={handleTakeDish} />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMutedMore]}>
                <SectionTitle icon="⊘" iconColor={appTheme.colors.danger} title="Better avoid" />
                <View style={styles.cardsColumn}>
                  {result.avoid.map((item) => (
                    <AvoidCard key={`a_${item.name}`} item={item} />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Fixed bottom bar */}
        <View
          style={[
            styles.bottomBar,
            styles.bottomBarBg,
            {
              paddingBottom: bottomBarPaddingBottom,
              paddingTop: BOTTOM_BAR_PADDING,
            },
          ]}
        >
          <View style={styles.bottomBarContent}>
            <Pressable
              style={({ pressed }) => [styles.rescanBtn, pressed && styles.rescanPressed]}
              onPress={() => navigation.navigate('ScanMenu')}
            >
              <Text style={styles.rescanIcon}>⊙</Text>
              <Text style={styles.rescanBtnText} maxFontSizeMultiplier={1.2}>Rescan Menu</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result?.id })} style={styles.chatLinkWrap}>
              <Text style={styles.chatLink} maxFontSizeMultiplier={1.2}>Open chat with Buddy</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal transparent visible={Boolean(whyText)} animationType="slide" onRequestClose={() => setWhyText(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setWhyText(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.2}>Why this recommendation?</Text>
            <Text style={styles.sheetText} maxFontSizeMultiplier={1.2}>{whyText}</Text>
            <SecondaryButton title="Close" onPress={() => setWhyText(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  header: {
    paddingHorizontal: spec.screenPaddingHorizontal,
    paddingBottom: spec.spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: spec.spacing[4],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { fontSize: 22, color: appTheme.colors.textPrimary, fontWeight: '300' },
  headerCenter: {
    fontSize: spec.headerPillFontSize,
    fontWeight: '600',
    color: appTheme.colors.textSecondary,
  },
  titleBlock: { gap: 2 },
  pageTitle: { ...typography.h1, color: appTheme.colors.textPrimary },
  pageSubtitle: { ...typography.body, color: appTheme.colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spec.spacing[8] },
  section: { marginBottom: spec.spacing[32] },
  sectionMuted: { opacity: 0.85 },
  sectionMutedMore: { opacity: 0.7 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginBottom: spec.spacing[16] },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { ...typography.h2, color: appTheme.colors.textPrimary },
  cardsColumn: { gap: spec.spacing[16] },
  topPickCard: { gap: spec.spacing[16] },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spec.spacing[8] },
  cardHeadText: { flex: 1, minWidth: 0 },
  dishName: { ...typography.h2, color: appTheme.colors.textPrimary, marginBottom: spec.spacing[4] },
  reason: { ...typography.caption, color: appTheme.colors.textSecondary },
  matchBadge: {
    backgroundColor: appTheme.colors.successSoft,
    paddingHorizontal: spec.spacing[8],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.radius.input,
  },
  matchText: { fontSize: appTheme.typography.caption1.fontSize, fontWeight: '700', color: appTheme.colors.success },
  macroGrid: {
    flexDirection: 'row',
    backgroundColor: appTheme.colors.background,
    borderRadius: spec.radius.input,
    padding: spec.spacing[12],
  },
  macroCol: { flex: 1, alignItems: 'center' },
  macroColBorder: { borderLeftWidth: 1, borderLeftColor: appTheme.colors.border },
  macroLabel: {
    ...typography.overline,
    color: appTheme.colors.textSecondary,
    marginBottom: spec.spacing[4],
  },
  macroValue: { ...typography.h3, color: appTheme.colors.textPrimary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  statusRow: {
    paddingTop: spec.spacing[12],
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
    gap: spec.spacing[4],
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8] },
  statusOkIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.success },
  statusWarningIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.warning },
  sparkleIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.textSecondary },
  statusText: { ...typography.caption, color: appTheme.colors.textSecondary },
  statusMuted: { ...typography.caption, color: appTheme.colors.textSecondary, opacity: 0.9 },
  cardActions: { flexDirection: 'row', gap: spec.spacing[12], marginTop: spec.spacing[4] },
  takeBtn: { flex: 1 },
  askBtn: { minWidth: 0 },
  compactCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    padding: spec.cardPadding,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
  },
  compactHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spec.spacing[4] },
  compactTitle: { ...typography.bodySemibold, color: appTheme.colors.textPrimary, flex: 1 },
  compactReason: { ...typography.caption, color: appTheme.colors.textSecondary },
  cautionTag: {
    backgroundColor: appTheme.colors.warningSoft,
    paddingHorizontal: spec.spacing[8],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.inputRadius,
  },
  cautionTagText: { fontSize: appTheme.typography.caption1.fontSize, fontWeight: '700', color: appTheme.colors.warning },
  emptyCard: { padding: spec.cardPadding },
  emptyText: { ...typography.body, color: appTheme.colors.textSecondary },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  bottomBarBg: { backgroundColor: 'rgba(255,255,255,0.95)' },
  bottomBarContent: { paddingHorizontal: spec.screenPaddingHorizontal, gap: spec.spacing[12] },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[8],
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  rescanPressed: { opacity: 0.9 },
  rescanIcon: { fontSize: 20, color: appTheme.colors.textPrimary },
  rescanBtnText: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  chatLinkWrap: { alignItems: 'center', paddingVertical: spec.spacing[4] },
  chatLink: { ...typography.bodySemibold, color: appTheme.colors.accent },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182755' },
  sheet: {
    backgroundColor: appTheme.colors.surface,
    borderTopLeftRadius: spec.sheetRadius,
    borderTopRightRadius: spec.sheetRadius,
    padding: spec.cardPadding,
    gap: spec.spacing[16],
  },
  sheetTitle: { ...typography.bodySemibold },
  sheetText: { ...typography.body, color: appTheme.colors.textSecondary },
});
```

## FILE: `src/screens/ScanMenuScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, ImageStyle, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { AppScreen } from '../components/AppScreen';
import { appTheme } from '../design/theme';
import { AnalyzeMenuOutput, analyzeMenuUseCase, DailyScanLimitReachedError } from '../services/analyzeMenuUseCase';
import { appPrefsRepo, historyRepo, menuAnalysisProvider, trialRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanMenu'>;

export function ScanMenuScreen({ navigation }: Props): React.JSX.Element {
  const cameraRef = React.useRef<CameraView | null>(null);
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const removePhoto = (uri: string): void => setPhotos((p) => p.filter((i) => i !== uri));
  const takePhoto = async (): Promise<void> => {
    if (photos.length >= 3) return;
    const granted = cameraPermission?.granted || (await requestCameraPermission()).granted;
    if (!granted) return Alert.alert('Camera access needed', 'Please allow camera to scan menus.');
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (shot?.uri) setPhotos((p) => [...p, shot.uri].slice(0, 3));
  };
  const addFromGallery = async (): Promise<void> => {
    if (photos.length >= 3) return;
    const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 - photos.length, quality: 0.7 });
    if (selected.canceled) return;
    setPhotos((p) => [...p, ...selected.assets.map((a) => a.uri)].slice(0, 3));
  };
  const askSaveScansPreferenceIfNeeded = async (): Promise<boolean> => {
    const prefs = await appPrefsRepo.getPrefs();
    if (prefs.saveScansPromptHandled) return prefs.saveScansToPhotos;
    return new Promise<boolean>((resolve) => {
      Alert.alert('Save scans to Photos?', 'So you can access them later.', [
        { text: 'Not now', style: 'cancel', onPress: () => { void appPrefsRepo.setSaveScansPreference(false); resolve(false); } },
        { text: 'Allow', onPress: () => { void appPrefsRepo.setSaveScansPreference(true); resolve(true); } },
      ]);
    });
  };
  const maybeSaveToGallery = async (uris: string[]): Promise<void> => {
    if (!(await askSaveScansPreferenceIfNeeded()) || uris.length === 0) return;
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return;
    await Promise.all(uris.map((u) => MediaLibrary.createAssetAsync(u).catch(() => null)));
  };
  const onSuccess = async (output: AnalyzeMenuOutput): Promise<void> => {
    await maybeSaveToGallery(photos);
    navigation.navigate('MenuResults', { resultId: output.resultId, paywallAfterOpen: output.shouldShowPaywallAfterResults, trialDaysLeft: output.trialDaysLeft });
  };
  const onContinue = async (): Promise<void> => {
    setLoading(true);
    try {
      const output = await analyzeMenuUseCase(photos, { historyRepo, menuProvider: menuAnalysisProvider, trialRepo, userRepo });
      await onSuccess(output);
    } catch (e) {
      if (e instanceof DailyScanLimitReachedError) {
        Alert.alert('Daily limit reached', 'You can scan one menu per day on Free plan.', [{ text: 'Close', style: 'cancel' }, { text: 'Open paywall', onPress: () => navigation.navigate('Paywall', { source: 'limit' }) }]);
      } else {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to analyze menu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen padded={false} respectInsets={false} style={styles.wrap}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => {}}
        onMountError={() => {}}
      />
      <View style={[styles.topOverlay, { paddingTop: insets.top + appTheme.spacing.sm }]}>
        <Pressable style={styles.backBtn} hitSlop={8} onPress={() => navigation.goBack()}><Text style={styles.backText}>{'<'}</Text></Pressable>
        <Text style={styles.title}>Scan menu</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + appTheme.spacing.md }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb as ImageStyle} />
              <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => removePhoto(uri)}><Text style={styles.removeText}>X</Text></Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.bottomRow}>
          <Pressable style={styles.importBtn} onPress={() => void addFromGallery()}><Text style={styles.importText}>Import</Text></Pressable>
          <Pressable style={styles.captureBtn} onPress={() => void takePhoto()}><View style={styles.captureInner} /></Pressable>
          <View style={styles.placeholder} />
        </View>
        <PrimaryButton title="Continue" onPress={() => void onContinue()} disabled={photos.length === 0 || loading} />
      </View>
      {loading ? (
        <View style={styles.overlay}>
          <Card style={styles.overlayCard}><Text style={styles.overlayTitle}>Analyzing...</Text><Text style={styles.overlayText}>This may take a few seconds.</Text></Card>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000' },
  camera: { ...StyleSheet.absoluteFillObject },
  topOverlay: { paddingHorizontal: appTheme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: appTheme.typography.body.fontSize, color: '#FFFFFF', fontWeight: '700' },
  bottomOverlay: { marginTop: 'auto', paddingHorizontal: appTheme.spacing.md, gap: appTheme.spacing.md },
  thumbRow: { gap: appTheme.spacing.sm, paddingVertical: 2 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 58, height: 78, borderRadius: appTheme.radius.md, backgroundColor: '#FFFFFF44' },
  removeBtn: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827AA', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  importBtn: { width: 84, height: 54, borderRadius: appTheme.radius.md, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  importText: { color: '#FFFFFF', fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  captureBtn: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF' },
  placeholder: { width: 84 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#11182755', alignItems: 'center', justifyContent: 'center' },
  overlayCard: { width: '82%', alignItems: 'center', gap: appTheme.spacing.xs },
  overlayTitle: { color: appTheme.colors.textPrimary, fontWeight: '700', fontSize: appTheme.typography.body.fontSize },
  overlayText: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
});
```

## FILE: `src/screens/TrackMealScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../app/navigation/types';
import { TEST_MODE } from '../config/flags';
import { analyzeMealPhoto } from '../services/aiService';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackMeal'>;
type Mode = 'photo' | 'text';

function toStableMacros(seedText: string): { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number } {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) hash = (hash * 31 + seedText.charCodeAt(i)) % 997;
  return { caloriesKcal: 430 + (hash % 80), proteinG: 28 + (hash % 10), carbsG: 35 + (hash % 12), fatG: 13 + (hash % 7) };
}

export function TrackMealScreen({ navigation, route }: Props): React.JSX.Element {
  const [mealTitle, setMealTitle] = React.useState<string | null>(null);
  const [mealInfo, setMealInfo] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>('photo');
  const [titleInput, setTitleInput] = React.useState('');
  const [descriptionInput, setDescriptionInput] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { void (async () => {
    if (!route.params?.mealId) return;
    const meal = await historyRepo.getMealById(route.params.mealId);
    if (!meal) return setMealTitle('Meal not found');
    setMealTitle(meal.title);
    setMealInfo(`${meal.macros.caloriesKcal} kcal | P ${meal.macros.proteinG}g | C ${meal.macros.carbsG}g | F ${meal.macros.fatG}g`);
  })(); }, [route.params?.mealId]);
  const saveMeal = async (source: 'photo' | 'text'): Promise<void> => {
    setSaving(true);
    const title = titleInput.trim() || 'Meal';
    const mealId = createId('meal');
    let macros = toStableMacros(`${title}-${descriptionInput}-${source}`);
    let notes = source === 'text' ? descriptionInput.trim() : undefined;

    if (source === 'photo' && imageUri && TEST_MODE) {
      try {
        const analysis = await analyzeMealPhoto(imageUri);
        macros = analysis.macros;
        notes = analysis.description;
      } catch (error) {
        console.warn('AI meal analysis failed, using fallback:', error);
      }
    }

    try {
      await addMealUseCase({
        id: mealId,
        createdAt: new Date().toISOString(),
        title,
        source,
        imageUri,
        notes,
        macros,
      }, { historyRepo });
      await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${title}. Today updated.`);
      Alert.alert('Saved');
      setTitleInput('');
      setDescriptionInput('');
      setImageUri(undefined);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen keyboardAvoiding>
      <View style={styles.wrap}>
        <Text style={styles.title}>{route.params?.readOnly ? 'Meal details' : 'Track meal'}</Text>
        {route.params?.readOnly ? <Card><Text style={styles.cardTitle}>{mealTitle ?? 'Loading...'}</Text>{mealInfo ? <Text style={styles.infoText}>{mealInfo}</Text> : null}</Card> : (
          <>
            <Text style={styles.subtitle}>Log what you ate</Text>
            <View style={styles.segmented}>
              <Pressable style={[styles.segmentBtn, mode === 'photo' && styles.segmentBtnActive]} onPress={() => setMode('photo')}><Text style={[styles.segmentText, mode === 'photo' && styles.segmentTextActive]}>Photo</Text></Pressable>
              <Pressable style={[styles.segmentBtn, mode === 'text' && styles.segmentBtnActive]} onPress={() => setMode('text')}><Text style={[styles.segmentText, mode === 'text' && styles.segmentTextActive]}>Text</Text></Pressable>
            </View>
            {mode === 'photo' ? (
              <View style={styles.formCard}>
                <Pressable style={styles.cameraPlaceholder} onPress={() => void ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : (
                    <View style={styles.placeholderCenter}>
                      <AppIcon name="camera" size={22} />
                      <Text style={styles.placeholderText}>Take a photo of your meal</Text>
                    </View>
                  )}
                </Pressable>
                <SecondaryButton title="Import" onPress={() => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))} />
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
              </View>
            ) : (
              <View style={styles.formCard}>
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
                <TextInput style={styles.textArea} multiline placeholder="Describe your meal. Example: chicken salad with olive oil." value={descriptionInput} onChangeText={setDescriptionInput} />
              </View>
            )}
            <View style={styles.bottomActions}>
              <PrimaryButton title="Add Meal" loading={saving} onPress={() => void saveMeal(mode)} disabled={saving || (mode === 'photo' ? !imageUri : !descriptionInput.trim())} />
              <SecondaryButton title="Cancel" disabled={saving} onPress={() => navigation.goBack()} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: uiTheme.spacing.md },
  title: { ...typography.h2 },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEEF2', borderRadius: uiTheme.radius.sm, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: uiTheme.radius.sm, paddingVertical: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: uiTheme.colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: uiTheme.colors.textPrimary, fontWeight: '700' },
  formCard: { gap: uiTheme.spacing.sm },
  cameraPlaceholder: { minHeight: 280, borderRadius: uiTheme.radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden' },
  placeholderCenter: { alignItems: 'center', gap: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 17 },
  previewImage: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  bottomActions: { marginTop: 'auto', gap: uiTheme.spacing.sm },
  cardTitle: { ...typography.h3 },
  infoText: { marginTop: uiTheme.spacing.sm, color: uiTheme.colors.textSecondary, fontSize: 17 },
});
```

## FILE: `src/screens/ChatScreen.tsx`
```tsx
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { ChatMessage, MenuScanResult } from '../domain/models';
import { TEST_MODE } from '../config/flags';
import { askBuddy as askBuddyAI } from '../services/aiService';
import { chatRepo, historyRepo, trialRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
function formatResultMessage(result: MenuScanResult): string {
  return `${result.summaryText}\nTop picks:\n${result.topPicks.map((item, i) => `${i + 1}. ${item.name}`).join('\n')}`;
}

export function ChatScreen({ navigation, route }: Props): React.JSX.Element {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const loadData = React.useCallback(async (): Promise<void> => {
    const trial = await trialRepo.getTrial();
    setIsPremium(trial.isPremium);
    if (route.params?.resultId) {
      const result = await historyRepo.getScanResultById(route.params.resultId);
      if (result) await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, formatResultMessage(result));
    }
    if (route.params?.systemMessage) await chatRepo.addSystemMessageIfMissing(`route_${route.params.systemMessage}`, route.params.systemMessage);
    setMessages(await chatRepo.listMessages());
  }, [route.params?.resultId, route.params?.systemMessage]);
  useFocusEffect(React.useCallback(() => { void loadData(); return undefined; }, [loadData]));
  const askBuddy = async (): Promise<void> => {
    const question = input.trim();
    if (!question) return;
    if (!isPremium && !TEST_MODE) {
      navigation.navigate('Paywall', { source: 'chat' });
      return;
    }
    setSending(true);
    try {
      await chatRepo.addMessage('user', question);
      const context = route.params?.resultId ? await historyRepo.getScanResultById(route.params.resultId) : undefined;
      const response = await askBuddyAI(question, context);
      await chatRepo.addMessage('assistant', response);
      setInput('');
      const updatedMessages = await chatRepo.listMessages();
      setMessages(updatedMessages);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setSending(false);
    }
  };

  React.useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  return (
    <AppScreen keyboardAvoiding dismissKeyboardOnTouch>
      <View style={styles.wrap}>
        <Text style={styles.title}>Chat with Buddy</Text>
        <Text style={styles.subtitle}>Your food history stays here</Text>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messages}
          style={styles.list}
          ListEmptyComponent={<Card><Text style={styles.systemMessage}>No messages yet.</Text></Card>}
          renderItem={({ item: m }) => (
            <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.systemBubble]}>
              <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.systemText]}>{m.text}</Text>
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Ask Buddy about your meals..." />
          <PrimaryButton title={isPremium || TEST_MODE ? 'Ask Buddy' : 'Upgrade to ask Buddy...'} loading={sending} onPress={() => void askBuddy()} />
          {!isPremium ? <SecondaryButton title="See Premium" onPress={() => navigation.navigate('Paywall', { source: 'chat' })} /> : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.sm },
  title: { fontSize: appTheme.typography.h2.fontSize, color: appTheme.colors.textPrimary, fontWeight: '700' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
  list: { flex: 1 },
  messages: { gap: appTheme.spacing.sm, paddingVertical: appTheme.spacing.sm, flexGrow: 1 },
  bubble: { maxWidth: '90%', borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: appTheme.colors.accent, borderTopRightRadius: 8 },
  systemBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: appTheme.colors.border, borderTopLeftRadius: 8 },
  bubbleText: { fontSize: appTheme.typography.body.fontSize },
  userText: { color: '#FFFFFF' },
  systemText: { color: appTheme.colors.textPrimary },
  systemMessage: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
  composer: { gap: appTheme.spacing.sm, marginTop: appTheme.spacing.sm },
  input: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
});
```

## FILE: `src/screens/PaywallScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { trialRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation, route }: Props): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const trialDaysLeft = route.params?.trialDaysLeft ?? 7;
  const onStartPremium = async (): Promise<void> => {
    setLoading(true);
    const trial = await trialRepo.getTrial();
    await trialRepo.saveTrial({ ...trial, isPremium: true });
    setLoading(false);
    navigation.goBack();
  };
  return (
    <AppScreen scroll>
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.headerAction}>Close</Text></Pressable>
          <Pressable><Text style={styles.headerAction}>Restore</Text></Pressable>
        </View>
        <Text style={styles.title}>Unlock Buddy</Text>
        <Text style={styles.subtitle}>{trialDaysLeft > 0 ? `${trialDaysLeft} of 7 days trial left` : 'Trial ended'}</Text>
        <Card style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Premium includes</Text>
          <Text style={styles.benefitItem}>- Unlimited menu scans</Text>
          <Text style={styles.benefitItem}>- Ask Buddy in chat</Text>
          <Text style={styles.benefitItem}>- Smarter meal suggestions</Text>
        </Card>
        <Card style={styles.planCard}>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>$39.99/year</Text>
          <Text style={styles.planHint}>Cancel anytime.</Text>
        </Card>
        <PrimaryButton title="Start Premium" loading={loading} onPress={() => void onStartPremium()} disabled={loading} />
        <SecondaryButton title="Not now" onPress={() => navigation.goBack()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerAction: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  title: { fontSize: appTheme.typography.title.fontSize, color: appTheme.colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body.fontSize, textAlign: 'center' },
  benefitsCard: { gap: 8 },
  benefitsTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3.fontSize, fontWeight: '700' },
  benefitItem: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body.fontSize },
  planCard: { gap: 4, backgroundColor: '#F8F1FF', borderColor: '#E9D5FF' },
  planName: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3.fontSize, fontWeight: '700' },
  planPrice: { color: appTheme.colors.accent, fontSize: appTheme.typography.h2.fontSize, fontWeight: '800' },
  planHint: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
});
```

## FILE: `src/screens/SignInNudgeScreen.tsx`
```tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { appPrefsRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'SignInNudge'>;

export function SignInNudgeScreen({ navigation, route }: Props): React.JSX.Element {
  const onContinue = async (): Promise<void> => {
    await userRepo.markSignedIn();
    await appPrefsRepo.markSignInNudgeDismissed();
    navigation.goBack();
  };
  const onNotNow = async (): Promise<void> => {
    if (route.params?.source === 'auto') await appPrefsRepo.markSignInNudgeDismissed();
    navigation.goBack();
  };
  return (
    <AppScreen scroll>
      <View style={styles.wrap}>
        <Text style={styles.title}>Sign in to save your history</Text>
        <Card><Text style={styles.text}>Use Apple Sign In to keep your scans and meals safe on this device. You can skip for now.</Text></Card>
        <PrimaryButton title="Continue with Apple" onPress={() => void onContinue()} />
        <SecondaryButton title="Not now" onPress={() => void onNotNow()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.md },
  title: { fontSize: appTheme.typography.h2.fontSize, color: appTheme.colors.textPrimary, fontWeight: '700' },
  text: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body.fontSize },
});
```

## FILE: `src/config/local.ts`
```tsx
/** Default false. Set EXPO_PUBLIC_USE_MOCK_DATA=true or 1 only for dev/testing. */
const useMockEnv = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
export const USE_MOCK_DATA = useMockEnv === '1' || useMockEnv === 'true';
```

## FILE: `src/mock/home.ts`
```tsx
import { HistoryItem, MacroTotals } from '../domain/models';

export const mockHomeGreeting = 'Hello, Alex';

export const mockTodayMacros: MacroTotals = {
  caloriesKcal: 1280,
  proteinG: 82,
  carbsG: 118,
  fatG: 46,
};

export const mockRecentItems: HistoryItem[] = [
  {
    id: 'recent_1',
    type: 'menu_scan',
    title: 'Italian Bistro Lunch',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    payloadRef: 'mock_result_1',
  },
  {
    id: 'recent_2',
    type: 'meal',
    title: 'Oatmeal & Berries',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_meal_1',
  },
  {
    id: 'recent_3',
    type: 'menu_scan',
    title: 'Office Deli Menu',
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_result_2',
  },
  {
    id: 'recent_4',
    type: 'meal',
    title: 'Chicken Bowl',
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    payloadRef: 'mock_meal_2',
  },
];
```

## FILE: `src/mock/profile.ts`
```tsx
import { ActivityLevel, Sex, UserProfile } from '../domain/models';

export const mockProfile: UserProfile = {
  goal: 'Lose fat',
  dietaryPreferences: ['Gluten-free'],
  allergies: ['Eggs'],
  baseParams: {
    heightCm: 175,
    weightKg: 72,
    age: 28,
    sex: 'Male',
    activityLevel: 'Low',
  },
};

export const mockProfileMeta: {
  accountStatus: 'Guest' | 'Premium';
  trialText: string;
  sexOptions: Sex[];
  activityOptions: ActivityLevel[];
} = {
  accountStatus: 'Guest',
  trialText: '5 of 7 days left',
  sexOptions: ['Male', 'Female', 'Other', 'Prefer not to say'],
  activityOptions: ['Low', 'Medium', 'High'],
};
```

## FILE: `src/mock/topPicks.ts`
```tsx
import { MenuScanResult } from '../domain/models';

export const mockTopPicksResult: MenuScanResult = {
  id: 'mock_result_1',
  createdAt: new Date().toISOString(),
  inputImages: [],
  topPicks: [
    { name: 'Grilled Salmon Bowl', reasonShort: 'Perfect for your cutting goal. High protein, healthy fats.', tags: ['High Protein', 'Low Carb'], matchPercent: 98, macros: { caloriesKcal: 450, proteinG: 38, carbsG: 12, fatG: 22 } },
    { name: 'Roasted Chicken Breast', reasonShort: 'Lean source of protein, minimal added fats.', tags: ['Lean Protein'], matchPercent: 95, macros: { caloriesKcal: 320, proteinG: 42, carbsG: 4, fatG: 8 } },
    { name: 'Egg White Omelet', reasonShort: 'Great low-cal option loaded with micronutrients.', tags: ['Vegetarian', 'Keto Friendly'], matchPercent: 92, macros: { caloriesKcal: 280, proteinG: 25, carbsG: 8, fatG: 14 }, warningLabel: 'Contains Eggs' },
  ],
  caution: [
    { name: 'Caesar Salad', reasonShort: 'Ask for dressing on the side.', tags: ['High Fat'] },
    { name: 'Beef Burger (No Bun)', reasonShort: 'Good protein, but high saturated fat.', tags: ['High Cal'] },
  ],
  avoid: [
    { name: 'Fettuccine Alfredo', reasonShort: 'Very high calories & carbs.', tags: [] },
    { name: 'Deep-fried Combo', reasonShort: 'Energy dense and heavy in trans fats.', tags: ['Deep Fried'] },
  ],
  summaryText: 'Menu analyzed for your goal and dietary profile.',
  disclaimerFlag: true,
};
```

## FILE: `UI_QA.md`
```md
# UI Pixel-Perfect Pass – QA Checklist

Reference: design screenshots IMG_1520–1527. Branch: `ui/pixel-perfect-pass`.

## What Changed

### Single source of truth
- **`src/design/tokens.ts`** – Colors (bg, surface, ink, muted, border, primary, accent, success, etc.), spacing (4–40pt, spacingScale xs→3xl), radius (card 24, sheet 32, input 14, chip 16, pill 18, button 28), radiusScale (small 12, medium 16, large 20, xl 24), card shadow. Typography: iOS text styles (largeTitle 34/41, title1 28/34, title2 22/28, title3 20/25, headline 17/22, body 17/22, callout 16/21, subheadline 15/20, footnote 13/18, caption1 12/16, caption2 11/13); aliases hero, h1, h2, body, bodySemibold, caption, overline.
- **`src/design/theme.ts`** – Composes tokens; exports `appTheme` with semantic colors and spacing/radius aliases (xs→3xl).
- **`src/design/spec.ts`** – Spec used by components: screen padding, header dimensions, button/chip/card/input sizes, step indicator, min touch target (44pt).
- **`src/ui/theme.ts`** – Re-exports design theme as `uiTheme` for backward compatibility.
- **`src/ui/typography.ts`** – Uses design typography (hero, h1, h2, body, bodySemibold, caption, overline).

### Global layout
- **`src/ui/components/Screen.tsx`** – No top padding; only `paddingHorizontal: 20`, `paddingBottom: insets.bottom + 16`. Headers control top spacing. Supports `maxContentWidth` (default 460) for wide screens, `bottomCTAPadding` when BottomCTA is present.
- **`src/components/AppScreen.tsx`** – Same padding rules (horizontal 20, bottom insets+16, no arbitrary paddingTop).
- **`src/components/ScreenHeader.tsx`** – New header: height 56, paddingTop insets.top+8, center title, left pill (back or label e.g. "Welcome", "Goal", "Home"), optional right pill/Skip. Pill: height 36, radius 18, paddingX 14.
- **`src/ui/components/BottomCTA.tsx`** – Fixed bottom CTA container with safe area support. Use for primary actions pinned to bottom (Continue, Save Changes).

### Navigation
- **`src/app/navigation/AppNavigator.tsx`** – `headerShown: false` at navigator level; no default React Navigation titles.

### Components
- **PrimaryButton** – Height 56, radius 28, paddingHorizontal 16 (spec), primary bg, bodySemibold primaryText, disabled uses disabledBg and no shadow; min touch 44.
- **SecondaryButton** – Height 56, radius 28, paddingHorizontal 16 (spec), surface + border, bodySemibold.
- **Chip** – Height 32, radius 16, paddingX 12; selected ink/white, unselected surface/muted. Optional `small` (28/14/10, caption).
- **Card** – Radius 24, padding 20, border 1px, cardShadow.
- **TextField** – Height 52, radius 14, paddingX 16, body font.
- **SelectField** – Same input dimensions, chevron right.

### Screens
- **WelcomeScreen** – Hero image top; bottom sheet absolute bottom, radius 32, padding 20/28/insets.bottom+16; title hero, subtitle body muted maxWidth 320; CTA full width; Skip pill top-right with safe area.
- **WelcomeScreen** – Hero image full width; bottom sheet absolute bottom, maxHeight 60%, minHeight 320, radius 32, padding 20/28/insets.bottom+16; content maxWidth 460 centered; title hero, subtitle body muted maxWidth 320; CTA full width; Skip pill top-right with safe area.
- **GoalSelectionScreen** – ScreenHeader left "Welcome", title "Goal"; ScrollView with maxContentWidth 460; step indicator (dot 8, active 22×8, gap 8); title "Select your goal" h1; subtitle body muted; goal grid 2 cols adaptive (cardWidth calculated), card height 170, icon 40, radio 24; Continue BottomCTA pinned bottom.
- **DietaryProfileScreen** – ScreenHeader left "Goal", title "Dietary profile"; same step indicator; page title h1; section titles h2 marginTop 24; chips gap 12; Save BottomCTA pinned bottom, Skip link under; Add other modal.
- **HomeScreen** – No nav header, maxContentWidth 460. Top row: greeting hero, "Ready to scan?" body muted, avatar 44×44. Today card radius 24 padding 20; "Eaten" pill accentSoft/accent height 28 radius 14; macro labels overline muted, values h1; action tiles icon circle 56×56 radius 28, title h2.
- **ProfileScreen** – ScreenHeader left "Home", title "Profile"; ScrollView with bottomCTAPadding; Account, Dietary profile (link to DietaryProfile), Personal parameters (TextField Height/Weight/Age, SelectField Sex, SegmentedControl Activity); Save Changes BottomCTA pinned bottom; disclaimer caption muted.
- **MenuResultsScreen** – ScreenHeader left "Home", title "Top picks"; section title "Top picks" h1; helper body muted; summary card radius 24 padding 20; dish cards same style (h2, body muted, Chip small, "I take it" + "Why?" text link accent); Rescan secondary 56/28; "Open chat with Buddy" accent link.

## One-click check

**Одна команда (из любой папки):**

```bash
sh ~/Desktop/Buddy/check.sh
```

Или если проект не на рабочем столе:

```bash
sh /Users/alexshipulin/Desktop/Buddy/check.sh
```

Скрипт сам перейдёт в каталог проекта и запустит проверку TypeScript. Потом можно запустить приложение: `cd ~/Desktop/Buddy && npm start`.

## Verification Checklist

- [ ] **No extra top whitespace** – All screens use ScreenHeader or custom top (Welcome); no default paddingTop from Screen/AppScreen.
- [ ] **Headers** – Center title, left pill (back or label), right optional; match mock.
- [ ] **Touch targets** – Buttons and tappable areas at least 44×44pt.
- [ ] **Typography** – Only hero, h1, h2, body, bodySemibold, caption, overline; no random font sizes; maxFontSizeMultiplier 1.2 where set.
- [ ] **Cards & chips** – Same radius, padding, and shadow across screens.
- [ ] **Safe areas** – Top notch and bottom home indicator respected (insets in Screen and ScreenHeader).
- [ ] **iOS simulator** – Test on iPhone 15 Pro or similar.
- [ ] **Android** – Smoke test.

## Before/After References

- Before: Mixed spacing (6, 10, 16, 20, 28), inconsistent radii, extra top padding, navigation titles, chips/buttons not to spec, non-adaptive layouts on large screens.
- After: 8pt rhythm (4–40), single token set, no default top padding, custom ScreenHeader, buttons 56/28, chips 32/16, cards 24/20, maxContentWidth 460 on wide screens, BottomCTA for fixed actions, ScrollView support with bottom padding.

## Design QA Overlay

**`src/ui/components/DesignQAOverlay.tsx`** – Component for pixel-perfect comparison with reference images from Figma/Stitch.

Usage: Enable via dev gesture (e.g., 5 taps on title) or dev toggle. See `design/qa/README.md` for details.

Features:
- Overlay reference image with adjustable opacity (0–100%)
- Tap slider to adjust opacity
- Full-screen modal
- Use with reference PNGs in `design/reference/`

## Pixel-perfect audit (Figma + Apple HIG)

### Tokens / theme

| Change | Detail |
|--------|--------|
| **Typography** | Exact iOS line heights: largeTitle 34/41, title1 28/34, title2 22/28, title3 20/25, headline 17/22, body 17/22, callout 16/21, subheadline 15/20, footnote 13/18, caption1 12/16, caption2 11/13. Aliases hero, h1, h2, bodySemibold, caption, overline unchanged. |
| **Spacing scale** | Added `spacingScale`: xs 4, sm 8, md 16, lg 20, xl 24, 2xl 32, 3xl 40. Theme exposes appTheme.spacing.xs … 3xl. |
| **No magic numbers** | All layout values use `spec` or `appTheme`; screens and components updated to remove hardcoded 4, 6, 10, 12, 14, etc. |

### Layout / navigation

| Issue | Fix |
|-------|-----|
| Extra top whitespace | AppScreen and Screen already had no paddingTop; only horizontal and bottom padding. Confirmed no extra top padding added anywhere. |
| Default stack headers | AppNavigator already uses `headerShown: false`; all screens use custom ScreenHeader or custom top (Welcome). |
| AppScreen padding | Replaced hardcoded 20/16 with `spec.screenPaddingHorizontal` and `spec.screenPaddingBottomOffset`. |

### Screen-by-screen

| Screen | What was wrong | What changed |
|--------|----------------|-------------|
| **Welcome** | CTA marginBottom 14 (magic) | `marginBottom: spec.spacing[16]`. |
| **Goal selection** | Already using Screen + ScreenHeader, spec, tokens. | No layout change. |
| **Dietary profile** | Add other input paddingVertical 12 (magic) | `paddingVertical: spec.spacing[12]`, `minHeight: spec.inputHeight`. |
| **Home** | eatenChip 14/12/28, macroCell gap 6, actionCard gap 14, actionIcon 28, recentTime marginTop 2, recentTag padding 12/4, actionIconOrange #FFF1E2 | All from spec: chipSmallRadius/PaddingX/Height, spacing[8]/[16], primaryButtonRadius, spacing[4], chipPaddingX/spacing[4], warningSoft. |
| **Profile** | sectionLabel marginBottom 10, row minHeight 42, guestPill 10/4, profileLink gap 10, segmentWrap/premiumCard/legalCard gap 8 or 6, chevron 16, premiumSubtitle marginBottom 6 | spec.spacing[8], spec.minTouchTarget, spec.chipPaddingX/spacing[4], spec.spacing[8], typography.callout.fontSize. |
| **Menu results** | BOTTOM_BAR_* magic, compactCard radius input, paddingVertical/gap 4, marginBottom 2, cautionTag 8/4/6, dishName marginBottom 2 | BOTTOM_BAR_PADDING from spec; compactCard uses cardRadius/cardBorderWidth; all spacing from spec; caption1.fontSize for small labels; cautionTag from spec spacing and inputRadius. |

### Verification

- No debug/placeholder copy left (no "Requested from Home", "Local account (MVP)" in codebase).
- Buttons: 56pt height, 28pt radius, 16pt horizontal padding (spec).
- Cards: 24pt radius, 20pt padding, 1px border, card shadow (spec).
- Chips: 32pt height, 16pt radius, 12pt paddingX; small 28/14/10 (spec).
- 8pt grid: spacing only 4, 8, 12, 16, 20, 24, 32, 40 from tokens.
```

## FILE: `design/reference/README.md`
```md
Local design references for UI parity.

**Figma (source of truth):**  
[https://www.figma.com/design/LJOUOy0y4XIXH4MrV7hJiV/Buddy](https://www.figma.com/design/LJOUOy0y4XIXH4MrV7hJiV/Buddy?node-id=0-1)

Use the Figma file or the design archive screenshots from the active Cursor workspace assets as visual source of truth during implementation.
```

## FILE: `design/qa/README.md`
```md
# Design QA - Pixel Perfect Verification

## Overview

Design QA overlay позволяет быстро сравнивать текущий UI с эталонными скриншотами из Figma/Stitch для достижения pixel-perfect соответствия.

## Usage

### 1. Подготовка reference изображений

Экспортируйте скриншоты из Figma/Stitch в PNG и сохраните в `design/reference/`:

```
design/reference/
  ├── welcome.png
  ├── goal-selection.png
  ├── dietary-profile.png
  ├── home.png
  ├── profile.png
  └── menu-results.png
```

### 2. Использование в коде

```tsx
import { DesignQAOverlay } from '../ui/components/DesignQAOverlay';

function WelcomeScreen() {
  const [qaVisible, setQaVisible] = React.useState(false);
  const [qaOpacity, setQaOpacity] = React.useState(50);

  // Enable via gesture (e.g., 5 taps on title)
  const handleTitlePress = () => {
    // ... gesture detection logic
    setQaVisible(true);
  };

  return (
    <>
      {/* Your screen content */}
      <DesignQAOverlay
        referenceImageUri={require('../../design/reference/welcome.png')}
        opacity={qaOpacity}
        onOpacityChange={setQaOpacity}
        onClose={() => setQaVisible(false)}
        visible={qaVisible}
      />
    </>
  );
}
```

### 3. Dev gesture для включения

Добавьте в каждый экран скрытый жест (например, 5 тапов по заголовку):

```tsx
const [tapCount, setTapCount] = React.useState(0);
const tapTimeout = React.useRef<NodeJS.Timeout>();

const handleTitleTap = () => {
  setTapCount((prev) => {
    const next = prev + 1;
    if (next >= 5) {
      setQaVisible(true);
      setTapCount(0);
    }
    if (tapTimeout.current) clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => setTapCount(0), 1000);
    return next;
  });
};
```

## Checklist для pixel-perfect

- [ ] Spacing: все отступы соответствуют 4pt grid (4, 8, 12, 16, 20, 24, 32, 40)
- [ ] Typography: размеры шрифтов и line heights соответствуют iOS text styles
- [ ] Radius: радиусы карточек, кнопок, чипов соответствуют токенам
- [ ] Colors: цвета соответствуют макету (особенно акцентные и состояния)
- [ ] Safe area: контент не перекрывает notch/home indicator
- [ ] Touch targets: все интерактивные элементы минимум 44×44pt
- [ ] Bottom CTA: кнопки зафиксированы снизу с учетом safe area
- [ ] Max width: на широких экранах контент ограничен (460pt) и центрирован
- [ ] ScrollView: при нехватке места включается скролл, кнопка остается снизу

## Screenshots для регрессии

Для визуальной регрессии делайте скриншоты на разных устройствах:

```bash
# iOS Simulator
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-se-welcome.png
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-15-welcome.png
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-15-pro-max-welcome.png
```

Сравнивайте с reference изображениями вручную или через простой diff скрипт.
```
