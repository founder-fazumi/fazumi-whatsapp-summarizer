# Fazumi Test Accounts

## Local Development

Use the dev API to create test accounts:

```powershell
# Create all test accounts
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/create-test-accounts

# Test accounts created:
# - free@fazumi.test / @fr33T3ST1ng (Free plan)
# - paid@fazumi.test / @pa1dT3ST1ng (Paid plan -> monthly entitlement)
# - founder@fazumi.test / @f0underT3ST1ng (Founder plan)
```

## Change Plan (Local Only)

```powershell
# Set to paid
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan `
  -ContentType "application/json" `
  -Body '{"email":"paid@fazumi.test","plan":"paid"}'

# Set to founder
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan `
  -ContentType "application/json" `
  -Body '{"email":"founder@fazumi.test","plan":"founder"}'

# Reset to free trial
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan `
  -ContentType "application/json" `
  -Body '{"email":"free@fazumi.test","plan":"free"}'
```

## Production Testing

Create real test accounts via:

1. Visit https://fazumi.app/login
2. Sign up with test email: test+fazumi@gmail.com
3. Complete onboarding
4. Test summarize flow
5. Delete test data after testing

## Test Checklist

For each account type, verify:

### Free Trial Account
- [ ] Can sign up
- [ ] Gets 3 summaries/day
- [ ] 4th summary shows limit error
- [ ] History accessible

### Paid Account
- [ ] Can upgrade via Lemon Squeezy
- [ ] Webhook updates plan
- [ ] Gets 50 summaries/day
- [ ] Billing page shows active subscription

### Founder Account
- [ ] Can purchase Founder plan
- [ ] Lifetime access works
- [ ] Founder badge displays

## Notes

- Verified locally on March 2, 2026: `/api/dev/create-test-accounts` returns all three seed users and `/api/dev/set-plan` accepts `free`, `paid`, `monthly`, and `founder`.
- The webhook replay harness upgrades `free@fazumi.test` for the founder order fixture and uses `paid@fazumi.test` for recurring payment fixtures.
