# Notifications

Notifications provides an in-app, user-owned inbox with read state. `GET /api/v1/notifications` lists recent notifications and `PATCH /api/v1/notifications/:id/read` marks one owned notification as read. Email and push delivery are intentionally not configured yet.
