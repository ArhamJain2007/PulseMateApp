import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useEffect, useState } from "react";

// 🔥 IMPORTANT: load notifications ONLY on native
let Notifications: typeof import("expo-notifications") | null = null;

if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");
}

// 🔥 Safe handler (runs only on native)
if (Platform.OS !== "web" && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
  });
}

export interface Reminder {
  id: string;
  medicine: string;
  time: string;
  datetimeISO: string;
  notificationId?: string;
}

export type IntakeStatus = "pending" | "taken" | "missed";

export interface IntakeRecord {
  id: string;
  reminderId: string;
  medicine_id: string;
  scheduled_time: string;
  taken_status: IntakeStatus;
  confirmation_time?: string;
  followUpNotificationId?: string;
}

const REMINDERS_STORAGE_KEY = "@health_app_reminders";
const INTAKE_STORAGE_KEY = "@health_app_intake";
const isNative = Platform.OS !== "web";

export const [RemindersContext, useReminders] = createContextHook(() => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>([]);

  useEffect(() => {
    loadReminders();
    loadIntake();
    const interval = setInterval(() => {
      markExpiredMissed();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load reminders", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntake = async () => {
    try {
      const stored = await AsyncStorage.getItem(INTAKE_STORAGE_KEY);
      if (stored) {
        setIntakeRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load intake records", e);
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

    // 🔥 schedule only on native
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

    await AsyncStorage.setItem(
      REMINDERS_STORAGE_KEY,
      JSON.stringify(updated),
    );

    const intake: IntakeRecord = {
      id: Math.random().toString(36).substring(7),
      reminderId: reminder.id,
      medicine_id: reminder.medicine,
      scheduled_time: reminder.datetimeISO,
      taken_status: "pending",
    };
    const intakeUpdated = [...intakeRecords, intake];
    setIntakeRecords(intakeUpdated);
    await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(intakeUpdated));
  };

  const deleteReminder = async (id: string) => {
    const target = reminders.find((r) => r.id === id);

    // 🔥 cancel only on native
    if (isNative && Notifications && target?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          target.notificationId,
        );
      } catch {}
    }

    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);

    await AsyncStorage.setItem(
      REMINDERS_STORAGE_KEY,
      JSON.stringify(updated),
    );

    const intakeUpdated = intakeRecords.filter((ir) => ir.reminderId !== id);
    setIntakeRecords(intakeUpdated);
    await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(intakeUpdated));
  };

  const persistIntake = async (next: IntakeRecord[]) => {
    setIntakeRecords(next);
    await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(next));
  };

  const markTaken = async (reminderId: string, scheduledISO?: string) => {
    const nowISO = new Date().toISOString();
    const dayFromISO = (iso: string) => iso.split("T")[0];
    const targetDay = dayFromISO(scheduledISO || nowISO);

    // already taken today? block duplicates
    const already = intakeRecords.find(
      (ir) =>
        ir.reminderId === reminderId &&
        dayFromISO(ir.scheduled_time) === targetDay &&
        ir.taken_status === "taken",
    );
    if (already) return false;

    let updated = false;
    const next = intakeRecords.map((ir) => {
      if (
        ir.reminderId === reminderId &&
        dayFromISO(ir.scheduled_time) === targetDay &&
        ir.taken_status !== "taken"
      ) {
        updated = true;
        return {
          ...ir,
          taken_status: "taken" as const,
          confirmation_time: nowISO,
        };
      }
      return ir;
    });

    if (!updated) {
      const reminder = reminders.find((r) => r.id === reminderId);
      const intake: IntakeRecord = {
        id: Math.random().toString(36).substring(7),
        reminderId,
        medicine_id: reminder?.medicine || reminderId,
        scheduled_time: scheduledISO || nowISO,
        taken_status: "taken",
        confirmation_time: nowISO,
      };
      next.push(intake);
    }
    await persistIntake(next);

    // cancel follow-up if scheduled
    if (isNative && Notifications) {
      const followUps = intakeRecords.filter(
        (ir) =>
          ir.reminderId === reminderId &&
          dayFromISO(ir.scheduled_time) === targetDay &&
          ir.followUpNotificationId,
      );
      for (const fu of followUps) {
        try {
          await Notifications.cancelScheduledNotificationAsync(fu.followUpNotificationId!);
        } catch {}
      }
    }
    return true;
  };

  const markExpiredMissed = async () => {
    const now = Date.now();
    const GRACE_MS = 60 * 60 * 1000; // 1h after scheduled
    let changed = false;
    const next = intakeRecords.map((ir) => {
      if (ir.taken_status === "pending") {
        const sched = Date.parse(ir.scheduled_time);
        if (now - sched > GRACE_MS) {
          changed = true;
          return { ...ir, taken_status: "missed" as const };
        }
      }
      return ir;
    });
    if (changed) {
      await persistIntake(next);
    }
  };

  const snoozeFollowUp = async (
    reminderId: string,
    minutes: number,
    scheduledISO?: string,
  ) => {
    if (!(isNative && Notifications)) return;
    await ensurePermissions();
    const date = new Date(Date.now() + minutes * 60_000);
    const nid = await Notifications!.scheduleNotificationAsync({
      content: {
        title: "Medicine Reminder",
        body: "You haven't confirmed taking your medicine yet.",
        sound: "default",
      },
      trigger: {
        type: Notifications!.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
    const next = intakeRecords.map((ir) => {
      if (
        ir.reminderId === reminderId &&
        (scheduledISO ? ir.scheduled_time === scheduledISO : true)
      ) {
        return { ...ir, followUpNotificationId: nid };
      }
      return ir;
    });
    await persistIntake(next);
  };

  const historyByMedicine = (medicineName: string) =>
    intakeRecords
      .filter((ir) => ir.medicine_id === medicineName)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  return {
    reminders,
    isLoading,
    addReminder,
    deleteReminder,
    intakeRecords,
    markTaken,
    snoozeFollowUp,
    historyByMedicine,
  };
});
