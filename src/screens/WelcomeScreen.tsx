import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { appTheme } from '../design/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type Rect = { x: number; y: number; w: number; h: number };
type Frame = { left: number; top: number; width: number; height: number };
type BouncyProps = {
  enabled: boolean;
  amplitudePx: number;
  scaleTo: number;
  durationMs: number;
  delayMs: number;
  children: React.ReactNode;
};

const FIGMA_BASE = { w: 390, h: 844 } as const;
const CONTENT_INSET = 32;
const BUTTON_BOTTOM_GAP = 32;

const RECTS = {
  ellipseMain: { x: 105, y: 206.644, w: 174, h: 174 },
  ellipseCamera: { x: 61, y: 152, w: 64.488, h: 63.395 },
  ellipseFork: { x: 78.734, y: 315.352, w: 61.425, h: 60.384 },
  ellipseBrain: { x: 229.475, y: 184.763, w: 63.14, h: 62.07 },
  ellipseCheck: { x: 273.811, y: 366.136, w: 54.815, h: 53.886 },
  ellipseTarget: { x: 143.222, y: 420.145, w: 40.18, h: 39.499 },
  sticker: { x: 146, y: 246.644, w: 93, h: 93 },
  cameraWithFlash: { x: 75.209, y: 165.116, w: 36.07, h: 36.07 },
  forkKnifePlate: { x: 92.269, y: 328.886, w: 33.315, h: 33.315 },
  brain: { x: 243.388, y: 197.605, w: 35.316, h: 35.316 },
  checkMarkButton: { x: 285.889, y: 377.285, w: 30.659, h: 30.659 },
  directHit: { x: 152.076, y: 428.317, w: 22.474, h: 22.474 },
  pizza: { x: 166, y: 175, w: 23, h: 23 },
  spaghetti: { x: 75, y: 261, w: 23, h: 23 },
  croissant: { x: 216, y: 381, w: 23, h: 23 },
  burrito: { x: 293, y: 292, w: 23, h: 23 },
  stuffedFlatbread: { x: 61, y: 405, w: 23, h: 23 },
  avocado: { x: 306, y: 152, w: 23, h: 23 },
  button: { x: 32, y: 0, w: 326, h: 60 },
} as const;

const GRAPHICS_BOUNDS = { x: 61, y: 152, w: 268, h: 307.644 } as const;
const GRAPHICS_TARGET_WIDTH = FIGMA_BASE.w - CONTENT_INSET * 2;
const GRAPHICS_SCALE = GRAPHICS_TARGET_WIDTH / GRAPHICS_BOUNDS.w;
const GRAPHICS_TOP_BASE = GRAPHICS_BOUNDS.y / 2;
const GRAPHICS_TOP_EXTRA = 14;
const TEXT_GAP = 16;
const TEXT_SAFE_GAP = 12;

const STICKER_IMAGE: ImageSourcePropType = require('../../assets/welcome/sticker.png');

const ELLIPSE_MAIN_BG = '#F0F0F0';
const ELLIPSE_BG = '#F4F4F4';
const ELLIPSE_BORDER = '#ECECEC';
const SCREEN_BG = '#F7F7F7';

function roundToPx(n: number): number {
  return PixelRatio.roundToNearestPixel(n);
}

function scaleRect(rect: Rect, scale: number, offsetX: number, offsetY: number): Frame {
  return {
    left: roundToPx(offsetX + rect.x * scale),
    top: roundToPx(offsetY + rect.y * scale),
    width: roundToPx(rect.w * scale),
    height: roundToPx(rect.h * scale),
  };
}

function scaleGraphicRect(rect: Rect, scale: number, offsetX: number, offsetY: number): Frame {
  const xLocal = rect.x - GRAPHICS_BOUNDS.x;
  const yLocal = rect.y - GRAPHICS_BOUNDS.y;
  return {
    left: roundToPx(offsetX + (CONTENT_INSET + xLocal * GRAPHICS_SCALE) * scale),
    top: roundToPx(
      offsetY + (GRAPHICS_TOP_BASE + GRAPHICS_TOP_EXTRA + yLocal * GRAPHICS_SCALE) * scale
    ),
    width: roundToPx(rect.w * GRAPHICS_SCALE * scale),
    height: roundToPx(rect.h * GRAPHICS_SCALE * scale),
  };
}

