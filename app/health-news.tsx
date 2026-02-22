import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type WhoNewsItem = {
  Id: string;
  Title: string;
  ItemDefaultUrl: string;
  PublicationDateAndTime: string;
  NewsType: string;
  FormatedDate?: string;
};

const WHO_BASE = "https://www.who.int";
const WHO_NEWS_ENDPOINT =
  "https://www.who.int/api/news/newsitems?$top=30&$orderby=PublicationDateAndTime%20desc";

export default function HealthNewsScreen() {
  const [items, setItems] = useState<WhoNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((i) => i.Title.toLowerCase().includes(query));
  }, [items, q]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(WHO_NEWS_ENDPOINT);
        const data = await res.json();
        if (!data?.value || !Array.isArray(data.value)) {
          setError("Unable to load WHO articles.");
          setItems([]);
        } else {
          const list: WhoNewsItem[] = data.value.map((v: any) => ({
            Id: v.Id,
            Title: v.Title,
            ItemDefaultUrl: v.ItemDefaultUrl,
            PublicationDateAndTime: v.PublicationDateAndTime,
            NewsType: v.NewsType,
            FormatedDate: v.FormatedDate,
          }));
          if (!cancelled) setItems(list);
        }
      } catch {
        setError("Network error while loading WHO articles.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const openArticle = (it: WhoNewsItem) => {
    const path = it.ItemDefaultUrl?.startsWith("/news/item/")
      ? it.ItemDefaultUrl
      : `/news/item${it.ItemDefaultUrl?.startsWith("/") ? it.ItemDefaultUrl : `/${it.ItemDefaultUrl}`}`;
    const href = WHO_BASE + path;
    Linking.openURL(href).catch(() => {});
  };

  const renderItem = ({ item }: { item: WhoNewsItem }) => {
    const date = item.FormatedDate
      ? item.FormatedDate
      : new Date(item.PublicationDateAndTime).toLocaleDateString();
    return (
      <Pressable style={styles.card} onPress={() => openArticle(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Ionicons name="newspaper-outline" size={14} color="#2563eb" />
            <Text style={styles.badgeText}>{item.NewsType}</Text>
          </View>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={styles.cardTitle} numberOfLines={4}>
            {item.Title}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.readMore}>Read on WHO</Text>
          <Pressable
            style={({ hovered, pressed }) => ({
              transform: [{ scale: pressed ? 0.95 : hovered ? 1.08 : 1 }],
            })}
          >
            <Ionicons name="arrow-forward" size={16} color="#2563eb" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search WHO articles"
          placeholderTextColor="#94a3b8"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading latest health news...</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.Id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No articles found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  searchRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInput: {
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    paddingHorizontal: 20,
    paddingTop: 6,
    fontSize: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingText: { fontSize: 12, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: "#2563eb", fontWeight: "600" as const, fontSize: 12 },
  dateText: { color: "#6b7280", fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" as const, color: "#111827", marginBottom: 8 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  readMore: { color: "#2563eb", fontWeight: "600" as const, fontSize: 12 },
  empty: { alignItems: "center", gap: 8, paddingTop: 40 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
});
