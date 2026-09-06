# Administration

Administration endpoints require the `admin` role. They list users, update a user’s role or active state, and expose recent audit events. Every update writes an audit entry with actor, target, before/after values, and time. Administrators cannot reduce their own access through the API.
