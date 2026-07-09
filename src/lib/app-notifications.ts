import { useSyncExternalStore } from "react";

export type AppNotificationLevel = "info" | "warning" | "error" | "success";

export interface AppNotificationItem {
  id: string;
  title: string;
  description?: string;
  level: AppNotificationLevel;
  createdAt: number;
}

const STORAGE_KEY = "app_notifications_v1";
const MAX_ITEMS = 8;

let notifications: AppNotificationItem[] = [];
const listeners = new Set<() => void>();
let hydrated = false;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // ignore persistence issue
  }
};

const hydrate = () => {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AppNotificationItem[];
    if (Array.isArray(parsed)) {
      notifications = parsed
        .filter((item) => item && typeof item.title === "string")
        .slice(0, MAX_ITEMS);
    }
  } catch {
    notifications = [];
  }
};

const setNotifications = (next: AppNotificationItem[]) => {
  notifications = next.slice(0, MAX_ITEMS);
  persist();
  emit();
};

export const addAppNotification = (input: {
  title: string;
  description?: string;
  level?: AppNotificationLevel;
}) => {
  hydrate();
  const title = input.title.trim();
  if (!title) return;

  const nextItem: AppNotificationItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description: input.description?.trim() || undefined,
    level: input.level ?? "info",
    createdAt: Date.now(),
  };

  const deduped = notifications.filter(
    (item) => !(item.title === nextItem.title && item.description === nextItem.description),
  );

  setNotifications([nextItem, ...deduped]);
};

export const removeAppNotification = (id: string) => {
  hydrate();
  setNotifications(notifications.filter((item) => item.id !== id));
};

export const clearAppNotifications = () => {
  hydrate();
  setNotifications([]);
};

const subscribe = (listener: () => void) => {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => {
  hydrate();
  return notifications;
};

export const useAppNotifications = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => [] as AppNotificationItem[]);
