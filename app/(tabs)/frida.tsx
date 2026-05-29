import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookCard } from "@/components/HookCard";
import { FridaHook, useFrida } from "@/contexts/FridaContext";
import { useColors } from "@/hooks/useColors";

type Tab = "hooks" | "logs" | "scripts";

export default function FridaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hooks, scripts, deviceConnected, liveLogs, isStreaming, toggleHook, addCustomHook, removeHook, startStreaming, stopStreaming, clearLogs } = useFrida();
  const [activeTab, setActiveTab] = useState<Tab>("hooks");
  const [showModal, setShowModal] = useState(false);
  const [customClass, setCustomClass] = useState("");
  const [customMethod, setCustomMethod] = useState("");
  const [customCategory, setCustomCategory] = useState<FridaHook["category"]>("custom");
  const logsScrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const activeHooks = hooks.filter(h => h.isActive).length;

  const handleAddHook = () => {
    if (!customClass.trim() || !customMethod.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addCustomHook(customClass.trim(), customMethod.trim(), customCategory);
    setCustomClass("");
    setCustomMethod("");
    setShowModal(false);
  };

  const handleStreamToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isStreaming ? stopStreaming() : startStreaming();
  };

  const TABS: { id: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: "hooks",   label: "Hooks",   icon: "anchor" },
    { id: "logs",    label: "Live Log", icon: "terminal" },
    { id: "scripts", label: "Scripts", icon: "file-code" as any },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.deviceStatus}>
          <View style={[styles.statusDot, { backgroundColor: deviceConnected ? colors.success : colors.red }]} />
          <View>
            <Text style={[styles.fridaTitle, { color: colors.foreground }]}>Frida 16.2.1</Text>
            <Text style={[styles.deviceName, { color: colors.mutedForeground }]}>
              {deviceConnected ? "emulator-5554 · com.banking.securepay" : "No device connected"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addHookBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
        <SummaryChip label="Active Hooks" value={activeHooks} color={colors.primary} />
        <SummaryChip label="Total Hooks" value={hooks.length} color={colors.mutedForeground} />
        <SummaryChip label="Total Intercepts" value={hooks.reduce((s, h) => s + h.interceptCount, 0)} color={colors.success} />
        <TouchableOpacity
          onPress={handleStreamToggle}
          style={[styles.streamBtn, { backgroundColor: isStreaming ? colors.red + "22" : colors.success + "22" }]}
        >
          <View style={[styles.streamDot, { backgroundColor: isStreaming ? colors.red : colors.success }]} />
          <Text style={[styles.streamTxt, { color: isStreaming ? colors.red : colors.success }]}>
            {isStreaming ? "Stop" : "Stream"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Feather name={tab.icon} size={15} color={activeTab === tab.id ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? colors.primary : colors.mutedForeground }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "hooks" && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: bottomPad + 80 }}>
          {hooks.map(hook => (
            <HookCard key={hook.id} hook={hook} onToggle={() => toggleHook(hook.id)} onRemove={() => removeHook(hook.id)} />
          ))}
          {hooks.length === 0 && (
            <View style={styles.empty}>
              <Feather name="anchor" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No hooks configured</Text>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === "logs" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.logToolbar, { borderBottomColor: colors.border }]}>
            <Text style={[styles.logCount, { color: colors.mutedForeground }]}>{liveLogs.length} entries</Text>
            <TouchableOpacity onPress={clearLogs}>
              <Feather name="trash-2" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={logsScrollRef}
            style={styles.logsContainer}
            contentContainerStyle={{ padding: 12, paddingBottom: bottomPad + 80 }}
          >
            {liveLogs.map((log, i) => {
              const isCrypto = log.includes("[CRYPTO]");
              const isNet   = log.includes("[NET]");
              const isJNI   = log.includes("[JNI]");
              const logColor = isCrypto ? colors.purple : isNet ? colors.cyan : isJNI ? colors.red : colors.success;
              return (
                <View key={i} style={[styles.logLine, { borderLeftColor: logColor }]}>
                  <Text style={[styles.logText, { color: colors.foreground }]}>{log}</Text>
                </View>
              );
            })}
            {liveLogs.length === 0 && (
              <View style={styles.empty}>
                <Feather name="terminal" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No logs yet. Start streaming.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {activeTab === "scripts" && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: bottomPad + 80 }}>
          {scripts.map(script => (
            <View key={script.id} style={[styles.scriptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scriptHeader}>
                <Feather name="file-text" size={16} color={colors.primary} />
                <Text style={[styles.scriptName, { color: colors.foreground }]}>{script.name}</Text>
                <TouchableOpacity style={[styles.runBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="play" size={12} color={colors.primaryForeground} />
                  <Text style={[styles.runBtnText, { color: colors.primaryForeground }]}>Run</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.codeBlock, { backgroundColor: "#0D1117" }]}>
                <Text style={styles.scriptCode}>{script.code.split("\n").slice(0, 6).join("\n")}</Text>
                {script.code.split("\n").length > 6 && (
                  <Text style={[styles.moreLines, { color: colors.mutedForeground }]}>
                    +{script.code.split("\n").length - 6} more lines
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة Hook جديد</Text>

            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Class Name (e.g. javax.crypto.Cipher)"
                placeholderTextColor={colors.mutedForeground}
                value={customClass}
                onChangeText={setCustomClass}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Method Name (e.g. doFinal)"
                placeholderTextColor={colors.mutedForeground}
                value={customMethod}
                onChangeText={setCustomMethod}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.categoryLabel, { color: colors.mutedForeground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(["crypto", "network", "file", "jni", "reflection", "custom"] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCustomCategory(cat)}
                  style={[styles.catBtn, { backgroundColor: customCategory === cat ? colors.primary : colors.muted }]}
                >
                  <Text style={[styles.catBtnText, { color: customCategory === cat ? colors.primaryForeground : colors.mutedForeground }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.cancelBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddHook} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
                <Feather name="anchor" size={16} color={colors.primaryForeground} />
                <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>إضافة Hook</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryChip}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  deviceStatus: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  fridaTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  deviceName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", gap: 8 },
  addHookBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  summaryChip: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  streamBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  streamDot: { width: 6, height: 6, borderRadius: 3 },
  streamTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  tabLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  logsContainer: { flex: 1 },
  logToolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  logCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logLine: { borderLeftWidth: 2, paddingLeft: 8, marginBottom: 4 },
  logText: { fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), lineHeight: 18 },
  scriptCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  scriptHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  scriptName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  runBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  runBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  codeBlock: { padding: 12 },
  scriptCode: { fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), color: "#8B949E", lineHeight: 18 },
  moreLines: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular" },
  categoryLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  catBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  confirmText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
