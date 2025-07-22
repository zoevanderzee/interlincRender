# Payment Troubleshooting Guide

If you're experiencing payment issues during subscription signup, here are the most common solutions:

## "Unable to Authenticate Your Payment Method"

This error typically means your bank or card issuer is blocking the payment. Try these solutions:

### 1. Check Your Card Details
- Verify the card number is correct
- Check the expiration date
- Ensure the security code (CVC) is accurate
- Confirm the billing address matches your card statement

### 2. Try a Different Card
- Use a different credit/debit card
- Business cards often have different authentication requirements
- Some banks block international payments - try a card from a different bank

### 3. Contact Your Bank
- Call the customer service number on your card
- Tell them you're trying to make a legitimate online business payment
- Ask them to authorize payments to "Stripe" (our payment processor)
- Some banks automatically block subscription payments as fraud protection

### 4. Use a Different Browser
- Try an incognito/private browsing window
- Clear your browser cache and cookies
- Disable ad blockers or browser extensions temporarily

### 5. Check Your Internet Connection
- Use a stable, secure internet connection
- Avoid public Wi-Fi for payment transactions

### 6. 3D Secure Authentication
- Some cards require additional authentication (3D Secure/Verified by Visa)
- Make sure you complete any authentication steps from your bank
- Check for pop-ups that might be blocked by your browser

## Still Having Issues?

If you continue to experience problems:

1. **Try the £1.00 Test Plan first** - This minimal charge is often easier to process
2. **Use a personal card instead of a business card** - Personal cards often have fewer restrictions
3. **Contact your bank** - They can see exactly why the payment was declined
4. **Contact us** - Email support with your error message and we'll help troubleshoot

## Common Error Codes

- **authentication_required**: Your bank needs additional verification
- **card_declined**: Your bank declined the payment
- **insufficient_funds**: Not enough available credit/balance
- **incorrect_cvc**: Wrong security code entered
- **expired_card**: Your card has expired
- **generic_decline**: General decline from your bank - contact them for details

## Technical Note

We use Stripe for secure payment processing. All payment data is handled by Stripe (a PCI-compliant payment processor) and never stored on our servers. Your payment information is secure.