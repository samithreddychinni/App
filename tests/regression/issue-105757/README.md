# Regression Verification Protocol: Issue #105757

## Issue Summary
**Issue**: [#105757](https://github.com/Expensify/App/issues/105757) - `Mock bank is displayed as a selectable option for a new user to connect in Personal cards`

## Root Cause
In `src/pages/settings/Wallet/PersonalCards/steps/SelectBankStep.tsx:64`, the component mapped `Object.values(CONST.PERSONAL_CARDS.BANKS)` directly into selectable items without filtering out `CONST.PERSONAL_CARDS.BANKS.MOCK_BANK`.
By contrast, Company Cards (`src/pages/workspace/companyCards/addNew/SelectBankStep.tsx:63-71`) filters out `MOCK_BANK` unless running in a non-production environment (`CONFIG.ENVIRONMENT !== CONST.ENVIRONMENT.PRODUCTION`) or connected to a non-production server (`activeServer !== CONST.SERVER.PRODUCTION`). As a result, production users in the Personal Cards flow saw and could select the internal "Mock Bank" testing option.

## Fix
1. In `src/pages/settings/Wallet/PersonalCards/steps/SelectBankStep.tsx`:
   - Read `activeServer` via `useOnyx(ONYXKEYS.ACTIVE_SERVER)` (with fallback to `getActiveServer()`).
   - Filter `CONST.PERSONAL_CARDS.BANKS` to exclude `CONST.PERSONAL_CARDS.BANKS.MOCK_BANK` when `CONFIG.ENVIRONMENT === CONST.ENVIRONMENT.PRODUCTION && activeServer === CONST.SERVER.PRODUCTION`.
   - Preserve `MOCK_BANK` in development, staging, or when targeting non-production servers.

## Verification Protocol

### Test Case 1: Connect Personal Card in Production
1. Open Expensify in production environment (`CONFIG.ENVIRONMENT === 'production'`) connected to production server.
2. Navigate to Settings > Wallet > Add payment card / Connect personal card.
3. Advance to the bank selection step ("Select your bank").
4. **Expected**: "Mock Bank" is NOT displayed. Only American Express, Bank of America, Capital One, Chase, Citibank, Wells Fargo, and Other are shown.

### Test Case 2: Connect Personal Card in Staging / Dev
1. Open Expensify in staging or development environment.
2. Navigate to Settings > Wallet > Connect personal card.
3. Advance to the bank selection step.
4. **Expected**: "Mock Bank" is displayed among the available bank options for testing and QA verification.
