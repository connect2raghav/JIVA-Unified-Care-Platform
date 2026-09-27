import { create } from 'zustand';
import type { ClinicNotification } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationState {
  toasts: ToastMessage[];
  notifications: ClinicNotification[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
  
  // System Notifications Bell Management
  loadNotifications: () => void;
  addNotification: (noti: Omit<ClinicNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const DEFAULT_NOTIFICATIONS: ClinicNotification[] = [];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  notifications: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto dismiss
    const duration = toast.duration || 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => set({ toasts: [] }),

  loadNotifications: () => {
    const cached = localStorage.getItem('dcip_system_notifications');
    if (cached) {
      try {
        set({ notifications: JSON.parse(cached) });
        return;
      } catch {}
    }
    localStorage.setItem('dcip_system_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
    set({ notifications: DEFAULT_NOTIFICATIONS });
  },

  addNotification: (noti) => {
    const newNoti: ClinicNotification = {
      ...noti,
      id: `noti-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    const updated = [newNoti, ...get().notifications];
    localStorage.setItem('dcip_system_notifications', JSON.stringify(updated));
    set({ notifications: updated });
    
    // Also trigger a toast message alert for live feedback
    get().addToast({
      type: noti.type,
      title: noti.title,
      message: noti.description
    });
  },

  markAsRead: (id) => {
    const updated = get().notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('dcip_system_notifications', JSON.stringify(updated));
    set({ notifications: updated });
  },

  markAllAsRead: () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('dcip_system_notifications', JSON.stringify(updated));
    set({ notifications: updated });
  },

  clearNotifications: () => {
    localStorage.setItem('dcip_system_notifications', JSON.stringify([]));
    set({ notifications: [] });
  }
}));
