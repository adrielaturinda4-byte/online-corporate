# Security Specification: Online Corporate

## 1. Data Invariants
1. **User Identity & Admin Isolation**:
   - Only `adrielaturinda4@gmail.com` can have `isAdmin: true` and execute administrator-level actions.
   - Non-admin users cannot elevate their own roles or self-grant `isAdmin: true` or `isVerified: true`.
2. **Job Listings**:
   - Only registered users can create job postings; only the original poster or admin can modify or delete a job listing.
3. **Announcements**:
   - Only registered users can create announcements; only the original poster or admin can modify or delete them.
4. **Community Posts & Likes**:
   - Posts can only be authored with valid content and timestamp. Only the author or admin can delete a post.
   - Any authenticated user can like/unlike a post.
5. **Applications**:
   - Candidates can create their own applications. Only candidate, the job's employer, or admin can read the application.
   - Status updates can only be made by the employer or admin.
6. **Appointments**:
   - Appointments can be booked by candidates/clients. The host and booker can view and cancel their scheduled calls.
7. **Direct Messages & Notifications**:
   - Messages are strictly visible to the conversation participants (`from` or `to`).
   - Notifications are private to the recipient.

## 2. The Dirty Dozen Payloads (Rejection Matrix)
1. **Admin Privilege Escalation Attack**: A standard user updates their profile document setting `isAdmin: true`. (Must be REJECTED).
2. **Identity Spoofing on Job Creation**: An attacker submits a job with `posterEmail` set to another user's email. (Must be REJECTED).
3. **Unauthorized Application Modification**: A third-party user updates an applicant's status to 'Offered'. (Must be REJECTED).
4. **Oversized String Payload / Denial of Wallet**: An attacker attempts to submit a post with content exceeding 4,000 characters. (Must be REJECTED).
5. **PII Leak on User Private Records**: Unauthenticated reader requests private user documents without credentials. (Must be REJECTED).
6. **Ghost Key Injection**: Writing undocumented malicious keys to Firestore documents. (Must be REJECTED).
7. **Post Deletion by Non-Author**: A standard user attempts to delete a community post authored by someone else. (Must be REJECTED).
8. **Direct Message Interception / Eavesdropping**: A third party queries messages between other users. (Must be REJECTED).
9. **Fake Verification Granting**: A user sets `isVerified: true` without admin verification approval. (Must be REJECTED).
10. **Corrupted Data Type Injection**: Injecting non-string values into required string fields like email or title. (Must be REJECTED).
11. **Negative Timestamp / Temporal Tampering**: Writing timestamps with negative or invalid values. (Must be REJECTED).
12. **Appointment Tampering**: A user attempts to reschedule or alter an appointment they are not party to. (Must be REJECTED).
