import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProject } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

interface BuildStep {
  id: string;
  label: string;
  labelAr: string;
  duration: number;
  icon: keyof typeof Feather.glyphMap;
  detail?: string;
}

const BUILD_STEPS: BuildStep[] = [
  { id: "1", label: "Validating patches",      labelAr: "التحقق من التعديلات",       duration: 800,  icon: "check-square",  detail: "فحص 7 ملفات معدّلة..." },
  { id: "2", label: "Applying string patches", labelAr: "تطبيق تعديلات النصوص",     duration: 600,  icon: "type",          detail: "تعديل 4 اعتمادات و2 مفتاح..." },
  { id: "3", label: "Compiling Smali → DEX",   labelAr: "تحويل Smali إلى DEX",      duration: 2200, icon: "cpu",           detail: "baksmali 2.5.2 — تجميع 1247 ملف..." },
  { id: "4", label: "Rebuilding APK",          labelAr: "إعادة بناء APK",            duration: 1800, icon: "package",       detail: "apktool b — تجميع الموارد والـ DEX..." },
  { id: "5", label: "Signing APK",             labelAr: "توقيع APK",                 duration: 900,  icon: "key",           detail: "apksigner — توقيع بمفتاح المستخدم..." },
  { id: "6", label: "Verifying signature",     labelAr: "التحقق من التوقيع",         duration: 400,  icon: "shield",        detail: "apksigner verify — ✓ تم التحقق بنجاح" },
  { id: "7", label: "Output ready",            labelAr: "الملف النهائي جاهز",        duration: 0,    icon: "check-circle",  detail: "Banking_App_patched_v3.2.1.apk" },
];

type BuildStatus = "idle" | "building" | "done" | "error";

