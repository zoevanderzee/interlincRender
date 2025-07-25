# Trolley Existing Account Issue Resolution

## Problem
- User `mariamhn@gmail.com` has existing Trolley recipient ID: `R-TAARkMAQT6VQRRYLnFQQAy`
- Status: "pending" (incomplete setup)
- Widget shows "Email already exists" error when trying to create new account

## Root Cause
- Trolley widget tries to create new account but email is already registered
- Need different approach for existing recipients vs new recipients

## Business Widget vs Contractor Widget
- **Business widget**: Works because it's for submerchant accounts (different system)
- **Contractor widget**: Fails because it's for recipient accounts (same system as existing account)

## Solutions Attempted
1. ✅ Unified both widgets to use identical `trolleySdk.generateWidgetUrl()` implementation
2. ❌ Still getting "Email already exists" because account exists in Trolley system

## Next Steps Required
1. **Option A**: Use Trolley's widget update/completion flow for existing recipients
2. **Option B**: Direct user to complete existing account through Trolley dashboard
3. **Option C**: Contact Trolley support to understand proper widget flow for existing pending accounts

## Current Status
- Contractor widget now uses identical implementation as business widget
- Both generate proper URLs with `refid` parameter
- Issue is not with our implementation but with Trolley's handling of existing accounts