import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export interface Prescription {
  id: string;
  title: string;
  uri: string;
  createdAt: Date;
}

const PRESCRIPTIONS_STORAGE_KEY = "@health_app_prescriptions";

export const [PrescriptionsContext, usePrescriptions] = createContextHook(() => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRESCRIPTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrescriptions(
          parsed.map((p: Prescription) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load prescriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addPrescription = async (title: string, uri: string) => {
    try {
      const newPrescription: Prescription = {
        id: Math.random().toString(36).substring(7),
        title,
        uri,
        createdAt: new Date(),
      };
      const updated = [...prescriptions, newPrescription];
      setPrescriptions(updated);
      await AsyncStorage.setItem(
        PRESCRIPTIONS_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Failed to add prescription:", error);
    }
  };

  const deletePrescription = async (id: string) => {
    try {
      const updated = prescriptions.filter((p) => p.id !== id);
      setPrescriptions(updated);
      await AsyncStorage.setItem(
        PRESCRIPTIONS_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Failed to delete prescription:", error);
    }
  };

  return {
    prescriptions,
    isLoading,
    addPrescription,
    deletePrescription,
  };
});
