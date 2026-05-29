import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APKCard } from "@/components/APKCard";
import { useProject } from "@/contexts/ProjectContext";
import { useColors } from "@/hooks/useColors";

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projects, activeProject, setActiveProjectId, addProject, deleteProject } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [apkName, setApkName] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pickedFile, setPickedFile] = useState<{ name: string; size: number; uri: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePickAPK = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تنبيه", "استيراد الملفات متاح فقط على Android وiOS");
      return;
    }
    try {
      setPicking(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.android.package-archive", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const name = asset.name.replace(/\.apk$/i, "");
        setPickedFile({ name: asset.name, size: asset.size ?? 0, uri: asset.uri });
        setApkName(name);
        setPkgName("");
        setShowModal(true);
      }
    } catch (e) {
      Alert.alert("خطأ", "تعذّر فتح ملف APK");
    } finally {
      setPicking(false);
    }
  };

  const handleAddProject = () => {
    if (!apkName.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addProject(
      apkName.trim(),
      pkgName.trim() || `com.${apkName.toLowerCase().replace(/\s/g, ".")}.app`,
      pickedFile ?? undefined,
    );
    setApkName("");
    setPkgName("");
    setPickedFile(null);
    setShowModal(false);
  };

  const handleLongPress = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("حذف المشروع", "هل تريد حذف هذا المشروع؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteProject(id) },
    ]);
  };

  const completed = projects.filter(p => p.status === "complete").length;
  const analyzing = projects.filter(p => p.status === "analyzing").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.logoText, { color: colors.primary }]}>APK</Text>
          <Text style={[styles.logoSub, { color: colors.foreground }]}>ReverseEngine</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            onPress={handlePickAPK}
            disabled={picking}
            style={[styles.importBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Feather name="upload" size={16} color={colors.primary} />
            <Text style={[styles.importBtnText, { color: colors.primary }]}>
              {picking ? "جاري الاستيراد..." : "استيراد APK"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setPickedFile(null); setApkName(""); setPkgName(""); setShowModal(true); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        <StatBox label="المشاريع" value={projects.length} color={colors.primary} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox label="مكتملة" value={completed} color={colors.success} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox label="قيد التحليل" value={analyzing} color={colors.warning} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox
          label="نقاط ضعف"
          value={projects.reduce((s, p) => s + p.findings.filter(f => f.severity === "critical" || f.severity === "high").length, 0)}
          color={colors.red}
        />
      </View>

      <FlatList
        data={projects}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}
        renderItem={({ item }) => (
          <APKCard
            project={item}
            isActive={activeProject?.id === item.id}
            onPress={() => {
              setActiveProjectId(item.id);
              router.push("/(tabs)/analysis");
            }}
            onLongPress={() => handleLongPress(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد مشاريع</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              استورد ملف APK من جهازك أو أنشئ مشروعاً تجريبياً
            </Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {pickedFile ? "تحليل ملف APK" : "مشروع جديد"}
            </Text>

            {pickedFile ? (
              <View style={[styles.fileInfo, { backgroundColor: colors.muted, borderColor: colors.success + "44" }]}>
                <Feather name="check-circle" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileInfoName, { color: colors.foreground }]} numberOfLines={1}>{pickedFile.name}</Text>
                  <Text style={[styles.fileInfoSize, { color: colors.mutedForeground }]}>
                    {(pickedFile.size / 1_000_000).toFixed(1)} MB · من الذاكرة الداخلية
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setPickedFile(null); setApkName(""); }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickAPK}
                style={[styles.dropZone, { borderColor: colors.primary + "44", backgroundColor: colors.muted }]}
                activeOpacity={0.7}
              >
                <Feather name="upload" size={28} color={colors.primary} />
                <Text style={[styles.dropText, { color: colors.primary }]}>استيراد ملف APK من الجهاز</Text>
                <Text style={[styles.dropSub, { color: colors.mutedForeground }]}>أو أدخل بيانات المشروع يدوياً أدناه</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="smartphone" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="اسم التطبيق"
                placeholderTextColor={colors.mutedForeground}
                value={apkName}
                onChangeText={setApkName}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="package" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Package Name (اختياري)"
                placeholderTextColor={colors.mutedForeground}
                value={pkgName}
                onChangeText={setPkgName}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.cancelBtn, { backgroundColor: colors.muted }]}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddProject}
                style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: apkName.trim() ? 1 : 0.5 }]}
              >
                <Feather name="cpu" size={16} color={colors.primaryForeground} />
                <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>بدء التحليل</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  logoText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  logoSub: { fontSize: 12, fontFamily: "Inter_400Regular", opacity: 0.6, marginTop: -2 },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  importBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  importBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 6 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, borderTopWidth: StyleSheet.hairlineWidth },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fileInfo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  fileInfoName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fileInfoSize: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  dropZone: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 24, alignItems: "center", gap: 8 },
  dropText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dropSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  confirmText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
