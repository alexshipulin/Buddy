# UI QA Checklist

## Devices checked
- Small: iPhone SE size (compact height)
- Medium: iPhone 13/14 size
- Large: iPhone Pro Max size

## Safe area checks
- Header content is visible below notch/dynamic island.
- Bottom CTA buttons are visible above home indicator.
- Scan camera overlays respect top/bottom insets.

## Scroll checks
- Long screens scroll correctly: Dietary Profile, Menu Results, Paywall, Home, Profile.
- Content on compact devices remains reachable.
- Last elements are not clipped at the bottom.

## Keyboard checks
- Chat: composer remains visible while keyboard is open.
- Profile: all inputs stay reachable while keyboard is shown.
- Track Meal: inputs and submit button remain accessible with keyboard.
- Tap outside input dismisses keyboard where expected.

## Button checks
- Primary/Secondary buttons support normal, pressed, disabled, loading states.
- Touch target is at least 44px height.
- Icon-like pressables use hit slop (e.g. scan back/remove controls, welcome skip, home avatar).

## Seed data checks
- Seed runs once (idempotent via storage flag).
- Home has populated recent list (menu scan + meal).
- Today macros are non-zero due seeded meal.
- Chat has a sample thread (3+ messages).
- Trial state has remaining days (5 of 7 style behavior).

## Known limitations
- Camera functionality depends on device permission availability.
- AI quality/latency depends on network and local `.env` API key setup.
