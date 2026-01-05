# Troubleshooting Guide

## Google OAuth Login Not Working

**Date:** January 5, 2026

**Symptoms:**
- Clicking "Sign in with Google" doesn't work
- OAuth flow fails silently or returns an error

**Root Cause:**
Missing Chrome extension redirect URI in Google Cloud Console OAuth credentials. The `chrome.identity.launchWebAuthFlow` API requires the extension's redirect URL to be whitelisted in addition to the Supabase callback URL.

**Solution:**
Add both redirect URIs to Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → [Your Client]:

1. **Supabase callback URL:**
   ```
   https://jlrdpgwmcrdmhirwcguu.supabase.co/auth/v1/callback
   ```

2. **Chrome extension redirect URL:**
   ```
   https://<extension-id>.chromiumapp.org/
   ```

   For this extension: `https://ahjppgfhnkeejgbkjjlkaoldbccnfmdp.chromiumapp.org/`

**How to find your extension ID:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Find "Tab Organizer" and copy the ID

**Additional Requirements:**
- OAuth consent screen must have your email as a test user (if in Testing mode)
- Google provider must be enabled in Supabase Authentication → Providers
- Client ID and Secret in Supabase must match Google Cloud Console credentials

**Key Learning:**
For Chrome extensions using `chrome.identity.launchWebAuthFlow` with Supabase OAuth, you need **two** redirect URIs configured in Google Cloud Console, not just one.
