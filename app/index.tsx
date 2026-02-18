import { router } from "expo-router";
import { Activity, Clock, FileText, LogOut } from "lucide-react-native";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";


export default function HomeScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.username}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
          </Pressable>
        </View>

        <View style={styles.cardsContainer}>
          <Pressable
            style={styles.card}
            onPress={() => router.push("/ai-assistant")}
          >
            <View style={styles.cardIcon}>
              <Activity size={28} color="#3b82f6" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>AI Health Assistant</Text>
              <Text style={styles.cardDescription}>
                Get medicine info and symptom analysis
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/prescriptions")}
          >
            <View style={styles.cardIcon}>
              <FileText size={28} color="#10b981" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Prescriptions</Text>
              <Text style={styles.cardDescription}>
                Upload and manage your prescriptions
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/medicine-reminders")}
          >
            <View style={styles.cardIcon}>
              <Clock size={28} color="#f59e0b" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Medicine Reminders</Text>
              <Text style={styles.cardDescription}>
                Set alarms for your medicines
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 4,
  },
  username: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#0f172a",
  },
  logoutButton: {
    padding: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#0f172a",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748b",
  },
});
