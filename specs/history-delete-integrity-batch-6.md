# Plan: History Delete UX Integrity (Batch 6)

## Repo state before
- HistoryList.tsx uses optimistic UI deletion (removes items before API confirms)
- Confirmation dialogs already exist for all delete paths
- No "Delete all" button exists - users must select items explicitly

## Root cause found
**H1 — Optimistic UI deletion**: In `handleDelete()` function (lines 108-111), local state is updated BEFORE the API call completes. Previous state is saved for rollback on failure, but this still violates the principle of truth-before-API-success.

**H3 — Confirmation**: Already implemented correctly via Dialog component for bulk/select deletes, and inline confirming state for detail page delete.

## Files changed
1. `components/history/HistoryList.tsx` — Remove optimistic UI deletion, add disabled states during in-flight requests

## Implementation details

### Changes made:
1. **Removed optimistic UI deletion** (lines 113-149):
   - Moved `setLocalSummaries`, `setSelectedIds`, and `setClientTotalCount` to AFTER successful API response
   - Removed `previousSummaries` and `previousTotal` backup variables (no longer needed for rollback)
   - Success path now: API call → validate response → update local state → refresh

2. **Added disabled states during in-flight delete** (lines 251, 263, 413, 496):
   - "Select visible" checkbox: disabled during delete
   - Individual row checkboxes: disabled during delete
   - "Delete selected" button: disabled during delete
   - Individual "Delete" buttons: disabled during delete
   - All disabled states include `disabled:opacity-50` styling

3. **Confirmation dialogs remain intact**:
   - Bulk/select delete: Dialog component with explicit confirmation
   - Single-item delete: Dialog component with explicit confirmation
   - Detail page delete: Already has inline confirming state (no changes needed)

## Behaviour now
- User clicks delete → confirmation dialog opens
- User confirms → API call starts, `isDeleting` state set to true
- All delete-related controls disabled during in-flight request
- API success → items removed from UI, page refreshes
- API failure → items remain visible, error message shown, controls re-enabled
- **No local removal happens before API success**

## Verification run and results
```
✓ pnpm lint (components/history/HistoryList.tsx) — passed
✓ pnpm build — passed (Compiled successfully in 27.9s)
✓ Build generated all 47 static pages successfully
```

## Commit
Pending — awaiting manual verification confirmation

## Manual verification checklist
- [ ] Delete all now requires confirmation (N/A — no "Delete all" button exists)
- [ ] Delete selected now requires confirmation
- [ ] Single delete now requires confirmation
- [ ] No local removal happens before API success
- [ ] Failed delete leaves UI unchanged
- [ ] Repeated clicks prevented during in-flight delete request (all controls disabled)
