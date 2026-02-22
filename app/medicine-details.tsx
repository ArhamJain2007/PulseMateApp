import { useReminders } from "@/contexts/RemindersContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MedicineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reminders, historyByMedicine, markTaken } = useReminders();
  const reminder = reminders.find((r) => r.id === id);
  const medicineName = reminder?.medicine || "";

  const history = useMemo(() => {
    if (!medicineName) return [];
    return historyByMedicine(medicineName);
  }, [medicineName, historyByMedicine]);

  const takenCount = history.filter((h) => h.taken_status === "taken").length;
  const missedCount = history.filter((h) => h.taken_status === "missed").length;
  const pendingCount = history.filter((h) => h.taken_status === "pending").length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{medicineName || "Medicine"}</Text>
        <Text style={styles.subtitle}>Intake history and adherence</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.takenButton}
          onPress={async () => {
            if (!reminder) return;
            try {
              const ok = await markTaken(reminder.id, reminder.datetimeISO);
              if (ok) {
                Alert.alert("Good job", "Dose recorded successfully.");
              } else {
                Alert.alert("Already recorded", "You've already marked this dose today.");
              }
            } catch {}
          }}
        >
          <Text style={styles.takenButtonText}>Mark as Taken</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={styles.summaryLabel}>Taken</Text>
          <Text style={styles.summaryValue}>{takenCount}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <Text style={styles.summaryLabel}>Missed</Text>
          <Text style={styles.summaryValue}>{missedCount}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="time" size={20} color="#f59e0b" />
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {history.map((h) => {
          const d = new Date(h.scheduled_time);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          const status =
            h.taken_status === "taken"
              ? styles.cellTaken
              : h.taken_status === "missed"
              ? styles.cellMissed
              : styles.cellPending;
          return (
            <View key={h.id} style={[styles.cell, status]}>
              <Text style={styles.cellText}>{label}</Text>
            </View>
          );
        })}
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>No intake history yet</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 22, fontWeight: "700" as const, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b" },
  summary: { flexDirection: "row", gap: 16 },
  summaryItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: { color: "#64748b", fontSize: 12 },
  summaryValue: { color: "#0f172a", fontSize: 14, fontWeight: "700" as const },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actions: { flexDirection: "row", gap: 10 },
  takenButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#10b981",
    alignSelf: "flex-start",
  },
  takenButtonText: { color: "#fff", fontWeight: "700" as const, fontSize: 12 },
  cell: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cellTaken: { backgroundColor: "#d1fae5", borderWidth: 1, borderColor: "#10b981" },
  cellMissed: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#ef4444" },
  cellPending: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#f59e0b" },
  cellText: { color: "#0f172a", fontSize: 12, fontWeight: "600" as const },
  empty: { alignItems: "center", gap: 8, paddingTop: 40, width: "100%" },
  emptyText: { color: "#9ca3af", fontSize: 14 },
})
