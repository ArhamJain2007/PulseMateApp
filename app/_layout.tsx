// template
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { PrescriptionsContext } from "@/contexts/PrescriptionsContext";
import { RemindersContext } from "@/contexts/RemindersContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent splash auto hide
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // 🔥 premium scale animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",

        // 🔥 Animated Logout Button
        headerRight: () =>
          isAuthenticated ? (
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={async () => {
                await logout();
                router.replace("/login");
              }}
              hitSlop={10}
            >
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: "#ef4444",
                  shadowColor: "#ef4444",
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
                >
                  Logout
                </Text>
              </Animated.View>
            </Pressable>
          ) : null,
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="ai-assistant" options={{ title: "AI Health Assistant" }} />
      <Stack.Screen name="health-news" options={{ title: "Health News" }} />
      <Stack.Screen name="prescriptions" options={{ title: "Prescriptions" }} />
      <Stack.Screen name="medicine-reminders" options={{ title: "Medicine Reminders" }} />
      <Stack.Screen name="medicine-details" options={{ title: "Medicine Details" }} />
      <Stack.Screen
        name="nearby-medical-facilities"
        options={{ title: "Nearby Medical Facilities" }}
      />
      <Stack.Screen name="qr-scanner" options={{ title: "Scan QR" }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext>
        <PrescriptionsContext>
          <RemindersContext>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </RemindersContext>
        </PrescriptionsContext>
      </AuthContext>
    </QueryClientProvider>
  );
}