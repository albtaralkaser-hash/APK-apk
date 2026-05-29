import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Project } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

interface APKCardProps {
  project: Project;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
  onStop: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m ago`;
}

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "#64748B", icon: "clock" as const },
  analyzing: { label: "Analyzing", color: "#F59E0B", icon: "loader" as const },
  complete:  { label: "Complete",  color: "#10B981", icon: "check-circle" as const },
  error:     { label: "Error",     color: "#EF4444", icon: "alert-circle" as const },
};

export function APKCard({ project, isActive, onPress, onDelete, onStop }: APKCardProps) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[project.status];

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onPress();
  };

  const handleDelete = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "حذف المشروع",
      `هل تريد حذف "${project.name}" نهائياً؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: onDelete },
      ]
    );
  };

  const handleStop = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "إيقاف التحليل",
      "هل تريد إيقاف عملية التحليل؟ يمكنك استئنافها لاحقاً.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "إيقاف", style: "destructive", onPress: onStop },
      ]
    );
  };

  const criticalCount = project.findings.filter(f => f.severity === "critical").length;
  const highCount = project.findings.filter(f => f.severity === "high").length;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border },
        isActive && styles.activeCard,
      ]}
    >
      {isActive && <View style={[styles.activeLine, { backgroundColor: colors.primary }]} />}

      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
          <Feather name="package" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{project.name}</Text>
          <Text style={[styles.pkg, { color: colors.mutedForeground }]} numberOfLines={1}>{project.packageName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
          <Feather name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* زر الإيقاف — يظهر فقط أثناء التحليل */}
        {project.status === "analyzing" && (
          <TouchableOpacity
            onPress={handleStop}
            style={[styles.actionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="square" size={13} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* زر الحذف — دائماً مرئي */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.actionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {project.status === "analyzing" && (
        <View style={styles.progressRow}>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${project.analysisProgress}%` as any }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{Math.round(project.analysisProgress)}%</Text>
        </View>
      )}

      <View style={styles.meta}>
        <MetaItem icon="hard-drive" label={formatSize(project.sizeBytes)} />
        <MetaItem icon="layers" label={`API ${project.targetSdk}`} />
        <MetaItem icon="clock" label={timeAgo(project.createdAt)} />
        {project.obfuscated && <MetaItem icon="shield" label="Obfuscated" color="#7C3AED" />}
      </View>

      {project.status === "complete" && project.findings.length > 0 && (
        <View style={styles.findings}>
          {criticalCount > 0 && (
            <View style={[styles.findBadge, { backgroundColor: "#EF444422" }]}>
              <Text style={[styles.findCount, { color: "#EF4444" }]}>{criticalCount} Critical</Text>
            </View>
          )}
          {highCount > 0 && (
            <View style={[styles.findBadge, { backgroundColor: "#F59E0B22" }]}>
              <Text style={[styles.findCount, { color: "#F59E0B" }]}>{highCount} High</Text>
            </View>
          )}
          {project.findings.length - criticalCount - highCount > 0 && (
            <View style={[styles.findBadge, { backgroundColor: "#64748B22" }]}>
              <Text style={[styles.findCount, { color: "#64748B" }]}>+{project.findings.length - criticalCount - highCount} more</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function MetaItem({ icon, label, color }: { icon: keyof typeof Feather.glyphMap; label: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={11} color={color ?? colors.mutedForeground} />
      <Text style={[styles.metaText, { color: color ?? colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden", padding: 14 },
  activeCard: { borderWidth: 1.5 },
  activeLine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  pkg: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressBg: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11, fontFamily: "Inter_500Medium", width: 30, textAlign: "right" },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  findings: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#1E1E35" },
  findBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  findCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
