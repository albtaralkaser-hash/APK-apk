import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleCard } from "@/components/ModuleCard";
import { useProject } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

export default function AnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProject } = useProject();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!activeProject) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="inbox" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد مشروع نشط</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/")} style={[styles.goBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.goBtnText, { color: colors.primaryForeground }]}>انتقل إلى المشاريع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completed = activeProject.modules.filter(m => m.status === "complete").length;
  const total = activeProject.modules.length;
  const overallPct = Math.round((completed / total) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{activeProject.name}</Text>
          <Text style={[styles.headerPkg, { color: colors.mutedForeground }]} numberOfLines={1}>{activeProject.packageName}</Text>
        </View>
        <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
          <Text style={[styles.progressNum, { color: colors.primary }]}>{overallPct}%</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}>
        <View style={[styles.statsGrid, { marginBottom: 20 }]}>
          <StatCard icon="layers" label="Classes" value={activeProject.classCount.toLocaleString()} color={colors.cyan} />
          <StatCard icon="code" label="Methods" value={activeProject.methodCount.toLocaleString()} color={colors.purple} />
          <StatCard icon="type" label="Strings" value={activeProject.stringCount.toLocaleString()} color={colors.green} />
          <StatCard icon="link" label="URLs" value={activeProject.urlCount.toLocaleString()} color={colors.warning} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="الإصدار" value={`v${activeProject.apkVersion}`} />
          <Row label="Target SDK" value={`API ${activeProject.targetSdk}`} />
          <Row label="Min SDK" value={`API ${activeProject.minSdk}`} />
          <Row label="التعتيم" value={activeProject.obfuscated ? "مكتشف" : "لا يوجد"} valueColor={activeProject.obfuscated ? colors.warning : colors.success} />
          {activeProject.nativeLibs.length > 0 && (
            <Row label="Native Libraries" value={activeProject.nativeLibs.join(", ")} />
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأذونات المطلوبة</Text>
        <View style={[styles.permsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {activeProject.permissions.map((perm, i) => {
            const isDangerous = perm.includes("LOCATION") || perm.includes("CAMERA") || perm.includes("RECORD") || perm.includes("READ_CONTACTS");
            return (
              <View key={i} style={[styles.permRow, { borderBottomColor: colors.border }]}>
                <Feather name={isDangerous ? "alert-triangle" : "check-circle"} size={13} color={isDangerous ? colors.warning : colors.success} />
                <Text style={[styles.permText, { color: isDangerous ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {perm.replace("android.permission.", "")}
                </Text>
                {isDangerous && (
                  <View style={[styles.dangerBadge, { backgroundColor: colors.warning + "22" }]}>
                    <Text style={[styles.dangerText, { color: colors.warning }]}>خطير</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>وحدات التحليل</Text>
        {activeProject.modules.map(mod => (
          <ModuleCard key={mod.id} module={mod} />
        ))}

        {activeProject.status === "complete" && (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/editor")}
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name="code" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>فتح المحرر</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/frida")}
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name="zap" size={18} color={colors.purple} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>تشغيل Frida</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/reports")}
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name="shield" size={18} color={colors.red} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>التقرير الأمني</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/rebuild")}
              style={[styles.rebuildBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name="package" size={20} color={colors.primaryForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rebuildBtnTitle, { color: colors.primaryForeground }]}>إعادة التجميع والتصدير APK</Text>
                <Text style={[styles.rebuildBtnSub, { color: colors.primaryForeground + "BB" }]}>تطبيق التعديلات · توقيع · تصدير</Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  goBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  goBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "flex-end", gap: 12 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerPkg: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  progressCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  progressNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 8 },
  infoCard: { borderRadius: 14, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "60%", textAlign: "right" },
  permsCard: { borderRadius: 14, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  permRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  permText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  dangerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  dangerText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rebuildBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, marginTop: 10 },
  rebuildBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rebuildBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
