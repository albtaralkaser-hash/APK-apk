import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FridaHook } from "@/contexts/FridaContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_CONFIG = {
  crypto:     { color: "#7C3AED", icon: "lock" as const,      label: "Crypto"      },
  network:    { color: "#00D4FF", icon: "wifi" as const,      label: "Network"     },
  file:       { color: "#F59E0B", icon: "hard-drive" as const, label: "File"       },
  jni:        { color: "#EF4444", icon: "cpu" as const,       label: "JNI"         },
  reflection: { color: "#10B981", icon: "refresh-cw" as const, label: "Reflection" },
  custom:     { color: "#64748B", icon: "edit-2" as const,    label: "Custom"      },
};

interface HookCardProps {
  hook: FridaHook;
  onToggle: () => void;
  onRemove: () => void;
}

export function HookCard({ hook, onToggle, onRemove }: HookCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[hook.category];

  const handleToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hook.isActive ? cfg.color + "44" : colors.border }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.header}>
          <View style={[styles.catBadge, { backgroundColor: cfg.color + "18" }]}>
            <Feather name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.catText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <View style={styles.spacer} />
          <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.countText, { color: hook.isActive ? colors.primary : colors.mutedForeground }]}>
              {hook.interceptCount}
            </Text>
          </View>
          <TouchableOpacity onPress={handleToggle} style={[styles.toggle, { backgroundColor: hook.isActive ? colors.primary + "22" : colors.muted }]}>
            <View style={[styles.toggleDot, { backgroundColor: hook.isActive ? colors.primary : colors.mutedForeground }]} />
            <Text style={[styles.toggleText, { color: hook.isActive ? colors.primary : colors.mutedForeground }]}>
              {hook.isActive ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.className, { color: colors.mutedForeground }]} numberOfLines={1}>{hook.className}</Text>
        <Text style={[styles.methodName, { color: colors.foreground }]} numberOfLines={1}>.{hook.methodName}()</Text>
      </TouchableOpacity>

      {expanded && hook.logs.length > 0 && (
        <View style={[styles.logsSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.logsLabel, { color: colors.mutedForeground }]}>Recent Intercepts</Text>
          {hook.logs.slice(0, 3).map(log => (
            <View key={log.id} style={[styles.logItem, { backgroundColor: colors.muted }]}>
              <View style={styles.logHeader}>
                <View style={[styles.logTypeDot, { backgroundColor: log.type === "enter" ? colors.green : log.type === "exit" ? colors.primary : colors.warning }]} />
                <Text style={[styles.logType, { color: colors.mutedForeground }]}>{log.type}</Text>
                <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{log.timestamp}</Text>
              </View>
              <Text style={[styles.logData, { color: colors.foreground }]} numberOfLines={3}>{log.data}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  spacer: { flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  toggleDot: { width: 6, height: 6, borderRadius: 3 },
  toggleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeBtn: { padding: 4 },
  className: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  methodName: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  logsSection: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  logsLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
  logItem: { borderRadius: 8, padding: 8 },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  logTypeDot: { width: 6, height: 6, borderRadius: 3 },
  logType: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  logData: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
