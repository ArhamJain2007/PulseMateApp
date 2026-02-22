import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Reminder } from "@/contexts/RemindersContext";
import { useReminders } from "@/contexts/RemindersContext";

export default function MedicineRemindersScreen() {
  const { reminders, addReminder, deleteReminder, markTaken } = useReminders();
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [medicine, setMedicine] = useState<string>("");
  const [time, setTime] = useState<string>("");

  const validateTime = (t: string) => /^\d{1,2}:\d{2}$/.test(t);

  const IconHover = ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => ({
        transform: [{ scale: pressed ? 0.95 : hovered ? 1.08 : 1 }],
      })}
    >
      {children}
    </Pressable>
  );

  const handleSave = async () => {
    if (!medicine.trim()) {
      Alert.alert("Error", "Enter medicine name");
      return;
    }
    if (!validateTime(time.trim())) {
      Alert.alert("Error", "Enter time as HH:MM");
      return;
    }
    await addReminder(medicine.trim(), time.trim());
    setMedicine("");
    setTime("");
    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Medicine Reminders</Text>
          <Text style={styles.subtitle}>Set daily alarms for your medicines</Text>
        </View>

        {reminders.map((r: Reminder) => {
          const date = new Date(r.datetimeISO);
          return (
            <View key={r.id} style={styles.reminderCard}>
              <Pressable
                style={styles.reminderInfo}
                onPress={() => router.push({ pathname: "/medicine-details", params: { id: r.id } })}
              >
                <Text style={styles.reminderMedicine}>{r.medicine}</Text>
                <Text style={styles.reminderTime}>{r.time} • {date.toLocaleDateString()}</Text>
              </Pressable>
              <View style={styles.reminderActions}>
                <Pressable
                  style={styles.takenButton}
                  onPress={async () => {
                    try {
                      const ok = await markTaken(r.id, r.datetimeISO);
                      if (ok) {
                        Alert.alert("Good job", "Dose recorded successfully.");
                      } else {
                        Alert.alert("Already recorded", "You've already marked this dose today.");
                      }
                    } catch {}
                    try {
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch {}
                  }}
                >
                  <Text style={styles.takenButtonText}>Mark as Taken</Text>
                </Pressable>
                <IconHover
                  onPress={() =>
                    Alert.alert("Delete Reminder", "Remove this reminder?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteReminder(r.id) },
                    ])
                  }
                >
                  <Trash2 size={20} color="#ef4444" />
                </IconHover>
              </View>
            </View>
          );
        })}

        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <IconHover>
            <Plus size={24} color="#3b82f6" />
          </IconHover>
          <Text style={styles.addText}>Add Reminder</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TextInput
              style={styles.modalInput}
              value={medicine}
              onChangeText={setMedicine}
              placeholder="Medicine name"
              placeholderTextColor="#94a3b8"
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM (24h)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowModal(false);
                  setMedicine("");
                  setTime("");
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSave}>
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderMedicine: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#0f172a",
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  takenButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#10b981",
  },
  takenButtonText: {
    color: "#fff",
    fontWeight: "700" as const,
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  addText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#3b82f6",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#0f172a",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#64748b",
  },
  modalButtonSave: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
