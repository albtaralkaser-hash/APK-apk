import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Module } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

const MODULE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  m1: "folder",
  m2: "tool",
  m3: "unlock",
  m4: "bar-chart-2",
  m5: "zap",
  m6: "code",
  m7: "package",
};

export function ModuleCard({ module }: { module: Module }) {
  const colors = useColors();

  const statusColor =
    module.status === "complete" ? colors.success :
    module.status === "running"  ? colors.warning :
    module.status === "error"    ? colors.red :
    colors.mutedForeground;

  const statusLabel =
    module.status === "complete" ? "مكتمل" :
    module.status === "running"  ? "جاري..." :
    module.status === "error"    ? "خطأ" :
    "في الانتظار";

  const icon = MODULE_ICONS[module.id] ?? "cpu";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: statusColor + "18" }]}>
        <Feather name={icon} size={18} color={statusColor} />
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{module.nameAr}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {module.status === "running" && (
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.warning, width: `${module.progress}%` as any }]} />
          </View>
        )}

        {module.status === "complete" && module.resultCount !== undefined && (
          <Text style={[styles.result, { color: colors.mutedForeground }]}>
            {module.resultCount.toLocaleString()} نتيجة
          </Text>
        )}

        {module.status === "idle" && (
          <Text style={[styles.result, { color: colors.mutedForeground }]}>لم يبدأ بعد</Text>
        )}
      </View>

      {module.status === "complete" && (
        <Feather name="check-circle" size={16} color={colors.success} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  status: { fontSize: 12, fontFamily: "Inter_500Medium" },
  progressBg: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  result: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