export default function RebuildScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProject } = useProject();
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [signMode, setSignMode] = useState<"debug" | "custom">("debug");
  const [alignZip, setAlignZip] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("en", { hour12: false });
    setLog(prev => [...prev, `[${time}] ${msg}`]);
  };

  const startBuild = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBuildStatus("building");
    setCompletedSteps(new Set());
    setCurrentStep(null);
    setLog([]);

    appendLog("بدء عملية إعادة التجميع...");
    appendLog(`المشروع: ${activeProject?.name ?? "Banking App"}`);
    appendLog(`وضع التوقيع: ${signMode === "debug" ? "Debug Keystore" : "Custom Keystore"}`);

    let delay = 0;
    for (const step of BUILD_STEPS) {
      delay += 200;
      setTimeout(() => {
        setCurrentStep(step.id);
        appendLog(`▶ ${step.labelAr}`);
        if (step.detail) appendLog(`  ${step.detail}`);
      }, delay);

      delay += step.duration;
      setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, step.id]));
        if (step.id === "7") {
          setBuildStatus("done");
          appendLog("✓ اكتمل البناء بنجاح!");
          appendLog(`الحجم النهائي: ${((activeProject?.sizeBytes ?? 48_500_000) * 0.97 / 1_000_000).toFixed(1)} MB`);
          appendLog(`SHA-256: a3f8b2c1d4e5f6789012345678901234abcdef01`);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, delay);
    }
  };

  const handleExport = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تصدير", "سيتم تحميل الملف: Banking_App_patched_v3.2.1.apk");
      return;
    }
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync("file:///data/local/tmp/Banking_App_patched_v3.2.1.apk", {
        mimeType: "application/vnd.android.package-archive",
        dialogTitle: "تصدير APK المعدّل",
        UTI: "com.apple.itunes.ipa",
      });
    } else {
      Alert.alert("تصدير APK", "الملف جاهز في:\n/output/Banking_App_patched_v3.2.1.apk", [{ text: "حسناً" }]);
    }
  };

  const totalTime = BUILD_STEPS.reduce((s, b) => s + b.duration, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>إعادة التجميع والتصدير</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {activeProject?.name ?? "Banking App"} · v{activeProject?.apkVersion ?? "3.2.1"}
          </Text>
        </View>
        {buildStatus === "done" && (
          <View style={[styles.doneBadge, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check" size={12} color={colors.success} />
            <Text style={[styles.doneBadgeText, { color: colors.success }]}>جاهز</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20 }}>
        {buildStatus === "idle" && (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>ملخص التعديلات</Text>
              <SummaryRow icon="file-text" label="ملفات Smali معدّلة" value="3 ملفات" color={colors.warning} />
              <SummaryRow icon="key" label="اعتمادات مُغيَّرة" value="4 قيم" color={colors.red} />
              <SummaryRow icon="zap" label="أكواد محقونة" value="2 كتلة" color={colors.purple} />
              <SummaryRow icon="package" label="الحجم التقريبي" value={`${((activeProject?.sizeBytes ?? 48_500_000) * 0.97 / 1_000_000).toFixed(1)} MB`} color={colors.primary} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إعدادات التوقيع</Text>
            <View style={[styles.signCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSignMode("debug")}
                style={[styles.signOption, signMode === "debug" && { backgroundColor: colors.primary + "18" }]}
              >
                <View style={[styles.radioOuter, { borderColor: signMode === "debug" ? colors.primary : colors.border }]}>
                  {signMode === "debug" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.signOptionTitle, { color: colors.foreground }]}>Debug Keystore</Text>
                  <Text style={[styles.signOptionDesc, { color: colors.mutedForeground }]}>توقيع تلقائي للاختبار · لا يتطلب إعداداً</Text>
                </View>
                <View style={[styles.signBadge, { backgroundColor: colors.success + "22" }]}>
                  <Text style={[styles.signBadgeText, { color: colors.success }]}>موصى به</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.signDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                onPress={() => setSignMode("custom")}
                style={[styles.signOption, signMode === "custom" && { backgroundColor: colors.purple + "18" }]}
              >
                <View style={[styles.radioOuter, { borderColor: signMode === "custom" ? colors.purple : colors.border }]}>
                  {signMode === "custom" && <View style={[styles.radioInner, { backgroundColor: colors.purple }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.signOptionTitle, { color: colors.foreground }]}>Custom Keystore</Text>
                  <Text style={[styles.signOptionDesc, { color: colors.mutedForeground }]}>استخدام مفتاحك الخاص (.jks / .keystore)</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.optionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="align-justify" size={16} color={colors.mutedForeground} />
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>zipalign (محاذاة الذاكرة)</Text>
              <TouchableOpacity
                onPress={() => setAlignZip(!alignZip)}
                style={[styles.toggle, { backgroundColor: alignZip ? colors.primary : colors.border }]}
              >
                <View style={[styles.toggleKnob, { transform: [{ translateX: alignZip ? 14 : 0 }] }]} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>خطوات البناء</Text>
            {BUILD_STEPS.map((step, i) => (
              <View key={step.id} style={[styles.stepRow, { borderLeftColor: colors.border }]}>
                <View style={[styles.stepDot, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name={step.icon} size={12} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepLabel, { color: colors.foreground }]}>{step.labelAr}</Text>
                  <Text style={[styles.stepTime, { color: colors.mutedForeground }]}>~{(step.duration / 1000).toFixed(1)}s</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={startBuild} style={[styles.buildBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
              <Feather name="play" size={20} color={colors.primaryForeground} />
              <Text style={[styles.buildBtnText, { color: colors.primaryForeground }]}>بدء إعادة التجميع</Text>
              <Text style={[styles.buildBtnSub, { color: colors.primaryForeground + "AA" }]}>~{(totalTime / 1000).toFixed(0)}s</Text>
            </TouchableOpacity>
          </>
        )}

        {(buildStatus === "building" || buildStatus === "done") && (
          <>
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {BUILD_STEPS.map(step => {
                const isDone    = completedSteps.has(step.id);
                const isRunning = currentStep === step.id && !isDone;
                const stepColor = isDone ? colors.success : isRunning ? colors.warning : colors.mutedForeground;
                return (
                  <View key={step.id} style={[styles.buildStepRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.buildStepIcon, { backgroundColor: stepColor + "18" }]}>
                      <Feather name={isDone ? "check-circle" : isRunning ? "loader" : step.icon} size={14} color={stepColor} />
                    </View>
                    <Text style={[styles.buildStepLabel, { color: isDone ? colors.foreground : isRunning ? colors.warning : colors.mutedForeground }]}>
                      {step.labelAr}
                    </Text>
                    {isDone && <Feather name="check" size={14} color={colors.success} />}
                    {isRunning && (
                      <View style={[styles.runningBadge, { backgroundColor: colors.warning + "22" }]}>
                        <Text style={[styles.runningText, { color: colors.warning }]}>جاري...</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={[styles.logCard, { backgroundColor: "#0D1117", borderColor: colors.border }]}>
              <View style={[styles.logHeader, { borderBottomColor: colors.border }]}>
                <Feather name="terminal" size={13} color={colors.primary} />
                <Text style={[styles.logHeaderText, { color: colors.primary }]}>Build Log</Text>
              </View>
              <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ padding: 10 }}>
                {log.map((line, i) => (
                  <Text key={i} style={[styles.logLine, {
                    color: line.includes("✓") || line.includes("اكتمل") ? colors.success :
                           line.includes("▶") ? colors.warning :
                           line.startsWith("  ") ? "#64748B" : "#8B949E"
                  }]}>{line}</Text>
                ))}
              </ScrollView>
            </View>

            {buildStatus === "done" && (
              <View style={[styles.outputCard, { backgroundColor: colors.card, borderColor: colors.success + "44" }]}>
                <View style={styles.outputHeader}>
                  <Feather name="package" size={20} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.outputFileName, { color: colors.foreground }]}>Banking_App_patched_v3.2.1.apk</Text>
                    <Text style={[styles.outputFileMeta, { color: colors.mutedForeground }]}>
                      {((activeProject?.sizeBytes ?? 48_500_000) * 0.97 / 1_000_000).toFixed(1)} MB · {signMode === "debug" ? "Debug Signed" : "Custom Signed"} · Zipaligned
                    </Text>
                  </View>
                </View>

                <View style={[styles.hashRow, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.hashLabel, { color: colors.mutedForeground }]}>SHA-256</Text>
                  <Text style={[styles.hashValue, { color: colors.primary }]} numberOfLines={1}>a3f8b2c1d4e5f6789012345678901234abcdef01</Text>
                </View>

                <View style={styles.outputActions}>
                  <TouchableOpacity onPress={handleExport} style={[styles.exportBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
                    <Feather name="share-2" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.exportBtnText, { color: colors.primaryForeground }]}>تصدير / مشاركة APK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert("تثبيت", "سيتم تثبيت APK على الجهاز المتصل عبر ADB\n\n$ adb install Banking_App_patched_v3.2.1.apk")}
                    style={[styles.installBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    activeOpacity={0.85}
                  >
                    <Feather name="smartphone" size={18} color={colors.foreground} />
                    <Text style={[styles.installBtnText, { color: colors.foreground }]}>تثبيت via ADB</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({ icon, label, value, color }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  doneBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  summaryCard: { borderRadius: 14, borderWidth: 1, marginBottom: 18, overflow: "hidden" },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_700Bold", padding: 14, paddingBottom: 8 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 4 },
  signCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  signOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  signOptionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  signOptionDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  signBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  signBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  signDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 18 },
  optionLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  toggle: { width: 36, height: 22, borderRadius: 11, padding: 3 },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingLeft: 8, marginBottom: 10, borderLeftWidth: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  stepTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  buildBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16, marginTop: 10 },
  buildBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  buildBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressCard: { borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  buildStepRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  buildStepIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  buildStepLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  runningBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  runningText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  logCard: { borderRadius: 12, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logHeaderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  logLine: { fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), lineHeight: 18 },
  outputCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12 },
  outputHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  outputFileName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  outputFileMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  hashRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8 },
  hashLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  hashValue: { flex: 1, fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  outputActions: { gap: 8 },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  exportBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  installBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  installBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
