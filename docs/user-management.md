# User Management module

Authenticated users can view their account and safely update their own profile. Profiles are stored separately from authentication credentials, and only whitelisted fields are accepted.

## Endpoints

- `GET /api/v1/users/me` — current user, role, verification status, and profile
- `PATCH /api/v1/users/me/profile` — update `displayName`, `timezone`, and `bio`

Use the access token from login as `Authorization: Bearer <token>`. Roles (`user`, `creator`, `admin`) are enforced via a reusable guard for upcoming Creator and Admin modules.

### Example: update profile

```http
PATCH /api/v1/users/me/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{"displayName":"Ada","timezone":"Africa/Lagos"}
```

```json
{"displayName":"Ada","timezone":"Africa/Lagos","bio":null,"updatedAt":"2026-08-03T12:00:00.000Z"}
```
