export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Check current browser notification permission
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendBrowserNotification('🎓 SyllabusOS Alerts Enabled', {
        body: 'Push alerts are now active for upcoming assignments, PPT schedules, and class reminders.',
      });
    }
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Deliver a system/push notification if permission is granted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notificationOptions: NotificationOptions = {
    icon: '/icon.svg',
    badge: '/icon.svg',
    ...options,
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, notificationOptions);
      }).catch(() => {
        new Notification(title, notificationOptions);
      });
    } else {
      new Notification(title, notificationOptions);
    }
  } catch (err) {
    console.warn('Could not display system notification:', err);
    try {
      new Notification(title, notificationOptions);
    } catch {
      // Browser environment security restriction
    }
  }
}
