# UI State & Text Index
Auto-extracted handoff index for UI analysis.

## `src/screens/ChatScreen.tsx`

### States
- `input, setInput` = `''`
- `sending, setSending` = `false`
- `isPremium, setIsPremium` = `false`

### `title="..."` props
- See Premium

### `placeholder="..."` props
- Ask Buddy about your meals...

### Text nodes (sample)
- Chat with Buddy
- Your food history stays here
- No messages yet.

## `src/screens/DietaryProfileScreen.tsx`

### States
- `addOtherVisible, setAddOtherVisible` = `false`
- `addOtherInput, setAddOtherInput` = `''`

### `title="..."` props
- Add
- Dietary profile
- Save

### `placeholder="..."` props
- e.g. Broccoli

### Text nodes (sample)
- Dietary profile
- Optional. You can change this later.
- Diet preferences
- Common allergies
- Dislikes
- + Add other
- Skip
- Add dislike
- Cancel

## `src/screens/GoalSelectionScreen.tsx`

### States
- none

### `title="..."` props
- Continue
- Goal

### `placeholder="..."` props
- none

### Text nodes (sample)
- Select your goal
- Buddy will tailor picks for you.

## `src/screens/HomeScreen.tsx`

### States
- `greeting, setGreeting` = `'Hello'`

### `title="..."` props
- Add parameters

### `placeholder="..."` props
- none

### Text nodes (sample)
- Ready to scan?
- Today
- Eaten
- CAL
- PROT
- CARB
- FAT
- Add your parameters to get your personalized daily goals.
- Scan menu
- Track meal
- Recent
- Nutritional values are estimates based on AI analysis.{'\n'}Please verify with professional advice if needed.

## `src/screens/MenuResultsScreen.tsx`

### States
- `paywallHandled, setPaywallHandled` = `false`

### `title="..."` props
- Ask Buddy
- Better avoid
- Close
- I take it
- OK with caution
- Top picks

### `placeholder="..."` props
- none

### Text nodes (sample)
- Cals
- P
- C
- F
- ⚠
- ✓
- Allergen safe
- ✦
- High confidence analysis
- ‹
- Analysis Complete
- ⋯
- Menu picks
- Based on your goal and profile
- No results yet. Run a scan from Scan menu.
- ⊙
- Rescan Menu
- Open chat with Buddy
- Why this recommendation?

## `src/screens/PaywallScreen.tsx`

### States
- `loading, setLoading` = `false`

### `title="..."` props
- Not now
- Start Premium

### `placeholder="..."` props
- none

### Text nodes (sample)
- navigation.goBack()}>
- Close
- Restore
- Unlock Buddy
- Premium includes
- - Unlimited menu scans
- - Ask Buddy in chat
- - Smarter meal suggestions
- Yearly
- $39.99/year
- Cancel anytime.

## `src/screens/ProfileScreen.tsx`

### States
- `trialText, setTrialText` = `'Free'`
- `height, setHeight` = `''`
- `weight, setWeight` = `''`
- `age, setAge` = `''`

### `title="..."` props
- Profile
- Save Changes
- Upgrade to Premium

### `placeholder="..."` props
- Optional

### Text nodes (sample)
- ACCOUNT
- Status
- Guest
- Trial
- DIETARY PROFILE
- Edit dietary profile
- Preferences, allergies, diet type
- PERSONAL PARAMETERS
- Activity Level
- Unlock Premium
- Get unlimited recipes and advanced AI analysis.
- Terms of Service
- Privacy Policy
- Disclaimer: This app is for informational purposes only and does not constitute medical advice.

## `src/screens/ScanMenuScreen.tsx`

### States
- `loading, setLoading` = `false`

### `title="..."` props
- Continue

### `placeholder="..."` props
- none

### Text nodes (sample)
- navigation.goBack()}>
- Scan menu
- removePhoto(uri)}>
- X
- void addFromGallery()}>
- Import
- void takePhoto()}>
- Analyzing...
- This may take a few seconds.

## `src/screens/SignInNudgeScreen.tsx`

### States
- none

### `title="..."` props
- Continue with Apple
- Not now

### `placeholder="..."` props
- none

### Text nodes (sample)
- Sign in to save your history
- Use Apple Sign In to keep your scans and meals safe on this device. You can skip for now.

## `src/screens/TrackMealScreen.tsx`

### States
- `titleInput, setTitleInput` = `''`
- `descriptionInput, setDescriptionInput` = `''`
- `saving, setSaving` = `false`

### `title="..."` props
- Add Meal
- Cancel
- Import

### `placeholder="..."` props
- Describe your meal. Example: chicken salad with olive oil.
- Meal name (optional)

### Text nodes (sample)
- : null}
- Log what you ate
- setMode('photo')}>
- Photo
- setMode('text')}>
- Text
- Take a photo of your meal

## `src/screens/WelcomeScreen.tsx`

### States
- none

### `title="..."` props
- Get started

### `placeholder="..."` props
- none

### Text nodes (sample)
- Skip
- Pick the best dish fast
- Already have an account? Log in
