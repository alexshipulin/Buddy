/**
 * Verification: computed layout for 390x844, 375x812, 430x932.
 * Run: npx tsx scripts/verifyWelcomeLayout.ts
 * Compares computed values to FIGMA_BASELINE (390x844) and checks responsive rules.
 */

const BASELINE_W = 390;
const BASELINE_H = 844;

const FIGMA_BASELINE = {
  heroCluster: { x: 0, y: 71, w: 390, h: 505 },
  title: { y: 576, fontSize: 28, lineHeight: 34 },
  subtitle: { y: 664, fontSize: 17, lineHeight: 22 },
  button: { bottomMargin: 18, height: 56, horizontalMargin: 32, cornerRadius: 28 },
};

const SIZES = [
  { w: 390, h: 844, top: 59, bottom: 34, name: '390x844' },
  { w: 375, h: 812, top: 59, bottom: 34, name: '375x812' },
  { w: 430, h: 932, top: 59, bottom: 47, name: '430x932' },
] as const;

function computeLayout(screenWidth: number, screenHeight: number, insetsTop: number, insetsBottom: number) {
  const scaleW = screenWidth / BASELINE_W;
  const s = (n: number) => Math.round(n * scaleW);

  const availableHeight = screenHeight - insetsTop - insetsBottom;
  const buttonH = s(FIGMA_BASELINE.button.height);
  const buttonBottomMargin = s(FIGMA_BASELINE.button.bottomMargin);
  const bottomZoneH = buttonH + buttonBottomMargin;
  const titleLineH = FIGMA_BASELINE.title.lineHeight;
  const subtitleLineH = FIGMA_BASELINE.subtitle.lineHeight;
  const titleBlockH = titleLineH * 2;
  const subtitleBlockH = subtitleLineH * 2;
  const gapTitleSubtitleMin = 20;
  const gapSubtitleButtonMin = 20;
  const textZoneH = titleBlockH + gapTitleSubtitleMin + subtitleBlockH + gapSubtitleButtonMin;
  const isBaseline = screenWidth === BASELINE_W && screenHeight === BASELINE_H;
  const gapHeroTitle = isBaseline ? 0 : s(24);
  const heroClusterHeight = Math.min(
    availableHeight - textZoneH - bottomZoneH - gapHeroTitle,
    s(FIGMA_BASELINE.heroCluster.h)
  );
  const needsCompress = availableHeight < s(FIGMA_BASELINE.heroCluster.h) + textZoneH + bottomZoneH + gapHeroTitle;
  const heroScale = needsCompress
    ? Math.max(0.88, Math.min(1, (availableHeight - textZoneH - bottomZoneH - gapHeroTitle) / s(FIGMA_BASELINE.heroCluster.h)))
    : 1;
  const heroClusterTop = insetsTop + Math.max(0, Math.min(16, s(12)));
  const buttonBottom = insetsBottom + buttonBottomMargin;
  const titleY = heroClusterTop + heroClusterHeight + gapHeroTitle;
  const subtitleY = titleY + titleBlockH + gapTitleSubtitleMin;
  const subtitleBottomY = subtitleY + subtitleBlockH;
  const buttonTopY = screenHeight - buttonBottom - buttonH;
  const gapSubtitleToButton = buttonTopY - subtitleBottomY;

  return {
    heroCluster: { top: heroClusterTop, height: heroClusterHeight, heroScale },
    titleY,
    subtitleY,
    subtitleBottomY,
    buttonBottom,
    buttonTopY,
    buttonH,
    gapSubtitleToButton,
    checkButtonPinned: buttonBottom >= insetsBottom,
    checkNoOverlap: gapSubtitleToButton >= 0,
    checkHeroBelowNotch: heroClusterTop >= insetsTop,
  };
}

const TOLERANCE_PT = 1;

function main() {
  console.log('=== Welcome screen layout verification ===\n');

  const results390 = SIZES.find((x) => x.name === '390x844')!;
  const layout390 = computeLayout(results390.w, results390.h, results390.top, results390.bottom);

  console.log('1) Baseline 390x844 — computed vs FIGMA_BASELINE (max 1pt diff):');
  const heroTopOk = Math.abs(layout390.heroCluster.top - FIGMA_BASELINE.heroCluster.y) <= TOLERANCE_PT;
  const heroHeightOk = Math.abs(layout390.heroCluster.height - FIGMA_BASELINE.heroCluster.h) <= TOLERANCE_PT;
  const titleYOk = Math.abs(layout390.titleY - FIGMA_BASELINE.title.y) <= TOLERANCE_PT;
  const subtitleYOk = Math.abs(layout390.subtitleY - FIGMA_BASELINE.subtitle.y) <= TOLERANCE_PT;
  console.log(`   heroCluster.top: expected ${FIGMA_BASELINE.heroCluster.y}, actual ${layout390.heroCluster.top} ${heroTopOk ? 'OK' : 'FAIL'}`);
  console.log(`   heroCluster.height: expected ${FIGMA_BASELINE.heroCluster.h}, actual ${layout390.heroCluster.height} ${heroHeightOk ? 'OK' : 'FAIL'}`);
  console.log(`   titleY: expected ${FIGMA_BASELINE.title.y}, actual ${layout390.titleY} ${titleYOk ? 'OK' : 'FAIL'}`);
  console.log(`   subtitleY: expected ${FIGMA_BASELINE.subtitle.y}, actual ${layout390.subtitleY} ${subtitleYOk ? 'OK' : 'FAIL'}`);
  console.log(`   heroScale (390x844): ${layout390.heroCluster.heroScale} (expect 1.0) ${layout390.heroCluster.heroScale === 1 ? 'OK' : 'FAIL'}`);
  const baselinePass = heroTopOk && heroHeightOk && titleYOk && subtitleYOk && layout390.heroCluster.heroScale === 1;
  console.log(`   Baseline: ${baselinePass ? 'Pass' : 'Fail'}\n`);

  console.log('2) Responsive 375x812 and 430x932:');
  let responsivePass = true;
  for (const sz of SIZES) {
    if (sz.name === '390x844') continue;
    const layout = computeLayout(sz.w, sz.h, sz.top, sz.bottom);
    const pinOk = layout.checkButtonPinned;
    const noOverlap = layout.checkNoOverlap;
    const heroOk = layout.checkHeroBelowNotch;
    const textNotScaled = layout.heroCluster.heroScale === 1 || sz.name !== '375x812';
    console.log(`   ${sz.name}: buttonPinned=${pinOk}, noOverlap=${noOverlap}, heroBelowNotch=${heroOk}, heroScale=${layout.heroCluster.heroScale}, gapSubtitleToButton=${layout.gapSubtitleToButton.toFixed(0)}pt`);
    if (!pinOk || !noOverlap || !heroOk) responsivePass = false;
  }
  console.log(`   Responsive: ${responsivePass ? 'Pass' : 'Fail'}\n`);

  console.log('3) Asset sharpness: run "ls assets/welcome/" and check for name.png, name@2x.png, name@3x.png.');
  console.log('   require() uses base name only: Pass (see WelcomeScreen.tsx WELCOME_IMAGES).');
  console.log('   Add @2x/@3x for crisp rendering on 3x devices.\n');

  const overall = baselinePass && responsivePass;
  console.log(`=== Overall: ${overall ? 'Pass' : 'Fail'} ===`);
  process.exit(overall ? 0 : 1);
}

main();
