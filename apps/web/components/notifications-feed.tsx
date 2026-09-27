'use client';

import { useEffect, useState } from 'react';
import { api, AppNotification } from '../lib/api';

export function NotificationsFeed() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    api<AppNotification[]>('/notifications')
      .then(setNotifications)
      .catch(() => setMessage('Sign in to view workspace notifications.'))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(notification: AppNotification) {
    if (notification.readAt) return;
    setUpdatingId(notification.id);
    try {
      const updated = await api<AppNotification>(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Notification could not be updated.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading notifications"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  if (!notifications.length) return <section className="empty-panel"><span className="empty-icon">○</span><h2>{message ? 'Your workspace is waiting' : 'Your inbox is clear'}</h2><p>{message || 'Updates about analyses, watched markets, and your account will appear here.'}</p>{message && <a className="button" href="/login">Sign in</a>}</section>;

  return <section className="notification-list" aria-label="Notifications">
    {notifications.map((notification) => <article key={notification.id} className={`notification-card${notification.readAt ? ' is-read' : ' is-unread'}`}>
      <span className="notification-mark" aria-label={notification.readAt ? 'Read' : 'Unread'} />
      <div><h2>{notification.title}</h2><p>{notification.body}</p><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time></div>
      {!notification.readAt && <button className="button-quiet" disabled={updatingId === notification.id} onClick={() => markRead(notification)} type="button">{updatingId === notification.id ? 'Updating…' : 'Mark read'}</button>}
    </article>)}
    <p className="form-status is-error" role="status">{message}</p>
  </section>;
}
