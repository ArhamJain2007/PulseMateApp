import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Plus, Trash2, X } from "lucide-react-native";
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

import { Prescription, usePrescriptions } from "@/contexts/PrescriptionsContext";

export default function PrescriptionsScreen() {
  const { prescriptions, addPrescription, deletePrescription } = usePrescriptions();
  const [showTitleModal, setShowTitleModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [pendingImageUri, setPendingImageUri] = useState<string>("");
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Prescription | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Please grant camera roll permissions to upload prescriptions.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true, // ⭐ IMPORTANT
})

   if (!result.canceled && result.assets?.[0]) {
      setPendingImageUri(result.assets[0].uri);
      setPendingImageBase64(result.assets[0].base64 ?? null); // ⭐ IMPORTANT
      setShowTitleModal(true);
}

  const handleSaveTitle = () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a title for the prescription");
      return;
    }

    addPrescription(newTitle.trim(), pendingImageUri);
    setNewTitle("");
    setPendingImageUri("");
    setShowTitleModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Prescription",
      "Are you sure you want to delete this prescription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePrescription(id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Your Prescriptions</Text>
          <Text style={styles.subtitle}>
            Keep all your medical prescriptions in one place
          </Text>
        </View>

        {prescriptions.map((prescription) => (
          <View key={prescription.id} style={styles.prescriptionCard}>
            <Pressable
              style={styles.imageContainer}
              onPress={() => setSelectedImage(prescription)}
            >
              <Image
                source={{ uri: prescription.uri }}
                style={styles.prescriptionImage}
                contentFit="cover"
              />
            </Pressable>
            <View style={styles.prescriptionInfo}>
              <Text style={styles.prescriptionTitle}>{prescription.title}</Text>
              <Text style={styles.prescriptionDate}>
                {prescription.createdAt.toLocaleDateString()}
              </Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              android_ripple={{ color: "#fee2e2", borderless: true }}
              onPress={() => handleDelete(prescription.id)}
              onLongPress={() => deletePrescription(prescription.id)}
            >
              <Trash2 size={20} color="#ef4444" />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.uploadButton} onPress={pickImage}>
          <Plus size={24} color="#3b82f6" />
          <Text style={styles.uploadText}>Add Prescription</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showTitleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTitleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Prescription Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g., Blood Pressure Medicine"
              placeholderTextColor="#94a3b8"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowTitleModal(false);
                  setNewTitle("");
                  setPendingImageUri("");
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSaveTitle}>
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <Pressable
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
          >
            <X size={28} color="#fff" />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.enlargedImage}
              contentFit="contain"
            />
          )}
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
  prescriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  prescriptionImage: {
    width: "100%",
    height: "100%",
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#0f172a",
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 12,
    color: "#94a3b8",
  },
  deleteButton: {
    padding: 8,
  },
  uploadButton: {
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
  uploadText: {
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  enlargedImage: {
    width: "90%",
    height: "80%",
  },
});
}