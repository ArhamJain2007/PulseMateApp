// template
import { AuthContext } from "@/contexts/AuthContext";
import { PrescriptionsContext } from "@/contexts/PrescriptionsContext";
import { RemindersContext } from "@/contexts/RemindersContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

//import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});


const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ai-assistant" options={{ title: "AI Health Assistant" }} />
      <Stack.Screen name="prescriptions" options={{ title: "Prescriptions" }} />
      <Stack.Screen name="medicine-reminders" options={{ title: "Medicine Reminders" }} />
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