function unionFrame(a: Frame, b: Frame): Frame {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

function localFrame(parent: Frame, child: Frame): Frame {
  return {
    left: child.left - parent.left,
    top: child.top - parent.top,
    width: child.width,
    height: child.height,
  };
}

function frameBottom(frame: Frame): number {
  return frame.top + frame.height;
}

function emojiLocalFrame(frame: Frame): Frame {
  return { left: 0, top: 0, width: frame.width, height: frame.height };
}

function EmojiGlyph({ char, frame }: { char: string; frame: Frame }): React.JSX.Element {
  const iconSize = Math.min(frame.width, frame.height);
  const boxSize = roundToPx(iconSize * 1.18);
  const glyphSize = roundToPx(iconSize * 0.82);

  return (
    <View
      style={[
        styles.emojiWrap,
        {
          left: roundToPx(frame.left + (frame.width - boxSize) / 2),
          top: roundToPx(frame.top + (frame.height - boxSize) / 2),
          width: boxSize,
          height: boxSize,
        },
      ]}
    >
      <Text
        style={[styles.emoji, { fontSize: glyphSize, lineHeight: roundToPx(glyphSize * 1.18) }]}
        allowFontScaling={false}
      >
        {char}
      </Text>
    </View>
  );
}

function Bouncy({
  enabled,
  amplitudePx,
  scaleTo,
  durationMs,
  delayMs,
  children,
}: BouncyProps): React.JSX.Element {
  const p = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    p.stopAnimation();
    if (!enabled) {
      p.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(p, {
          toValue: 1,
          duration: Math.round(durationMs / 2),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(p, {
          toValue: 0,
          duration: Math.round(durationMs / 2),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delayMs, durationMs, enabled, p]);

  const translateY = p.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -amplitudePx],
  });
  const scale = p.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleTo],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bouncyFill, { transform: [{ translateY }, { scale }] }]}
    >
      {children}
    </Animated.View>
  );
}

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [reduceMotionEnabled, setReduceMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotionEnabled(value);
      })
      .catch(() => {
        if (mounted) setReduceMotionEnabled(false);
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => setReduceMotionEnabled(value)
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const bouncyEnabled = !reduceMotionEnabled;

  const verticalSpace = screenHeight - insets.top - insets.bottom;
  const scale = Math.min(screenWidth / FIGMA_BASE.w, verticalSpace / FIGMA_BASE.h, 1);
  const offsetX = roundToPx((screenWidth - FIGMA_BASE.w * scale) / 2);
  const topOffset = roundToPx(Math.min(insets.top, 12));
  const textScale = Math.min(scale, 1);

  const frames = React.useMemo(
    () => ({
      ellipseMain: scaleGraphicRect(RECTS.ellipseMain, scale, offsetX, topOffset),
      ellipseCamera: scaleGraphicRect(RECTS.ellipseCamera, scale, offsetX, topOffset),
      ellipseFork: scaleGraphicRect(RECTS.ellipseFork, scale, offsetX, topOffset),
      ellipseBrain: scaleGraphicRect(RECTS.ellipseBrain, scale, offsetX, topOffset),
      ellipseCheck: scaleGraphicRect(RECTS.ellipseCheck, scale, offsetX, topOffset),
      ellipseTarget: scaleGraphicRect(RECTS.ellipseTarget, scale, offsetX, topOffset),
      sticker: scaleGraphicRect(RECTS.sticker, scale, offsetX, topOffset),
      cameraWithFlash: scaleGraphicRect(RECTS.cameraWithFlash, scale, offsetX, topOffset),
      forkKnifePlate: scaleGraphicRect(RECTS.forkKnifePlate, scale, offsetX, topOffset),
      brain: scaleGraphicRect(RECTS.brain, scale, offsetX, topOffset),
      checkMarkButton: scaleGraphicRect(RECTS.checkMarkButton, scale, offsetX, topOffset),
      directHit: scaleGraphicRect(RECTS.directHit, scale, offsetX, topOffset),
      pizza: scaleGraphicRect(RECTS.pizza, scale, offsetX, topOffset),
      spaghetti: scaleGraphicRect(RECTS.spaghetti, scale, offsetX, topOffset),
      croissant: scaleGraphicRect(RECTS.croissant, scale, offsetX, topOffset),
      burrito: scaleGraphicRect(RECTS.burrito, scale, offsetX, topOffset),
      stuffedFlatbread: scaleGraphicRect(RECTS.stuffedFlatbread, scale, offsetX, topOffset),
      avocado: scaleGraphicRect(RECTS.avocado, scale, offsetX, topOffset),
    }),
    [offsetX, scale, topOffset]
  );

  const plateGroupFrame = React.useMemo(
    () => unionFrame(frames.ellipseFork, frames.forkKnifePlate),
    [frames.ellipseFork, frames.forkKnifePlate]
  );
  const brainGroupFrame = React.useMemo(
    () => unionFrame(frames.ellipseBrain, frames.brain),
    [frames.ellipseBrain, frames.brain]
  );
  const cameraGroupFrame = React.useMemo(
    () => unionFrame(frames.ellipseCamera, frames.cameraWithFlash),
    [frames.ellipseCamera, frames.cameraWithFlash]
  );
  const checkGroupFrame = React.useMemo(
    () => unionFrame(frames.ellipseCheck, frames.checkMarkButton),
    [frames.ellipseCheck, frames.checkMarkButton]
  );
  const targetGroupFrame = React.useMemo(
    () => unionFrame(frames.ellipseTarget, frames.directHit),
    [frames.ellipseTarget, frames.directHit]
  );

  const buttonRect = scaleRect(RECTS.button, scale, offsetX, 0);
  const buttonBottom = roundToPx(insets.bottom + BUTTON_BOTTOM_GAP * scale);
  const buttonTop = roundToPx(screenHeight - buttonBottom - buttonRect.height);

  const graphicsBottom = Math.max(
    frameBottom(frames.ellipseMain),
    frameBottom(plateGroupFrame),
    frameBottom(brainGroupFrame),
    frameBottom(cameraGroupFrame),
    frameBottom(checkGroupFrame),
    frameBottom(frames.stuffedFlatbread),
    frameBottom(frames.avocado),
    frameBottom(frames.croissant),
    frameBottom(frames.pizza),
    frameBottom(frames.burrito),
    frameBottom(frames.spaghetti),
    frameBottom(targetGroupFrame)
  );

  const titleLineHeight = roundToPx(54 * textScale);
  const subtitleLineHeight = roundToPx(24 * textScale);
  const titleHeight = titleLineHeight * 2;
  const subtitleHeight = subtitleLineHeight * 2;
  const textGap = roundToPx(TEXT_GAP * textScale);
  const textBlockHeight = titleHeight + textGap + subtitleHeight;
  const minTextTop = graphicsBottom + roundToPx(TEXT_SAFE_GAP * textScale);
  const maxTextTop = buttonTop - roundToPx(TEXT_SAFE_GAP * textScale) - textBlockHeight;
  const centeredTextTop = roundToPx((graphicsBottom + buttonTop - textBlockHeight) / 2);
  const textBlockTop =
    maxTextTop >= minTextTop
      ? Math.min(Math.max(centeredTextTop, minTextTop), maxTextTop)
      : minTextTop;
  const subtitleTop = textBlockTop + titleHeight + textGap;

  const targetCircleLocal = localFrame(targetGroupFrame, frames.ellipseTarget);
  const targetIconLocal = localFrame(targetGroupFrame, frames.directHit);
  const plateCircleLocal = localFrame(plateGroupFrame, frames.ellipseFork);
  const plateIconLocal = localFrame(plateGroupFrame, frames.forkKnifePlate);
  const brainCircleLocal = localFrame(brainGroupFrame, frames.ellipseBrain);
  const brainIconLocal = localFrame(brainGroupFrame, frames.brain);
  const checkCircleLocal = localFrame(checkGroupFrame, frames.ellipseCheck);
  const checkIconLocal = localFrame(checkGroupFrame, frames.checkMarkButton);
  const cameraCircleLocal = localFrame(cameraGroupFrame, frames.ellipseCamera);
  const cameraIconLocal = localFrame(cameraGroupFrame, frames.cameraWithFlash);

  return (
    <View style={[styles.root, { backgroundColor: SCREEN_BG }]}>
      <View style={[styles.absoluteItem, frames.stuffedFlatbread]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={4}
          scaleTo={1.019}
          durationMs={3300}
          delayMs={150}
        >
          <EmojiGlyph char="🌮" frame={emojiLocalFrame(frames.stuffedFlatbread)} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, frames.avocado]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.015}
          durationMs={3450}
          delayMs={260}
        >
          <EmojiGlyph char="🥑" frame={emojiLocalFrame(frames.avocado)} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, frames.croissant]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={4}
          scaleTo={1.017}
          durationMs={3200}
          delayMs={530}
        >
          <EmojiGlyph char="🥐" frame={emojiLocalFrame(frames.croissant)} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, frames.pizza]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.016}
          durationMs={2900}
          delayMs={420}
        >
          <EmojiGlyph char="🍕" frame={emojiLocalFrame(frames.pizza)} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, frames.burrito]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={5}
          scaleTo={1.022}
          durationMs={3550}
          delayMs={0}
        >
          <EmojiGlyph char="🌯" frame={emojiLocalFrame(frames.burrito)} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, frames.spaghetti]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.016}
          durationMs={3350}
          delayMs={210}
        >
          <EmojiGlyph char="🍝" frame={emojiLocalFrame(frames.spaghetti)} />
        </Bouncy>
      </View>

      <View style={[styles.absoluteItem, plateGroupFrame, styles.foregroundOrbitGroup]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.014}
          durationMs={3050}
          delayMs={110}
        >
          <View
            style={[
              styles.ellipse,
              plateCircleLocal,
              { borderRadius: roundToPx(plateCircleLocal.width / 2) },
              styles.ellipseSmall,
            ]}
          />
          <EmojiGlyph char="🍽️" frame={plateIconLocal} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, brainGroupFrame, styles.foregroundOrbitGroup]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={4}
          scaleTo={1.018}
          durationMs={3650}
          delayMs={340}
        >
          <View
            style={[
              styles.ellipse,
              brainCircleLocal,
              { borderRadius: roundToPx(brainCircleLocal.width / 2) },
              styles.ellipseSmall,
            ]}
          />
          <EmojiGlyph char="🧠" frame={brainIconLocal} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, checkGroupFrame]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.014}
          durationMs={2900}
          delayMs={600}
        >
          <View
            style={[
              styles.ellipse,
              checkCircleLocal,
              { borderRadius: roundToPx(checkCircleLocal.width / 2) },
              styles.ellipseSmall,
            ]}
          />
          <EmojiGlyph char="✅" frame={checkIconLocal} />
        </Bouncy>
      </View>
      <View style={[styles.absoluteItem, cameraGroupFrame]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.016}
          durationMs={3300}
          delayMs={480}
        >
          <View
            style={[
              styles.ellipse,
              cameraCircleLocal,
              { borderRadius: roundToPx(cameraCircleLocal.width / 2) },
              styles.ellipseSmall,
            ]}
          />
          <EmojiGlyph char="📸" frame={cameraIconLocal} />
        </Bouncy>
      </View>

      <View style={[styles.absoluteItem, targetGroupFrame]}>
        <Bouncy
          enabled={bouncyEnabled}
          amplitudePx={3}
          scaleTo={1.015}
          durationMs={3100}
          delayMs={720}
        >
          <View
            style={[
              styles.ellipse,
              targetCircleLocal,
              { borderRadius: roundToPx(targetCircleLocal.width / 2) },
              styles.ellipseSmall,
            ]}
          />
          <EmojiGlyph char="🎯" frame={targetIconLocal} />
        </Bouncy>
      </View>

      <View
        style={[
          styles.ellipse,
          frames.ellipseMain,
          { borderRadius: roundToPx(frames.ellipseMain.width / 2) },
          styles.ellipseMain,
          styles.centerForeground,
        ]}
      />

      <View style={[styles.absoluteItem, frames.sticker, styles.centerForeground]}>
        <Image source={STICKER_IMAGE} style={styles.asset} resizeMode="contain" fadeDuration={0} />
      </View>

      <View
        style={[
          styles.titleWrap,
          {
            left: buttonRect.left,
            top: textBlockTop,
            width: buttonRect.width,
          },
        ]}
      >
        <Text
          style={[styles.title, { fontSize: roundToPx(48 * textScale), lineHeight: titleLineHeight }]}
          maxFontSizeMultiplier={1.1}
          numberOfLines={2}
        >
          Eat out{'\n'}with a plan
        </Text>
      </View>

      <View
        style={[
          styles.subtitleWrap,
          {
            left: buttonRect.left,
            top: subtitleTop,
            width: buttonRect.width,
          },
        ]}
      >
        <Text
          style={[styles.subtitle, { fontSize: roundToPx(16 * textScale), lineHeight: subtitleLineHeight }]}
          maxFontSizeMultiplier={1.2}
        >
          Scan menu and smart personal assistant
        </Text>
        <Text
          style={[styles.subtitle, { fontSize: roundToPx(16 * textScale), lineHeight: subtitleLineHeight }]}
          maxFontSizeMultiplier={1.2}
        >
          picks the best dish for your goal.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.ctaPill,
          {
            left: buttonRect.left,
            width: buttonRect.width,
            bottom: buttonBottom,
            height: buttonRect.height,
            borderRadius: roundToPx(buttonRect.height / 2),
          },
          pressed && styles.ctaPressed,
        ]}
        onPress={() => navigation.navigate('GoalSelection')}
      >
        <View style={styles.ctaContent}>
          <Text
            style={[
              styles.ctaText,
              { fontSize: roundToPx(18 * textScale), lineHeight: roundToPx(28 * textScale) },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            Get started
          </Text>
          <Text style={[styles.ctaArrow, { fontSize: roundToPx(24 * textScale) }]}>{'→'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerForeground: { zIndex: 2 },
  foregroundOrbitGroup: { zIndex: 3 },
  absoluteItem: { position: 'absolute' },
  ellipse: { position: 'absolute' },
  ellipseMain: { backgroundColor: ELLIPSE_MAIN_BG },
  ellipseSmall: {
    backgroundColor: ELLIPSE_BG,
    borderWidth: 1,
    borderColor: ELLIPSE_BORDER,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  asset: { width: '100%', height: '100%' },
  bouncyFill: { ...StyleSheet.absoluteFillObject },
  emojiWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { textAlign: 'center' },
  titleWrap: { position: 'absolute' },
  subtitleWrap: { position: 'absolute' },
  title: {
    fontWeight: '900',
    color: appTheme.colors.textPrimary,
    textAlign: 'left',
    letterSpacing: -0.4,
  },
  subtitle: { fontWeight: '400', color: appTheme.colors.textPrimary, textAlign: 'left' },
  ctaPill: {
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.primaryButton,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  ctaPressed: { opacity: 0.94 },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { fontWeight: '600', color: appTheme.colors.primaryText },
  ctaArrow: { marginTop: -1, fontWeight: '300', color: appTheme.colors.primaryText },
});
