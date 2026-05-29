import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { SecurityFinding } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

const SEVERITY_CONFIG = {
  critical: { color: "#EF4444", bg: "#EF444418", label: "حرج",   icon: "alert-octagon" as const },
  high:     { color: "#F97316", bg: "#F9731618", label: "عالي",  icon: "alert-triangle" as const },
  medium:   { color: "#F59E0B", bg: "#F59E0B18", label: "متوسط", icon: "alert-circle" as const },
  low:      { color: "#3B82F6", bg: "#3B82F618", label: "منخفض", icon: "info" as const },
  info:     { color: "#64748B", bg: "#64748B18", label: "معلومة", icon: "info" as const },
};

export function SecurityBadge({ finding }: { finding: SecurityFinding }) {
  const colors = useColors();
  const cfg = SEVERITY_CONFIG[finding.severity];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: cfg.color }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Feather name={cfg.icon} size={11} color={cfg.color} />
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={[styles.category, { color: colors.mutedForeground }]}>{finding.category}</Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{finding.title}</Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>{finding.description}</Text>
      <View style={styles.locRow}>
        <Feather name="map-pin" size={10} color={colors.mutedForeground} />
        <Text style={[styles.loc, { color: colors.mutedForeground }]} numberOfLines={1}>{finding.location}</Text>
      </View>
    </View>
  );
}

export function SeverityPill({ severity }: { severity: SecurityFinding["severity"] }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  category: { fontSize: 11, fontFamily: "Inter_400Regular" },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  loc: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
