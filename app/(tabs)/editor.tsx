import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEMO_TREE, FileTree } from "@/components/FileTree";
import { useColors } from "@/hooks/useColors";

type ViewMode = "smali" | "strings" | "inject";
type EditorMode = "view" | "edit";
type InjectMode = "after" | "before" | "replace";

const FILE_CONTENTS: Record<string, { code: string; language: "smali" | "java" | "xml" | "json" }> = {
  "SessionManager.smali": {
    language: "smali",
    code: `.class public Lcom/banking/securepay/auth/SessionManager;
.super Ljava/lang/Object;

.field private static instance:Lcom/banking/securepay/auth/SessionManager;
.field private mContext:Landroid/content/Context;
.field private mPrefs:Landroid/content/SharedPreferences;

.method public static getInstance(Landroid/content/Context;)Lcom/banking/securepay/auth/SessionManager;
    .locals 1
    sget-object v0, Lcom/banking/securepay/auth/SessionManager;->instance:Lcom/banking/securepay/auth/SessionManager;
    if-nez v0, :cond_0
    new-instance v0, Lcom/banking/securepay/auth/SessionManager;
    invoke-direct {v0, p0}, Lcom/banking/securepay/auth/SessionManager;-><init>(Landroid/content/Context;)V
    sput-object v0, Lcom/banking/securepay/auth/SessionManager;->instance:Lcom/banking/securepay/auth/SessionManager;
    :cond_0
    return-object v0
.end method

.method public saveToken(Ljava/lang/String;)V
    .locals 3
    iget-object v0, p0, Lcom/banking/securepay/auth/SessionManager;->mPrefs:Landroid/content/SharedPreferences;
    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v1
    const-string v2, "session_token"
    invoke-interface {v1, v2, p1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v1
    invoke-interface {v1}, Landroid/content/SharedPreferences$Editor;->apply()V
    return-void
.end method

.method public getToken()Ljava/lang/String;
    .locals 3
    iget-object v0, p0, Lcom/banking/securepay/auth/SessionManager;->mPrefs:Landroid/content/SharedPreferences;
    const-string v1, "session_token"
    const/4 v2, 0x0
    invoke-interface {v0, v1, v2}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    return-object v0
.end method`,
  },
  "AESHelper.smali": {
    language: "smali",
    code: `.class public Lcom/banking/securepay/crypto/AESHelper;
.super Ljava/lang/Object;

.field private static final SECRET_KEY:Ljava/lang/String; = "7a8b9c0d1e2f345678901234567890ab"
.field private static final IV_KEY:Ljava/lang/String; = "a1b2c3d4e5f60708"

.method public static encrypt(Ljava/lang/String;)Ljava/lang/String;
    .locals 6
    const-string v0, "AES/CBC/PKCS5Padding"
    invoke-static {v0}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;
    move-result-object v1
    sget-object v2, Lcom/banking/securepay/crypto/AESHelper;->SECRET_KEY:Ljava/lang/String;
    invoke-virtual {v2}, Ljava/lang/String;->getBytes()[B
    move-result-object v2
    new-instance v3, Ljavax/crypto/spec/SecretKeySpec;
    const-string v4, "AES"
    invoke-direct {v3, v2, v4}, Ljavax/crypto/spec/SecretKeySpec;-><init>([BLjava/lang/String;)V
    return-object v0
.end method`,
  },
  "AndroidManifest.xml": {
    language: "xml",
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.banking.securepay"
    android:versionCode="32"
    android:versionName="3.2.1">

    <application
        android:name=".BankingApp"
        android:allowBackup="true"
        android:debuggable="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name">

        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>`,
  },
  "config.json": {
    language: "json",
    code: `{
  "api_base_url": "https://api.bank.com/v2",
  "api_key": "sk-live-7a8b9c0d1e2f3456789012",
  "secret_key": "prod_secret_xK9mN3pQ7rS2vW5y",
  "session_timeout": 1800,
  "debug_mode": true
}`,
  },
};

interface StringEntry {
  id: string;
  key: string;
  value: string;
  type: "credential" | "url" | "key" | "string";
  file: string;
  line: number;
  modified: boolean;
}

const EXTRACTED_STRINGS: StringEntry[] = [
  { id: "s1", key: "SECRET_KEY", value: "7a8b9c0d1e2f345678901234567890ab", type: "key", file: "AESHelper.smali", line: 5, modified: false },
  { id: "s2", key: "IV_KEY", value: "a1b2c3d4e5f60708", type: "key", file: "AESHelper.smali", line: 6, modified: false },
  { id: "s3", key: "api_key", value: "sk-live-7a8b9c0d1e2f3456789012", type: "credential", file: "config.json", line: 3, modified: false },
  { id: "s4", key: "secret_key", value: "prod_secret_xK9mN3pQ7rS2vW5y", type: "credential", file: "config.json", line: 4, modified: false },
  { id: "s5", key: "api_base_url", value: "https://api.bank.com/v2", type: "url", file: "config.json", line: 2, modified: false },
  { id: "s6", key: "session_token", value: "session_token", type: "string", file: "SessionManager.smali", line: 23, modified: false },
  { id: "s7", key: "app_name", value: "SecurePay", type: "string", file: "strings.xml", line: 4, modified: false },
];

const INJECT_TEMPLATES = [
  { id: "t1", name: "تعطيل جذر الكشف", icon: "shield-off", code: "# Root detection bypass\n    const/4 v0, 0x0\n    return v0" },
  { id: "t2", name: "تجاوز SSL Pinning", icon: "wifi-off", code: "# SSL Pinning bypass\n    return-void" },
  { id: "t3", name: "تعطيل التحقق من التوقيع", icon: "key", code: "# Signature check bypass\n    const/4 v0, 0x1\n    return v0" },
  { id: "t4", name: "حقن Log مخصص", icon: "terminal", code: ".method public injectedLog()V\n    .locals 2\n    const-string v0, \"[INJECTED] Hook active\"\n    invoke-static {v0}, Landroid/util/Log;->d(Ljava/lang/String;)V\n    return-void\n.end method" },
  { id: "t5", name: "تفعيل وضع المطور", icon: "settings", code: "# Enable dev mode\n    const/4 v0, 0x1\n    sput-boolean v0, Lcom/app/Config;->DEBUG:Z" },
  { id: "t6", name: "تعطيل التشفير", icon: "unlock", code: "# Skip encryption\n    move-object v0, p1\n    return-object v0" },
];

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedFile, setSelectedFile] = useState<string>("AESHelper.smali");
  const [viewMode, setViewMode] = useState<ViewMode>("smali");
  const [editorMode, setEditorMode] = useState<EditorMode>("view");
  const [showTree, setShowTree] = useState(true);
  const [editedCode, setEditedCode] = useState<Record<string, string>>({});
  const [strings, setStrings] = useState<StringEntry[]>(EXTRACTED_STRINGS);
  const [editingStringId, setEditingStringId] = useState<string | null>(null);
  const [editingStringVal, setEditingStringVal] = useState("");
  const [injectedCode, setInjectedCode] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [patchedFiles, setPatchedFiles] = useState<Set<string>>(new Set());

  // بحث وحقن ذكي
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInjectCode, setSearchInjectCode] = useState("");
  const [injectMode, setInjectMode] = useState<InjectMode>("after");
  const [searchResults, setSearchResults] = useState<{ lineIndex: number; lineText: string }[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fileData = FILE_CONTENTS[selectedFile];
  const currentCode = editedCode[selectedFile] ?? fileData?.code ?? "";
  const isModified = !!editedCode[selectedFile] && editedCode[selectedFile] !== fileData?.code;

  const handleSaveEdit = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPatchedFiles(prev => new Set([...prev, selectedFile]));
    setEditorMode("view");
    Alert.alert("تم الحفظ", `تم حفظ التعديلات على ${selectedFile}\nجاهز لإعادة التجميع.`);
  };

  const handleApplyTemplate = (tpl: typeof INJECT_TEMPLATES[0]) => {
    setSelectedTemplate(tpl.id);
    setInjectedCode(tpl.code);
  };

  const handleInject = () => {
    if (!injectedCode.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const current = editedCode[selectedFile] ?? fileData?.code ?? "";
    const newCode = current + "\n\n# === INJECTED CODE ===\n" + injectedCode;
    setEditedCode(prev => ({ ...prev, [selectedFile]: newCode }));
    setPatchedFiles(prev => new Set([...prev, selectedFile]));
    setInjectedCode("");
    setSelectedTemplate(null);
    Alert.alert("تم الحقن", `تم حقن الكود في ${selectedFile} بنجاح.`);
  };

  // بحث ذكي — يجد الأسطر المطابقة
  const handleSmartSearch = () => {
    if (!searchQuery.trim()) return;
    const current = editedCode[selectedFile] ?? fileData?.code ?? "";
    const lines = current.split("\n");
    const results = lines
      .map((line, i) => ({ lineIndex: i, lineText: line }))
      .filter(({ lineText }) => lineText.toLowerCase().includes(searchQuery.toLowerCase()));
    setSearchResults(results);
    setSearchDone(true);
  };

  // حقن ذكي — يطبّق الكود عند نقاط التطابق
  const handleSmartInject = () => {
    if (!searchQuery.trim() || !searchInjectCode.trim() || searchResults.length === 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const current = editedCode[selectedFile] ?? fileData?.code ?? "";
    const lines = current.split("\n");
    const matchedIndices = new Set(searchResults.map(r => r.lineIndex));
    const newLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (matchedIndices.has(i)) {
        if (injectMode === "before") {
          newLines.push("    # === INJECTED ===");
          newLines.push(...searchInjectCode.split("\n"));
          newLines.push(lines[i]);
        } else if (injectMode === "after") {
          newLines.push(lines[i]);
          newLines.push("    # === INJECTED ===");
          newLines.push(...searchInjectCode.split("\n"));
        } else {
          // replace
          newLines.push("    # === REPLACED ===");
          newLines.push(...searchInjectCode.split("\n"));
        }
      } else {
        newLines.push(lines[i]);
      }
    }

    setEditedCode(prev => ({ ...prev, [selectedFile]: newLines.join("\n") }));
    setPatchedFiles(prev => new Set([...prev, selectedFile]));
    setSearchQuery("");
    setSearchInjectCode("");
    setSearchResults([]);
    setSearchDone(false);
    Alert.alert(
      "تم الحقن الذكي ✓",
      `تم ${injectMode === "replace" ? "استبدال" : "حقن الكود " + (injectMode === "after" ? "بعد" : "قبل")} ${searchResults.length} موقع في ${selectedFile}`
    );
  };

  const handleEditString = (entry: StringEntry) => {
    setEditingStringId(entry.id);
    setEditingStringVal(entry.value);
  };

  const handleSaveString = () => {
    if (!editingStringId) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStrings(prev => prev.map(s =>
      s.id === editingStringId ? { ...s, value: editingStringVal, modified: s.value !== editingStringVal } : s
    ));
    const entry = strings.find(s => s.id === editingStringId);
    if (entry) setPatchedFiles(prev => new Set([...prev, entry.file]));
    setEditingStringId(null);
  };

  const STRING_TYPE_CONFIG = {
    credential: { color: colors.red,     icon: "key" as const,       label: "اعتماد" },
    url:        { color: colors.cyan,    icon: "link" as const,      label: "URL"    },
    key:        { color: colors.purple,  icon: "lock" as const,      label: "مفتاح"  },
    string:     { color: colors.warning, icon: "type" as const,      label: "نص"     },
  };

  const TABS: { id: ViewMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: "smali",   label: "Smali/Code", icon: "file-text" },
    { id: "strings", label: "الاعتمادات", icon: "key" },
    { id: "inject",  label: "حقن كود", icon: "zap" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setShowTree(!showTree)} style={[styles.iconBtn, { backgroundColor: colors.muted }]}>
          <Feather name="sidebar" size={15} color={showTree ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {selectedFile || "محرر الأكواد"}
        </Text>
        {isModified && (
          <View style={[styles.modifiedDot, { backgroundColor: colors.warning }]} />
        )}
        {patchedFiles.size > 0 && (
          <View style={[styles.patchBadge, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check" size={10} color={colors.success} />
            <Text style={[styles.patchBadgeText, { color: colors.success }]}>{patchedFiles.size} patched</Text>
          </View>
        )}
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setViewMode(t.id)} style={[styles.tab, viewMode === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Feather name={t.icon} size={13} color={viewMode === t.id ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: viewMode === t.id ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.body, { paddingBottom: bottomPad + 80 }]}>
        {showTree && viewMode === "smali" && (
          <View style={[styles.treePanel, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
            <View style={[styles.treePanelHeader, { borderBottomColor: colors.border }]}>
              <Feather name="folder" size={11} color={colors.mutedForeground} />
              <Text style={[styles.treePanelTitle, { color: colors.mutedForeground }]}>FILES</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 4 }}>
              <FileTree nodes={DEMO_TREE} selectedFile={selectedFile} onSelect={(name) => { setSelectedFile(name); setEditorMode("view"); }} />
            </ScrollView>
          </View>
        )}

        {viewMode === "smali" && (
          <View style={styles.codePanel}>
            {editorMode === "view" ? (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                <View style={[styles.codeToolbar, { backgroundColor: "#0D1117", borderBottomColor: colors.border }]}>
                  <Text style={[styles.langBadge, { color: colors.primary }]}>{fileData?.language?.toUpperCase()}</Text>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={() => setEditorMode("edit")} style={[styles.editBtn, { backgroundColor: colors.primary }]}>
                    <Feather name="edit-2" size={12} color={colors.primaryForeground} />
                    <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>تعديل</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator style={[styles.codeScroll, { backgroundColor: "#0D1117" }]}>
                  <View style={{ padding: 12 }}>
                    {currentCode.split("\n").map((line, i) => (
                      <View key={i} style={styles.codeLine}>
                        <Text style={styles.lineNum}>{i + 1}</Text>
                        <Text style={[styles.codeText, { color: getLineColor(line) }]}>{line}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                {isModified && (
                  <View style={[styles.diffBanner, { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" }]}>
                    <Feather name="alert-triangle" size={13} color={colors.warning} />
                    <Text style={[styles.diffText, { color: colors.warning }]}>يوجد تعديلات غير محفوظة</Text>
                    <TouchableOpacity onPress={handleSaveEdit} style={[styles.saveBannerBtn, { backgroundColor: colors.warning }]}>
                      <Text style={styles.saveBannerTxt}>حفظ</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={[styles.editToolbar, { backgroundColor: "#0D1117", borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setEditorMode("view")} style={styles.discardBtn}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.discardTxt, { color: colors.mutedForeground }]}>إلغاء</Text>
                  </TouchableOpacity>
                  <Text style={[styles.editingLabel, { color: colors.warning }]}>وضع التعديل</Text>
                  <TouchableOpacity onPress={handleSaveEdit} style={[styles.saveBtn, { backgroundColor: colors.success }]}>
                    <Feather name="save" size={13} color="#fff" />
                    <Text style={styles.saveTxt}>حفظ</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#0D1117" }}>
                  <TextInput
                    style={styles.codeInput}
                    value={currentCode}
                    onChangeText={text => setEditedCode(prev => ({ ...prev, [selectedFile]: text }))}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {viewMode === "strings" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: bottomPad + 80 }}>
            <View style={[styles.stringsBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.primary} />
              <Text style={[styles.stringsBannerText, { color: colors.foreground }]}>
                تم استخراج {strings.length} سلسلة نصية مهمة · {strings.filter(s => s.modified).length} تم تعديلها
              </Text>
            </View>

            {strings.map(entry => {
              const cfg = STRING_TYPE_CONFIG[entry.type];
              const isEditing = editingStringId === entry.id;
              return (
                <View key={entry.id} style={[styles.stringCard, { backgroundColor: colors.card, borderColor: entry.modified ? colors.success + "66" : colors.border, borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
                  <View style={styles.stringHeader}>
                    <View style={[styles.stringTypeBadge, { backgroundColor: cfg.color + "18" }]}>
                      <Feather name={cfg.icon} size={11} color={cfg.color} />
                      <Text style={[styles.stringTypeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={[styles.stringFile, { color: colors.mutedForeground }]}>{entry.file}:{entry.line}</Text>
                    {entry.modified && <Feather name="check-circle" size={14} color={colors.success} />}
                  </View>
                  <Text style={[styles.stringKey, { color: colors.mutedForeground }]}>{entry.key}</Text>
                  {isEditing ? (
                    <View style={styles.stringEditRow}>
                      <TextInput
                        style={[styles.stringInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.primary }]}
                        value={editingStringVal}
                        onChangeText={setEditingStringVal}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity onPress={handleSaveString} style={[styles.stringSaveBtn, { backgroundColor: colors.success }]}>
                        <Feather name="check" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingStringId(null)} style={[styles.stringSaveBtn, { backgroundColor: colors.muted }]}>
                        <Feather name="x" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => handleEditString(entry)} activeOpacity={0.7}>
                      <View style={[styles.stringValueRow, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.stringValue, { color: entry.modified ? colors.success : colors.foreground }]} numberOfLines={1}>{entry.value}</Text>
                        <Feather name="edit-2" size={12} color={colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {viewMode === "inject" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: bottomPad + 80 }}>
            <View style={[styles.injectBanner, { backgroundColor: colors.purple + "18", borderColor: colors.purple + "44" }]}>
              <Feather name="zap" size={14} color={colors.purple} />
              <Text style={[styles.injectBannerText, { color: colors.foreground }]}>
                حقن الكود في: <Text style={{ color: colors.primary }}>{selectedFile}</Text>
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>قوالب جاهزة</Text>
            <View style={styles.templatesGrid}>
              {INJECT_TEMPLATES.map(tpl => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => handleApplyTemplate(tpl)}
                  style={[styles.templateCard, {
                    backgroundColor: selectedTemplate === tpl.id ? colors.purple + "22" : colors.card,
                    borderColor: selectedTemplate === tpl.id ? colors.purple : colors.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Feather name={tpl.icon as any} size={18} color={selectedTemplate === tpl.id ? colors.purple : colors.mutedForeground} />
                  <Text style={[styles.templateName, { color: selectedTemplate === tpl.id ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
                    {tpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كود الحقن</Text>
            <View style={[styles.injectInputWrap, { backgroundColor: "#0D1117", borderColor: colors.border }]}>
              <TextInput
                style={styles.injectInput}
                value={injectedCode}
                onChangeText={setInjectedCode}
                multiline
                placeholder="اكتب كود Smali هنا أو اختر قالباً..."
                placeholderTextColor="#30363D"
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              onPress={handleInject}
              disabled={!injectedCode.trim()}
              style={[styles.injectBtn, { backgroundColor: injectedCode.trim() ? colors.purple : colors.muted }]}
              activeOpacity={0.8}
            >
              <Feather name="zap" size={18} color={injectedCode.trim() ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.injectBtnText, { color: injectedCode.trim() ? "#fff" : colors.mutedForeground }]}>
                حقن في نهاية {selectedFile}
              </Text>
            </TouchableOpacity>

            {/* ===== بحث وحقن ذكي ===== */}
            <View style={[styles.smartDivider, { borderTopColor: colors.border }]}>
              <View style={[styles.smartDividerLabel, { backgroundColor: colors.background }]}>
                <Feather name="search" size={12} color={colors.cyan} />
                <Text style={[styles.smartDividerText, { color: colors.cyan }]}>بحث وحقن ذكي</Text>
              </View>
            </View>

            <View style={[styles.smartBox, { backgroundColor: colors.card, borderColor: colors.cyan + "44" }]}>
              <Text style={[styles.smartDesc, { color: colors.mutedForeground }]}>
                ابحث عن نص أو دالة داخل الكود وأحقن عندها مباشرةً — دون الحاجة لمعرفة رقم السطر
              </Text>

              {/* حقل البحث */}
              <View style={[styles.smartInputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.smartInput, { color: colors.foreground }]}
                  placeholder="ابحث عن... (مثال: saveToken  أو  AES)"
                  placeholderTextColor={colors.mutedForeground}
                  value={searchQuery}
                  onChangeText={v => { setSearchQuery(v); setSearchDone(false); setSearchResults([]); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); setSearchDone(false); }}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* زر البحث */}
              <TouchableOpacity
                onPress={handleSmartSearch}
                disabled={!searchQuery.trim()}
                style={[styles.searchBtn, { backgroundColor: searchQuery.trim() ? colors.cyan + "22" : colors.muted, borderColor: searchQuery.trim() ? colors.cyan : colors.border }]}
              >
                <Feather name="search" size={14} color={searchQuery.trim() ? colors.cyan : colors.mutedForeground} />
                <Text style={[styles.searchBtnText, { color: searchQuery.trim() ? colors.cyan : colors.mutedForeground }]}>
                  بحث في {selectedFile}
                </Text>
              </TouchableOpacity>

              {/* نتائج البحث */}
              {searchDone && (
                <View style={[styles.resultsBox, { backgroundColor: colors.muted, borderColor: searchResults.length > 0 ? colors.cyan + "55" : colors.red + "55" }]}>
                  {searchResults.length === 0 ? (
                    <View style={styles.noResultRow}>
                      <Feather name="alert-circle" size={14} color={colors.red} />
                      <Text style={[styles.noResultText, { color: colors.red }]}>لم يُعثر على "{searchQuery}" في هذا الملف</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.resultHeader}>
                        <Feather name="check-circle" size={13} color={colors.cyan} />
                        <Text style={[styles.resultCount, { color: colors.cyan }]}>
                          {searchResults.length} تطابق في {selectedFile}
                        </Text>
                      </View>
                      {searchResults.slice(0, 4).map(r => (
                        <View key={r.lineIndex} style={styles.resultLine}>
                          <Text style={[styles.resultLineNum, { color: colors.mutedForeground }]}>#{r.lineIndex + 1}</Text>
                          <Text style={[styles.resultLineText, { color: colors.foreground }]} numberOfLines={1}>{r.lineText.trim()}</Text>
                        </View>
                      ))}
                      {searchResults.length > 4 && (
                        <Text style={[styles.moreResults, { color: colors.mutedForeground }]}>+ {searchResults.length - 4} أسطر أخرى</Text>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* وضع الحقن */}
              {searchResults.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 12 }]}>طريقة الحقن</Text>
                  <View style={styles.modeRow}>
                    {(["after", "before", "replace"] as InjectMode[]).map(mode => (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setInjectMode(mode)}
                        style={[styles.modeBtn, {
                          backgroundColor: injectMode === mode ? colors.cyan + "22" : colors.muted,
                          borderColor: injectMode === mode ? colors.cyan : colors.border,
                        }]}
                      >
                        <Feather
                          name={mode === "after" ? "arrow-down" : mode === "before" ? "arrow-up" : "refresh-cw"}
                          size={12}
                          color={injectMode === mode ? colors.cyan : colors.mutedForeground}
                        />
                        <Text style={[styles.modeBtnText, { color: injectMode === mode ? colors.cyan : colors.mutedForeground }]}>
                          {mode === "after" ? "حقن بعده" : mode === "before" ? "حقن قبله" : "استبدال"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* كود الحقن */}
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كود الحقن</Text>
                  <View style={[styles.injectInputWrap, { backgroundColor: "#0D1117", borderColor: colors.cyan + "44" }]}>
                    <TextInput
                      style={[styles.injectInput, { color: "#8B949E" }]}
                      value={searchInjectCode}
                      onChangeText={setSearchInjectCode}
                      multiline
                      placeholder="الكود الذي سيُحقن..."
                      placeholderTextColor="#30363D"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSmartInject}
                    disabled={!searchInjectCode.trim()}
                    style={[styles.injectBtn, { backgroundColor: searchInjectCode.trim() ? colors.cyan : colors.muted, marginBottom: 0 }]}
                  >
                    <Feather name="target" size={18} color={searchInjectCode.trim() ? "#000" : colors.mutedForeground} />
                    <Text style={[styles.injectBtnText, { color: searchInjectCode.trim() ? "#000" : colors.mutedForeground }]}>
                      تطبيق الحقن في {searchResults.length} موقع
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {patchedFiles.size > 0 && (
              <View style={[styles.patchedList, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
                <Text style={[styles.patchedTitle, { color: colors.foreground }]}>الملفات المعدّلة ({patchedFiles.size})</Text>
                {[...patchedFiles].map(f => (
                  <View key={f} style={styles.patchedItem}>
                    <Feather name="check-circle" size={13} color={colors.success} />
                    <Text style={[styles.patchedFile, { color: colors.success }]}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function getLineColor(line: string): string {
  if (line.trim().startsWith(".method") || line.trim().startsWith(".end")) return "#00D4FF";
  if (line.trim().startsWith(".class") || line.trim().startsWith(".super")) return "#7C3AED";
  if (line.trim().startsWith("#")) return "#64748B";
  if (line.trim().startsWith("invoke-")) return "#F59E0B";
  if (line.trim().startsWith("const-string")) return "#10B981";
  if (line.trim().startsWith("return")) return "#EF4444";
  if (line.trim().startsWith(".field")) return "#F97316";
  return "#E2E8F0";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { padding: 8, borderRadius: 8 },
  headerTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  modifiedDot: { width: 7, height: 7, borderRadius: 4 },
  patchBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  patchBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tabsRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  body: { flex: 1, flexDirection: "row" },
  treePanel: { width: 160, borderRightWidth: StyleSheet.hairlineWidth },
  treePanelHeader: { flexDirection: "row", alignItems: "center", gap: 5, padding: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  treePanelTitle: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  codePanel: { flex: 1 },
  codeToolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  langBadge: { fontSize: 10, fontFamily: "Inter_700Bold" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  editBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  codeScroll: { maxHeight: 400 },
  codeLine: { flexDirection: "row", gap: 10, minHeight: 20 },
  lineNum: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#30363D", width: 26, textAlign: "right", lineHeight: 20 },
  codeText: { fontSize: 11.5, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), lineHeight: 20 },
  diffBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  diffText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBannerBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  saveBannerTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#000" },
  editToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  discardBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  discardTxt: { fontSize: 12, fontFamily: "Inter_400Regular" },
  editingLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  saveTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  codeInput: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: "#E2E8F0",
    lineHeight: 20,
    padding: 14,
    minHeight: 400,
  },
  stringsBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  stringsBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  stringCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  stringHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  stringTypeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  stringTypeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  stringFile: { flex: 1, fontSize: 10, fontFamily: "Inter_400Regular" },
  stringKey: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 6 },
  stringValueRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 8 },
  stringValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  stringEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stringInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", padding: 8, borderRadius: 8, borderWidth: 1.5 },
  stringSaveBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 6 },
  templatesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  templateCard: { width: "30%", borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  templateName: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  injectBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  injectBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  injectInputWrap: { borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  injectInput: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: "#8B949E",
    padding: 14,
    minHeight: 160,
  },
  injectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  injectBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  patchedList: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  patchedTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  patchedItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  patchedFile: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // بحث وحقن ذكي
  smartDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 20, alignItems: "center", justifyContent: "center" },
  smartDividerLabel: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, marginTop: -10 },
  smartDividerText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  smartBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  smartDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  smartInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  smartInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resultsBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  noResultRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  noResultText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  resultLineNum: { fontSize: 11, fontFamily: "Inter_400Regular", width: 32, textAlign: "right" },
  resultLineText: { flex: 1, fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  moreResults: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingTop: 4 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  modeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
