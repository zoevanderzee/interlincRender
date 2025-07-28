# Trolley Account Mystery Investigation

## Problem
- User mariamhn@gmail.com claims she never created a Trolley account
- Database shows recipient ID: R-TAARkMAQT6VQRRYLnFQQAy
- Trolley widget shows "Email already exists" error
- System behavior suggests existing account but user denies creating it

## Investigation Results

### Database State
- User ID: 113
- Email: mariamhn@gmail.com  
- Trolley Recipient ID: R-TAARkMAQT6VQRRYLnFQQAy
- Status: pending (payout_enabled = false)

### Possible Explanations
1. **Testing Account Created Previously**: During development/testing, a real account was created using this email
2. **Admin/Developer Testing**: Someone else used this email for testing the Trolley integration
3. **Trolley System Registration**: Email was registered in Trolley during invite/widget generation process
4. **Data Migration Issue**: Old test data that wasn't properly cleaned

### Next Steps
1. Check Trolley API for actual account details
2. Consider account deletion and recreation
3. Implement bypass mechanism for existing accounts
4. Add proper account cleanup procedures

## ROOT CAUSE IDENTIFIED
**Business vs Contractor Widget Flow Mismatch:**

**Business Widget (WORKS):**
- Uses `trolleySdk.generateWidgetUrl(email, referenceId)`
- Widget handles all account creation internally
- No pre-API recipient creation

**Contractor Widget (FAILED):**
- Attempted `trolleyService.createRecipient()` API call FIRST
- Then widget generation 
- But email already exists in Trolley from business setup

## SOLUTION IMPLEMENTED
**Unified Widget-Only Approach:**
- Contractor flow now identical to business flow
- No pre-API recipient creation
- Widget handles everything including existing account conflicts
- Both use same `trolleySdk.generateWidgetUrl()` pattern