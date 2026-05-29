import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CodeViewerProps {
  code: string;
  language: "smali" | "java" | "xml" | "json";
  filename: string;
}

function tokenize(code: string, lang: "smali" | "java" | "xml" | "json") {
  const lines = code.split("\n");
  return lines.map((line, i) => ({ line, num: i + 1 }));
}

function getLineColor(line: string, lang: "smali" | "java" | "xml" | "json"): string {
  if (lang === "smali") {
    if (line.trim().startsWith(".method")) return "#00D4FF";
    if (line.trim().startsWith(".class")) return "#7C3AED";
    if (line.trim().startsWith("#")) return "#64748B";
    if (line.trim().startsWith("invoke-")) return "#F59E0B";
    if (line.trim().startsWith("const-string")) return "#10B981";
    if (line.trim().startsWith("return")) return "#EF4444";
    if (line.trim().startsWith(".end")) return "#00D4FF";
    if (line.includes("v0") || line.includes("v1") || line.includes("p0")) return "#E2E8F0";
  }
  if (lang === "java") {
    if (line.includes("//")) return "#64748B";
    if (line.includes("\"")) return "#10B981";
    if (/\b(public|private|static|void|class|import|return|new|if|else|try|catch)\b/.test(line)) return "#7C3AED";
  }
  return "#E2E8F0";
}

const SMALI_DEMO = `.class public Lcom/banking/securepay/auth/SessionManager;
.super Ljava/lang/Object;

# Static fields
.field private static instance:Lcom/banking/securepay/auth/SessionManager;

# Instance fields
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
.end method`;

export function CodeViewer({ code = SMALI_DEMO, language, filename }: CodeViewerProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const lines = tokenize(code, language);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: "#0D1117", borderColor: colors.border }]}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <Feather name="file-text" size={13} color={colors.mutedForeground} />
        <Text style={[styles.filename, { color: colors.foreground }]} numberOfLines={1}>{filename}</Text>
        <View style={[styles.langBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.langText, { color: colors.primary }]}>{language.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
          <Feather name={copied ? "check" : "copy"} size={14} color={copied ? colors.success : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <View style={styles.codeArea}>
            {lines.map(({ line, num }) => (
              <View key={num} style={styles.codeLine}>
                <Text style={styles.lineNum}>{num}</Text>
                <Text style={[styles.codeText, { color: getLineColor(line, language) }]}>{line}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  filename: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  langBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  copyBtn: { padding: 4 },
  codeArea: { padding: 12 },
  codeLine: { flexDirection: "row", gap: 12, minHeight: 20 },
  lineNum: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#30363D", width: 28, textAlign: "right", lineHeight: 20 },
  codeText: { fontSize: 11.5, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), lineHeight: 20 },
});
