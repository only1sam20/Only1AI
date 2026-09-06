# Authentication module

Only1AI uses email/password authentication. Passwords are bcrypt-hashed; successful logins issue a 15-minute access token and a rotating refresh token. Refresh tokens are stored only in an HTTP-only, Secure, SameSite=Strict cookie and only a bcrypt hash is retained server-side.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Register an unverified account |
| POST | `/api/v1/auth/verify-email` | Verify a one-time email token |
| POST | `/api/v1/auth/login` | Start a session |
| POST | `/api/v1/auth/refresh` | Rotate the session refresh token |
| POST | `/api/v1/auth/logout` | Revoke the current session |

All requests are validated and rate limited. Responses deliberately avoid revealing whether an email address is registered.

### Example: register

```http
POST /api/v1/auth/register
Content-Type: application/json

{"email":"trader@example.com","password":"a-long-unique-password"}
```

```json
{"message":"If registration succeeds, check your email for verification instructions."}
```

## Delivery dependency

The token lifecycle is implemented now; sending email requires the future Notification System module and a configured transactional-email provider. In development, the token is only emitted through application logs when `NODE_ENV=development`.
