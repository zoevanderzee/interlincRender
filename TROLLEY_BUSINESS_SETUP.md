# Trolley Business Account Setup - Critical Configuration Guide

## Issue Resolution Summary (August 14, 2025)

### Problem Identified
- Business users were incorrectly created as "Individual" type in Trolley
- Root cause: Widget generation omitted `type: 'business'` parameter
- Trolley defaulted to Individual verification flow
- Individual widgets don't collect business information (EIN, business bank accounts, etc.)

### User Impact
- zoevdzee@creativlinc.co.uk completed Individual verification instead of Business
- Trolley profile showed blank business fields
- Bank account setup required manual correction

## Complete Fix Implementation

### 1. Widget Generation Fixed
**Files Updated:** `server/trolley-service.ts`, `server/trolley-sdk-service.ts`

**Change:** Added `type: 'business'` to all widget generation functions

```javascript
const queryParams: Record<string, string> = {
  ts: timestamp.toString(),
  key: this.apiKey,
  email: options.recipientEmail,
  products: (options.products || ['pay', 'tax']).join(','),
  hideEmail: 'false',
  roEmail: 'false',
  locale: 'en',
  type: 'business'  // CRITICAL: Force business type for all users
};
```

### 2. Registration Flow Enhanced
**File Updated:** `server/auth.ts`

**Change:** Business registration now creates both:
- Trolley submerchant account (for payment processing)
- Trolley business recipient (for bank account verification)

**Key Addition:**
```javascript
// Create BUSINESS recipient (not individual) - CRITICAL FIX
const businessRecipient = await trolleyService.createRecipient({
  email: user.email,
  firstName: user.company || user.username,
  lastName: 'Business',
  type: 'business'  // FORCE BUSINESS TYPE - prevents Individual widget bug
});
```

### 3. Prevention Measures
1. **Type Enforcement**: All widget URLs now explicitly force business type
2. **Registration Integration**: Business recipients created automatically during signup
3. **Database Linking**: Proper recipient ID stored in user record
4. **Verification Flow**: Business users directed to business verification immediately

## Business vs Individual Widgets

### Individual Widgets (OLD - INCORRECT)
- Collects: SSN, personal bank account, individual documents
- Verification: Personal identity only
- Result: Individual recipient type in Trolley

### Business Widgets (NEW - CORRECT)
- Collects: EIN, business bank account, business registration documents
- Verification: Business entity + beneficial ownership
- Result: Business recipient type in Trolley

## User Resolution Status
- **zoevdzee@creativlinc.co.uk**: Manually corrected in Trolley dashboard
- **Database Status**: Company profile ID 86 linked, recipient ID cleared for recreation
- **Verification**: Business type confirmed, bank transfer method active

## Zero Tolerance Policy
- NO test/simulation data allowed in live system
- ALL business users MUST use business verification flow
- NO individual verification for business accounts
- LIVE money transfers only through verified business accounts

## Future Business Registrations
New business users will automatically:
1. Create Trolley submerchant account for payment processing
2. Create Trolley business recipient for bank verification
3. Receive business-type widget for proper verification flow
4. Complete business documentation requirements
5. Link verified business bank accounts

This ensures 100% compliance with business verification requirements and prevents the type mismatch bug from recurring.