import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type LatLng = { lat: number; lng: number };

type Place = {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  geometry: { location: LatLng };
  business_status?: string;
  opening_hours?: { open_now?: boolean };
};

const GOOGLE_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants?.expoConfig as any)?.extra?.googleMapsApiKey ||
  "";

export default function NearbyMedicalFacilitiesScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState<string>("");

  const hasKey = useMemo(() => !!GOOGLE_KEY, []);

  const geocodeWithOSM = useCallback(async (q: string) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "PulseMateApp/1.0" } });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No results");
    }
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } as LatLng;
  }, []);

  const fetchHospitalsOSM = useCallback(async (location: LatLng) => {
    const overpass = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:5000,${location.lat},${location.lng});
        way["amenity"="hospital"](around:5000,${location.lat},${location.lng});
        relation["amenity"="hospital"](around:5000,${location.lat},${location.lng});
      );
      out center tags;
    `)}`;
    const res = await fetch(overpass, { headers: { "User-Agent": "PulseMateApp/1.0" } });
    const data = await res.json();
    const results: Place[] = (data.elements || []).map((el: any) => {
      const center = el.center || { lat: el.lat, lon: el.lon };
      const name = el.tags?.name || "Hospital";
      const vicinity =
        el.tags?.["addr:street"] ||
        el.tags?.["addr:city"] ||
        el.tags?.["addr:district"] ||
        "";
      return {
        place_id: `${el.type}-${el.id}`,
        name,
        vicinity,
        geometry: { location: { lat: center.lat, lng: center.lon } },
      };
    });
    return results;
  }, []);

  const fetchPlacesWebGoogle = useCallback(
    async (location: LatLng, q: string) => {
      const mod = await import("@googlemaps/js-api-loader");
      const Loader = (mod as any).Loader;
      const loader = new Loader({ apiKey: GOOGLE_KEY, libraries: ["places"] });
      await loader.importLibrary("places");
      const g = (window as any).google;
      const map = new g.maps.Map(document.createElement("div"));
      const svc = new g.maps.places.PlacesService(map);
      const loc = new g.maps.LatLng(location.lat, location.lng);
      const runSearch = (req: any, type: "nearby" | "text") =>
        new Promise<any[]>((resolve, reject) => {
          const cb = (results: any[], status: any) => {
            if (status === g.maps.places.PlacesServiceStatus.OK) resolve(results || []);
            else reject(new Error(String(status)));
          };
          if (type === "text") svc.textSearch(req, cb);
          else svc.nearbySearch(req, cb);
        });
      const results =
        q.trim().length > 0
          ? await runSearch({ query: `${q} hospital`, location: loc, radius: 5000 }, "text")
          : await runSearch({ location: loc, radius: 5000, type: "hospital" }, "nearby");
      const basePlaces: Place[] = (results || []).map((r: any) => ({
        place_id: r.place_id,
        name: r.name,
        rating: typeof r.rating === "number" ? r.rating : undefined,
        user_ratings_total:
          typeof r.user_ratings_total === "number" ? r.user_ratings_total : undefined,
        vicinity: r.vicinity,
        geometry: { location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() } },
        opening_hours: r.opening_hours,
      }));
      const needDetails = basePlaces.filter((p) => typeof p.rating !== "number");
      if (needDetails.length === 0) return basePlaces;
      const getDetails = (pid: string) =>
        new Promise<any>((resolve) => {
          svc.getDetails(
            { placeId: pid, fields: ["rating", "user_ratings_total", "opening_hours"] },
            (res: any) => resolve(res || {}),
          );
        });
      const concurrency = 5;
      const enriched: Place[] = [];
      for (let i = 0; i < basePlaces.length; i += concurrency) {
        const slice = basePlaces.slice(i, i + concurrency);
        const updates = await Promise.all(
          slice.map(async (p) => {
            if (typeof p.rating === "number") return p;
            const d = await getDetails(p.place_id);
            return {
              ...p,
              rating: typeof d.rating === "number" ? d.rating : p.rating,
              user_ratings_total:
                typeof d.user_ratings_total === "number"
                  ? d.user_ratings_total
                  : p.user_ratings_total,
              opening_hours: d.opening_hours ?? p.opening_hours,
            } as Place;
          }),
        );
        enriched.push(...updates);
      }
      return enriched;
    },
    [],
  );

  const fetchPlaces = useCallback(
    async (location: LatLng, q: string) => {
      setLoading(true);
      setError("");
      try {
        if (hasKey) {
          if (Platform.OS === "web") {
            try {
              const webResults = await fetchPlacesWebGoogle(location, q);
              if (!webResults || webResults.length === 0) {
                const fallback =
                  q.trim().length > 0
                    ? await fetchHospitalsOSM(await geocodeWithOSM(q))
                    : await fetchHospitalsOSM(location);
                if (fallback.length === 0) {
                  setError("No results found. Try refining your search.");
                } else {
                  setError("");
                }
                setPlaces(fallback);
              } else {
                setPlaces(webResults);
              }
              return;
            } catch {
              const fallback =
                q.trim().length > 0
                  ? await fetchHospitalsOSM(await geocodeWithOSM(q))
                  : await fetchHospitalsOSM(location);
              if (fallback.length === 0) {
                setError("No results found. Try refining your search.");
              } else {
                setError("");
              }
              setPlaces(fallback);
              return;
            }
          }
          const base = "https://maps.googleapis.com/maps/api/place";
          const endpoint =
            q.trim().length > 0
              ? `${base}/textsearch/json?query=${encodeURIComponent(
                  `${q} hospital`
                )}&location=${location.lat},${location.lng}&radius=5000&key=${GOOGLE_KEY}`
              : `${base}/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=hospital&key=${GOOGLE_KEY}`;
          const resp = await fetch(endpoint);
          const data = await resp.json();
          if (data.status !== "OK" && !data.results) {
            const fallback =
              q.trim().length > 0
                ? await fetchHospitalsOSM(await geocodeWithOSM(q))
                : await fetchHospitalsOSM(location);
            if (fallback.length === 0) {
              setError("No results found. Try refining your search.");
            } else {
              setError("");
            }
            setPlaces(fallback);
          } else {
            const results = (data.results as Place[]) || [];
            const needDetails = results.filter((p) => typeof p.rating !== "number");
            if (needDetails.length > 0) {
              const enrichOne = async (p: Place) => {
                try {
                  const det = `${base}/details/json?place_id=${p.place_id}&fields=rating,user_ratings_total,opening_hours&key=${GOOGLE_KEY}`;
                  const r = await fetch(det);
                  const d = await r.json();
                  const details = d.result || {};
                  return {
                    ...p,
                    rating: typeof details.rating === "number" ? details.rating : p.rating,
                    user_ratings_total:
                      typeof details.user_ratings_total === "number"
                        ? details.user_ratings_total
                        : p.user_ratings_total,
                    opening_hours: details.opening_hours ?? p.opening_hours,
                  } as Place;
                } catch {
                  return p;
                }
              };
              const concurrency = 5;
              const enriched: Place[] = [];
              for (let i = 0; i < results.length; i += concurrency) {
                const slice = results.slice(i, i + concurrency);
                const updated = await Promise.all(slice.map(enrichOne));
                enriched.push(...updated);
              }
              setPlaces(enriched);
            } else {
              setPlaces(results);
            }
          }
        } else {
          const results =
            q.trim().length > 0
              ? await fetchHospitalsOSM(await geocodeWithOSM(q))
              : await fetchHospitalsOSM(location);
          if (results.length === 0) {
            setError("No results found. Try refining your search.");
          }
          setPlaces(results);
        }
      } catch {
        setError("Failed to fetch places. Check your network.");
      } finally {
        setLoading(false);
      }
    },
    [hasKey, geocodeWithOSM, fetchHospitalsOSM, fetchPlacesWebGoogle]
  );

  const requestLocation = useCallback(
    async () => {
      setError("");
      setLoading(true);
      try {
        let current: LatLng | null = null;
        try {
          const pkg = "expo-location";
          const Location = await import(pkg as any);
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          }
        } catch {
          // ignore and try web fallback
        }

        if (!current && typeof navigator !== "undefined" && navigator.geolocation) {
          current = await new Promise<LatLng>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => reject(new Error("geo error")),
              { enableHighAccuracy: false, timeout: 8000 }
            );
          }).catch(() => null as any);
        }

        if (!current) {
          setError("Location permission denied or unavailable.");
          setLoading(false);
          return;
        }

        setCoords(current);
        await fetchPlaces(current, query);
      } catch {
        setError("Unable to get location. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [query, fetchPlaces]
  );

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const openDirections = (p: Place) => {
    const { lat, lng } = p.geometry.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${p.place_id}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  const openPlaceOnMaps = (p: Place) => {
    const url = `https://www.google.com/maps/place/?q=place_id:${p.place_id}`;
    Linking.openURL(url).catch(() => {});
  };

  const renderStars = (rating?: number) => {
    const r = Math.round((rating ?? 0) * 2) / 2;
    const stars = [1, 2, 3, 4, 5].map((i) => {
      const diff = r - i;
      if (diff >= 0) return <Ionicons key={i} name="star" size={14} color="#fbbf24" />;
      if (diff === -0.5) return <Ionicons key={i} name="star-half" size={14} color="#fbbf24" />;
      return <Ionicons key={i} name="star-outline" size={14} color="#fbbf24" />;
    });
    return <View style={{ flexDirection: "row", gap: 2 }}>{stars}</View>;
  };

  const renderItem = ({ item }: { item: Place }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <View style={styles.ratingRow}>
        {renderStars(item.rating)}
        <Text style={styles.ratingText}>
          {item.rating?.toFixed(1) ?? "N/A"}{" "}
          {item.user_ratings_total ? `(${item.user_ratings_total})` : ""}
        </Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.typeText}>General hospital</Text>
      </View>
      {item.vicinity && <Text style={styles.address}>{item.vicinity}</Text>}
      {item.opening_hours?.open_now !== undefined && (
        <Text style={[styles.openNow, item.opening_hours.open_now ? styles.open : styles.closed]}>
          {item.opening_hours.open_now ? "Open now" : "Closed"}
        </Text>
      )}
      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => openPlaceOnMaps(item)}
          android_ripple={{ color: "#e2e8f0", borderless: false }}
        >
          <Ionicons name="globe-outline" size={18} color="#2563eb" />
          <Text style={styles.actionText}>Website</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => openDirections(item)}
          android_ripple={{ color: "#e2e8f0", borderless: false }}
        >
          <Ionicons name="navigate-outline" size={18} color="#2563eb" />
          <Text style={styles.actionText}>Directions</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (e.g., cardiology, clinic)"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            if (coords) fetchPlaces(coords, query);
          }}
        />
        <Pressable
          style={styles.useLocationBtn}
          onPress={() => (coords ? fetchPlaces(coords, query) : requestLocation())}
        >
          <Ionicons name="locate" size={18} color="#2563eb" />
          <Text style={styles.useLocationText}>{coords ? "Refresh" : "Use my location"}</Text>
        </Pressable>
      </View>

      {!hasKey && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable hospitals and reviews.
          </Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      <FlatList
        data={places}
        keyExtractor={(p) => p.place_id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No hospitals found nearby</Text>
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
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    fontSize: 14,
  },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  useLocationText: { color: "#2563eb", fontWeight: "600" as const, fontSize: 12 },
  infoBox: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  infoText: { fontSize: 12, color: "#7C2D12" },
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
  cardTitle: { fontSize: 16, fontWeight: "700" as const, color: "#111827", marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  ratingText: { fontSize: 12, color: "#374151" },
  dot: { color: "#9ca3af" },
  typeText: { fontSize: 12, color: "#6b7280" },
  address: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  openNow: { fontSize: 12, marginBottom: 10 },
  open: { color: "#10b981" },
  closed: { color: "#ef4444" },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
  },
  actionText: { color: "#2563eb", fontWeight: "600" as const, fontSize: 12 },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingTop: 40,
  },
  emptyText: { color: "#9ca3af", fontSize: 14 },
});
