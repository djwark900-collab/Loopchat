# Security Specification - LoopChat Streaming Simulator

## 1. Data Invariants
- A `User` profile must be owned by the authenticated user with the same UID.
- `Streamers` (live sessions) must have a `creatorId` matching the authenticated user who created them.
- `ViewersCount` on a stream can be incremented by anyone (to allow passive viewer joining).
- `Gifts` are public to read but only owners or admins can modify them.
- `CoinCodes` are used for redemption; their value and existence are sensitive but `get` is allowed for checking validity.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Creating a user profile with a different `id` than `auth.uid`.
2. **Resource Poisoning**: Setting name to a 1MB string.
3. **Privilege Escalation**: Setting `coins` field in someone else's document.
4. **Orphaned Write**: Creating a gift referencing a non-existent user (if relational check exists).
5. **State Shortcutting**: Skipping XP progression by directly updating `level`.
6. **Shadow Update**: Adding a `role: 'admin'` field to a user doc.
7. **Cross-User Delete**: Deleting someone else's stream.
8. **Negative Coins**: Setting `coins` to -9999.
9. **Invalid ID**: Using `../../system/root` as an ID.
10. **Timestamp Spoofing**: Providing a `createdAt` in the past.
11. **PII Leak**: Listing all users.
12. **Anonymous Write**: Attempting to create a stream without being signed in.

## 3. Test Runner
(Verifies that the above payloads are denied by the rules.)
