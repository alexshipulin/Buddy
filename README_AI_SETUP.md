# AI Service Setup Guide

## Secure Gemini API Integration

This project uses Google Gemini API securely via environment variables.

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your Gemini API key to `.env`:**
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Optional: Enable test mode (removes Premium restrictions and scan limits):**
   ```
   EXPO_PUBLIC_TEST_MODE=true
   ```
   In test mode:
   - Chat works without Premium
   - Menu scan has no daily limit
   - Paywall screens remain accessible but don't block functionality

4. **Restart Expo development server:**
   ```bash
   npm start
   ```

## Architecture

- **Centralized AI Service**: All Gemini API calls go through `src/services/aiService.ts`
- **Automatic Fallback**: If API key is missing, the app uses mock responses
- **Backend-Ready**: UI only calls `aiService`, making future backend migration seamless

## Security

✅ API key is never hardcoded  
✅ `.env` is gitignored  
✅ No API key in logs or debug output  
✅ Key only sent in API request headers  

## Files

- `src/services/aiService.ts` - Centralized AI service layer
- `.env` - Your local API key (gitignored)
- `.env.example` - Template file (committed)
- `src/data/providers/GeminiMenuAnalysisProvider.ts` - Gemini integration
- `src/data/providers/MockMenuAnalysisProvider.ts` - Fallback mock provider

## API Functions

- `analyzeMenu(images)` - Analyze menu photos
- `analyzeMealPhoto(imageUri)` - Analyze meal photo for macros
- `askBuddy(message, context)` - Chat with Buddy AI

All functions automatically fall back to mock data if API key is missing.
