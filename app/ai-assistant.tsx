import { useRorkAgent } from "@rork-ai/toolkit-sdk";
import { Send } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrescriptions } from "@/contexts/PrescriptionsContext";

export default function AIAssistantScreen() {
  const [input, setInput] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);
  const { prescriptions } = usePrescriptions();

  const { messages, sendMessage } = useRorkAgent({
    tools: {},
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setInput("");
    const context =
      prescriptions.length > 0
        ? `Current prescriptions:\n${prescriptions
            .map(
              (p) =>
                `- ${p.title} (${p.createdAt.toLocaleDateString()}): ${p.uri}`,
            )
            .join("\n")}\n\nBased on these, suggest best actions, reminders, and safety checks.`
        : "No prescriptions saved. Provide general health guidance.";
    await sendMessage(`${context}\n\n${message}`);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>AI Health Assistant</Text>
              <Text style={styles.emptyText}>
                Ask me about medicine side effects or describe your symptoms
              </Text>
            </View>
          )}

          {messages.map((message) => (
            <View key={message.id} style={styles.messageWrapper}>
              {message.role === "user" && (
                <View style={styles.userMessage}>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <Text key={`${message.id}-${i}`} style={styles.userText}>
                          {part.text}
                        </Text>
                      );
                    }
                    return null;
                  })}
                </View>
              )}

              {message.role === "assistant" && (
                <View style={styles.assistantMessage}>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <Text
                          key={`${message.id}-${i}`}
                          style={styles.assistantText}
                        >
                          {part.text}
                        </Text>
                      );
                    }
                    return null;
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about medicines or symptoms..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Send size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#0f172a",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: "80%",
    alignSelf: "flex-end",
  },
  userText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 22,
  },
  assistantMessage: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: "80%",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  assistantText: {
    fontSize: 16,
    color: "#0f172a",
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
