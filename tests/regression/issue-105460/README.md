# Regression Verification Protocol: Issue #105460

## Issue Summary
**Issue**: [#105460](https://github.com/Expensify/App/issues/105460) - `[Exploratory] Invoice - Billable toggle auto-off after creating the invoice`

## Root Cause
In `src/libs/actions/IOU/SendInvoice.ts`:
1. When creating an invoice, `getSendInvoiceInformation()` correctly assigns `billable`, `tag`, `taxCode`, and `taxAmount` to the optimistic transaction in Onyx.
2. However, in `sendInvoice()` (lines 849–871), the `parameters: SendInvoiceParams` payload constructed for `API.writeWhenReady(WRITE_COMMANDS.SEND_INVOICE, parameters, ...)` omitted `billable`, `tag`, `taxCode`, and `taxAmount` (they were also omitted from the `SendInvoiceParams` type definition).
3. As a result, the backend `SendInvoice` command never received the `billable` flag from the client, defaulting it to `false`. When the server persisted the transaction and synced it back to Onyx, the server's `billable: false` overwrote the optimistic transaction, causing the Billable toggle in `MoneyRequestView` to revert to OFF upon reopening the invoice.

## Fix
1. In `src/libs/API/parameters/SendInvoiceParams.ts`:
   - Add optional `billable?: boolean;`, `tag?: string;`, `taxCode?: string;`, and `taxAmount?: number;` to the `SendInvoiceParams` type.
2. In `src/libs/actions/IOU/SendInvoice.ts`:
   - Forward `billable: transaction?.billable`, `tag: transaction?.tag`, `taxCode: transaction?.taxCode`, and `taxAmount: transaction?.taxAmount` in the `parameters` payload passed to `WRITE_COMMANDS.SEND_INVOICE`.

## Verification Protocol

### Test Case 1: Send billable invoice from workspace with default billable rule
1. Open a workspace with Rules enabled and default Billable set to "Billable".
2. Click FAB (+) > Send Invoice.
3. Select a recipient, enter amount and description.
4. On the confirmation page, confirm the "Billable" toggle is enabled.
5. Click "Send invoice".
6. Open the newly created invoice from chat or Inbox.
7. **Expected**: The Billable toggle remains enabled (ON) after creating and reopening the invoice.
