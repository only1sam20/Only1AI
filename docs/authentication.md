# Authentication module

Only1AI uses email/password authentication. Passwords are bcrypt-hashed; successful logins issue a 15-minute access token and a rotating refresh token. Refresh tokens are stored only in an HTTP-only, Secure, SameSite=Strict cookie and only a bcrypt hash is retained server-side.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Register an unverified account and trader preferences |
| POST | `/api/v1/auth/verify-email` | Verify a one-time email token |
| POST | `/api/v1/auth/password-reset/request` | Request password-reset instructions |
| POST | `/api/v1/auth/password-reset/confirm` | Set a new password with a one-time token |
| POST | `/api/v1/auth/login` | Start a session |
| POST | `/api/v1/auth/refresh` | Rotate the session refresh token |
| POST | `/api/v1/auth/logout` | Revoke the current session |

All requests are validated and rate limited. Responses deliberately avoid revealing whether an email address is registered.

### Example: register

```http
POST /api/v1/auth/register
Content-Type: application/json

{"email":"trader@example.com","password":"Secure1!Password","traderName":"Ada Trader","preferredTrade":"forex","preferredStrategy":"smc"}
```

```json
{"message":"If registration succeeds, check your email for verification instructions."}
```

New and reset passwords must contain at least 6 characters, fit within 72 UTF-8 bytes, and include an uppercase letter, lowercase letter, number, and special character. The byte limit prevents bcrypt from silently ignoring a password suffix; Unicode characters can occupy multiple bytes. Existing-account login retains its previous 128-character input allowance for compatibility. Anyone who previously used a password longer than 72 bytes should reset it; the application cannot recover a discarded suffix from an existing hash.

Registration also requires a trader name, one preferred market (`crypto`, `forex`, `indices`, or `all`), and one preferred methodology (`smc`, `ict`, `algo`, `msnr`, `price_action`, or `custom`). A custom methodology is stored on the profile and anonymously added to the public community suggestion list, as disclosed during signup. Do not enter private strategy details or personal information in that suggestion field. Verified-publication and moderation controls are a public-launch gate; the current implementation publishes suggestions during registration.

`GET /api/v1/strategies/suggestions` returns those distinct anonymous custom-strategy suggestions for the registration experience.

## Email delivery and recovery

Verification and password-reset messages are sent directly through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are configured. In non-production environments without those values, the API logs a one-time URL so local development remains usable. Production refuses the fallback and requires a verified Resend sending domain.

Both registration and password-reset requests are deliberately non-enumerating: their public responses do not disclose whether an email address belongs to an account. Reset tokens are single-use, expire quickly, and revoke active refresh sessions when consumed. Token consumption, password changes, and refresh-session revocation are transactional. Login, refresh, and reset serialize session issuance against the same user row so an in-flight old credential cannot create a session after a reset commits. Already-issued access JWTs remain valid until their configured expiry (15 minutes by default); this is not immediate access-token revocation.
