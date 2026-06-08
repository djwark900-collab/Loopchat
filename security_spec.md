# Firebase Security Specification

## Data Invariants
- A `Streamer` must have a valid `creatorId` matching the authenticated user's UID.
- A `Gift` must have a valid `creatorId` matching the authenticated user's UID.
- `createdAt` must be set via `serverTimestamp()`.

## The "Dirty Dozen" Payloads

### Streamers
1. Create streamer with stolen `creatorId`.
2. Create streamer with oversized `title` (DoS risk).
3. Create streamer with negative `viewersCount`.
4. Update other user's streamer document.
5. Update `creatorId` or `createdAt` on an existing streamer.
6. Delete other user's streamer document.

### Gifts
7. Create gift with stolen `creatorId`.
8. Create gift with negative `cost`.
9. Create gift with oversized `name`.
10. Update other user's gift.
11. Update `creatorId` or `createdAt` on a gift.
12. Delete other user's gift.

## Test Runner logic (Conceptual)
All the above must return PERMISSION_DENIED.
