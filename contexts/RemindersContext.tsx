import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";

import { Platform } from "react-native";
const isNative = Platform.OS !== "web";


export interface Reminder {
  id: string;
  medicine: string;
  time: string;
  datetimeISO: string;
  notificationId?: string;
}

const REMINDERS_STORAGE_KEY = "@health_app_reminders";

export const [RemindersContext, useReminders] = createContextHook(() => {
  if (isNative && Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
    });
  }

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const ensurePermissions = async () => {
    if (!isNative || !Notifications) return;
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      await Notifications.requestPermissionsAsync();
    }
  };


  const scheduleReminder = async (medicine: string, time: string) => {
    const now = new Date();
    const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
    const scheduled = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hh || 0,
      mm || 0,
      0,
      0,
    );
    if (scheduled.getTime() <= now.getTime()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    let nid: string | undefined = undefined;

    if (isNative && Notifications) {
      await ensurePermissions();
      nid = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medicine Reminder",
          body: `${medicine} at ${time}`,
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduled,
        },
      });
    }

    return { scheduled, nid };
  };

  const addReminder = async (medicine: string, time: string) => {
    const { scheduled, nid } = await scheduleReminder(medicine, time);
    const reminder: Reminder = {
      id: Math.random().toString(36).substring(7),
      medicine,
      time,
      datetimeISO: scheduled.toISOString(),
      notificationId: nid,
    };
    const updated = [...reminders, reminder];
    setReminders(updated);
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteReminder = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (isNative && Notifications && target?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(target.notificationId);
      } catch {}
    }
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    reminders,
    isLoading,
    addReminder,
    deleteReminder,
  };
});
