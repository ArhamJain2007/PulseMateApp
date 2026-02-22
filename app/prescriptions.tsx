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
  const [selectedImage, setSelectedImage] = useState<Prescription | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [aiCandidates, setAiCandidates] = useState<{ name: string; confidence: "high" | "low" }[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [manualName, setManualName] = useState<string>("");

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
      exif: true as any,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPendingImageUri(result.assets[0].uri);
      const exifData = (result.assets[0] as any).exif || null;
      // best-effort guess doctor from EXIF before showing modal
      const guessed = guessDoctorFromExif(exifData);
      if (guessed) setDoctorManual(guessed);
      setShowAnalysisModal(true);
      runAnalysis(result.assets[0].uri);
    }
  };

  const KNOWN_MEDS = [
    "Paracetamol",
    "Amoxicillin",
    "Ibuprofen",
    "Amlodipine",
    "Omeprazole",
    "Doxycycline",
    "Metformin",
    "Losartan",
    "Atorvastatin",
    "Azithromycin",
    "Ciprofloxacin",
  ];

  const runAnalysis = async (uri: string) => {
    setAiLoading(true);
    setAiError("");
    setAiCandidates([]);
    setSelectedCandidateIndex(null);
    try {
      // Heuristic: propose common medicines; in future, plug real OCR
      const found: string[] = [];
      const candidates =
        found.length > 0
          ? found.map((n) => ({ name: n, confidence: "high" as const }))
          : KNOWN_MEDS.slice(0, 4).map((n) => ({ name: n, confidence: "low" as const }));
      setAiCandidates(candidates);
      setSelectedCandidateIndex(candidates.length ? 0 : null);
    } catch {
      setAiError("Failed to analyze image. You can confirm or enter manually.");
    } finally {
      setAiLoading(false);
    }
  };

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

  const confirmSelection = () => {
    let name = "";
    if (selectedCandidateIndex !== null && aiCandidates[selectedCandidateIndex]) {
      name = aiCandidates[selectedCandidateIndex].name;
    } else if (manualName.trim()) {
      name = manualName.trim();
    }
    if (!name) {
      Alert.alert("Confirm Medicine", "Please select or enter a medicine name.");
      return;
    }
    addPrescription(name, pendingImageUri, doctorNameGuess());
    setManualName("");
    setAiCandidates([]);
    setSelectedCandidateIndex(null);
    setPendingImageUri("");
    setShowAnalysisModal(false);
  };

  const [doctorManual, setDoctorManual] = useState<string>("");
  const doctorNameGuess = () => {
    if (doctorManual.trim()) return doctorManual.trim();
    return "";
  };

  const guessDoctorFromExif = (exif: any): string => {
    try {
      if (!exif) return "";
      const values: string[] = [];
      for (const k of Object.keys(exif)) {
        const v = exif[k];
        if (typeof v === "string") values.push(v);
      }
      const blob = values.join(" ");
      const drMatch = blob.match(/Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
      if (drMatch) return drMatch[0];
      const doctorMatch = blob.match(/Doctor\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
      if (doctorMatch) return doctorMatch[0].replace(/^Doctor\s+/, "Dr. ");
      return "";
    } catch {
      return "";
    }
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
              {prescription.doctorName ? (
                <Text style={styles.prescriptionDoctor}>Doctor: {prescription.doctorName}</Text>
              ) : null}
              <Text style={styles.prescriptionDate}>{prescription.createdAt.toLocaleDateString()}</Text>
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
        visible={showAnalysisModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Assistance</Text>
            {pendingImageUri ? (
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Image source={{ uri: pendingImageUri }} style={{ width: 240, height: 160, borderRadius: 8 }} contentFit="cover" />
              </View>
            ) : null}
            {aiLoading ? (
              <Text style={{ color: "#64748b" }}>Analyzing prescription...</Text>
            ) : (
              <>
                {aiError ? <Text style={{ color: "#ef4444", marginBottom: 8 }}>{aiError}</Text> : null}
                <Text style={{ color: "#0f172a", marginBottom: 8 }}>
                  We think this might be:
                </Text>
                <View style={{ gap: 8 }}>
                  {aiCandidates.map((c, idx) => (
                    <Pressable
                      key={`${c.name}-${idx}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 6,
                      }}
                      onPress={() => setSelectedCandidateIndex(idx)}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: selectedCandidateIndex === idx ? "#3b82f6" : "#cbd5e1",
                          backgroundColor: selectedCandidateIndex === idx ? "#3b82f6" : "transparent",
                        }}
                      />
                      <Text style={{ color: "#0f172a", fontWeight: "600" }}>{c.name}</Text>
                      <Text style={{ color: c.confidence === "high" ? "#10b981" : "#f59e0b" }}>
                        {c.confidence === "high" ? "(High confidence)" : "(Low confidence)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text style={{ color: "#64748b" }}>Edit or type manually:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={
                      selectedCandidateIndex !== null && aiCandidates[selectedCandidateIndex]
                        ? aiCandidates[selectedCandidateIndex].name
                        : manualName
                    }
                    onChangeText={(t) => {
                      if (selectedCandidateIndex !== null && aiCandidates[selectedCandidateIndex]) {
                        const next = [...aiCandidates];
                        next[selectedCandidateIndex] = {
                          ...next[selectedCandidateIndex],
                          name: t,
                          confidence: "low",
                        };
                        setAiCandidates(next);
                      } else {
                        setManualName(t);
                      }
                    }}
                    placeholder="Enter medicine manually"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={{ color: "#64748b" }}>Doctor name (best effort / manual):</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={doctorManual}
                    onChangeText={setDoctorManual}
                    placeholder="e.g., Dr. Jane Smith"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </>
            )}
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowAnalysisModal(false);
                  setAiCandidates([]);
                  setSelectedCandidateIndex(null);
                  setManualName("");
                  setPendingImageUri("");
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonSave} onPress={confirmSelection} disabled={aiLoading}>
                <Text style={styles.modalButtonSaveText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  prescriptionDoctor: {
    fontSize: 12,
    color: "#0ea5e9",
    marginBottom: 2,
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
