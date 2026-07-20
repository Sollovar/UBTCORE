import { create } from 'zustand';

export type NotifType = 'fill' | 'cancel' | 'price' | 'system';

export interface MobileNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  logoUrl?: string;   // base token logo for the pair
  createdAt: number;
  read: boolean;
}

interface NotificationState {
  notifications: MobileNotification[];
  addNotification: (notification: Omit<MobileNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  setNotifications: (notifications: MobileNotification[]) => void;
}

function createNotificationId() {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = 'cexdex-notifications';
const MAX_STORED = 50; // keep last 50 notifications in localStorage

function loadFromStorage(): MobileNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: MobileNotification[]) {
  try {
    // Only persist the latest MAX_STORED to keep storage size sane
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: loadFromStorage(),

  addNotification: (notification) =>
    set((state) => {
      const next = [
        {
          id: createNotificationId(),
          createdAt: Date.now(),
          read: false,
          ...notification,
        },
        ...state.notifications,
      ];
      saveToStorage(next);
      return { notifications: next };
    }),

  markRead: (id) =>
    set((state) => {
      const next = state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      );
      saveToStorage(next);
      return { notifications: next };
    }),

  markAllRead: () =>
    set((state) => {
      const next = state.notifications.map((notif) => ({ ...notif, read: true }));
      saveToStorage(next);
      return { notifications: next };
    }),

  dismissNotification: (id) =>
    set((state) => {
      const next = state.notifications.filter((notif) => notif.id !== id);
      saveToStorage(next);
      return { notifications: next };
    }),

  setNotifications: (notifications) => {
    saveToStorage(notifications);
    set({ notifications });
  },
}));
