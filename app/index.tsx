import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

const features: Feature[] = [
  {
    id: "1",
    title: "AI Health Assistant",
    subtitle: "Medicine info & symptom analysis",
    icon: "pulse",
    color: "#4F46E5",
    route: "/ai-assistant",
  },
  {
    id: "2",
    title: "Prescriptions",
    subtitle: "Upload & manage prescriptions",
    icon: "document-text",
    color: "#10B981",
    route: "/prescriptions",
  },
  {
    id: "3",
    title: "Medicine Reminders",
    subtitle: "Set alarms for medicines",
    icon: "alarm",
    color: "#F59E0B",
    route: "/medicine-reminders",
  },
];

export default function Dashboard() {
  const router = useRouter();

  const renderItem = ({ item }: { item: Feature }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(item.route as any)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: item.color + "15" },
        ]}
      >
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.greeting}>Welcome back,</Text>
      <Text style={styles.username}>Arham 👋</Text>

      <FlatList
        data={features}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
<text>New UI</text>
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
  },
  username: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    width: "48%",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
});