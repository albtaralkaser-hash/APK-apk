import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SecurityBadge } from "@/components/SecurityBadge";
import { SecurityFinding, useProject } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "critical" | "high" | "medium" | "low" | "info";

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProject } = useProject();
  const [filter, setFilter] = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!activeProject) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="shield" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد مشروع نشط</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/")} style={[styles.goBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.goBtnText, { color: colors.primaryForeground }]}>انتقل إلى المشاريع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const findings = activeProject.findings;
  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount     = findings.filter(f => f.severity === "high").length;
  const mediumCount   = findings.filter(f => f.severity === "medium").length;
  const lowCount      = findings.filter(f => f.severity === "low").length;
  const infoCount     = findings.filter(f => f.severity === "info").length;

  const totalRisk = criticalCount * 10 + highCount * 5 + mediumCount * 2 + lowCount;
  const maxScore  = findings.length * 10 || 1;
  const securityScore = Math.max(0, Math.round(100 - (totalRisk / maxScore) * 100));

  const scoreColor =
    securityScore >= 80 ? colors.success :
    securityScore >= 60 ? colors.warning :
    colors.red;

  const filtered = filter === "all" ? findings : findings.filter(f => f.severity === filter);

  const FILTERS: { id: Filter; label: string; count: number; color: string }[] = [
    { id: "all",      label: "الكل",   count: findings.length, color: colors.foreground },
    { id: "critical", label: "حرج",    count: criticalCount,   color: "#EF4444" },
    { id: "high",     label: "عالي",   count: highCount,       color: "#F97316" },
    { id: "medium",   label: "متوسط",  count: mediumCount,     color: "#F59E0B" },
    { id: "low",      label: "منخفض",  count: lowCount,        color: "#3B82F6" },
    { id: "info",     label: "معلومة", count: infoCount,       color: "#64748B" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>التقرير الأمني</Text>
          <Text style={[styles.headerPkg, { color: colors.mutedForeground }]}>{activeProject.name}</Text>
        </View>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="download" size={15} color={colors.primary} />
          <Text style={[styles.exportText, { color: colors.primary }]}>تصدير PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>نقاط الأمان</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{securityScore}</Text>
            <Text style={[styles.scoreOutOf, { color: colors.mutedForeground }]}>/ 100</Text>
            <View style={[styles.scoreBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.scoreBarFill, { backgroundColor: scoreColor, width: `${securityScore}%` as any }]} />
            </View>
          </View>
          <View style={styles.scoreRight}>
            <SeverityCount label="حرج"   count={criticalCount} color="#EF4444" />
            <SeverityCount label="عالي"   count={highCount}     color="#F97316" />
            <SeverityCount label="متوسط" count={mediumCount}   color="#F59E0B" />
            <SeverityCount label="منخفض" count={lowCount}      color="#3B82F6" />
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>ملخص التحليل</Text>
          <SumRow icon="package" label="الإصدار" value={`v${activeProject.apkVersion}`} />
          <SumRow icon="layers" label="Classes" value={activeProject.classCount.toLocaleString()} />
          <SumRow icon="code" label="Methods" value={activeProject.methodCount.toLocaleString()} />
          <SumRow icon="link" label="URLs" value={activeProject.urlCount.toLocaleString()} />
          <SumRow icon="shield" label="التعتيم" value={activeProject.obfuscated ? "مكتشف" : "لا يوجد"} />
          <SumRow icon="cpu" label="Native Libraries" value={activeProject.nativeLibs.length > 0 ? activeProject.nativeLibs.join(", ") : "لا يوجد"} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الثغرات المكتشفة</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: filter === f.id ? f.color + "22" : colors.card, borderColor: filter === f.id ? f.color : colors.border },
                ]}
              >
                <Text style={[styles.filterLabel, { color: filter === f.id ? f.color : colors.mutedForeground }]}>{f.label}</Text>
                <View style={[styles.filterCount, { backgroundColor: f.color + "22" }]}>
                  <Text style={[styles.filterCountText, { color: f.color }]}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.noFindings}>
            <Feather name="check-circle" size={36} color={colors.success} />
            <Text style={[styles.noFindingsText, { color: colors.success }]}>لا توجد ثغرات في هذه الفئة</Text>
          </View>
        ) : (
          filtered.map(f => <SecurityBadge key={f.id} finding={f} />)
        )}
      </ScrollView>
    </View>
  );
}

function SeverityCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.sevCount}>
      <Text style={[styles.sevCountNum, { color }]}>{count}</Text>
      <Text style={[styles.sevCountLabel, { color }]}>{label}</Text>
    </View>
  );
}

function SumRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sumRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.sumValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  goBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  goBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerPkg: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  exportText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  scoreLeft: { flex: 1 },
  scoreTitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  scoreValue: { fontSize: 48, fontFamily: "Inter_700Bold", lineHeight: 56 },
  scoreOutOf: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10 },
  scoreBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  scoreRight: { paddingLeft: 16, gap: 8 },
  sevCount: { alignItems: "center" },
  sevCountNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sevCountLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  summaryCard: { borderRadius: 14, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_700Bold", padding: 14, paddingBottom: 10 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sumLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sumValue: { fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "50%", textAlign: "right" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10 },
  filtersScroll: { marginBottom: 12 },
  filtersRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  noFindings: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  noFindingsText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
