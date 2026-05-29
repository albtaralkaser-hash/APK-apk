import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: "smali" | "java" | "xml" | "json";
  size?: number;
}

const FILE_ICON: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  smali:   { icon: "file-text", color: "#00D4FF" },
  java:    { icon: "file-text", color: "#F59E0B" },
  xml:     { icon: "file-text", color: "#10B981" },
  json:    { icon: "file-text", color: "#7C3AED" },
  default: { icon: "file",      color: "#64748B" },
};

export const DEMO_TREE: FileNode[] = [
  {
    name: "AndroidManifest.xml", type: "file", language: "xml",
  },
  {
    name: "smali", type: "directory", children: [
      {
        name: "com", type: "directory", children: [
          {
            name: "banking", type: "directory", children: [
              {
                name: "securepay", type: "directory", children: [
                  { name: "MainActivity.smali", type: "file", language: "smali" },
                  { name: "BuildConfig.smali", type: "file", language: "smali" },
                  { name: "R.smali", type: "file", language: "smali" },
                  {
                    name: "auth", type: "directory", children: [
                      { name: "SessionManager.smali", type: "file", language: "smali" },
                      { name: "LoginActivity.smali", type: "file", language: "smali" },
                      { name: "BiometricAuth.smali", type: "file", language: "smali" },
                    ],
                  },
                  {
                    name: "network", type: "directory", children: [
                      { name: "HttpClient.smali", type: "file", language: "smali" },
                      { name: "ApiEndpoints.smali", type: "file", language: "smali" },
                      { name: "CertificatePinner.smali", type: "file", language: "smali" },
                    ],
                  },
                  {
                    name: "crypto", type: "directory", children: [
                      { name: "AESHelper.smali", type: "file", language: "smali" },
                      { name: "HashUtil.smali", type: "file", language: "smali" },
                      { name: "KeyManager.smali", type: "file", language: "smali" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "res", type: "directory", children: [
      { name: "values", type: "directory", children: [
        { name: "strings.xml", type: "file", language: "xml" },
        { name: "colors.xml",  type: "file", language: "xml" },
      ]},
      { name: "raw", type: "directory", children: [
        { name: "config.enc", type: "file" },
        { name: "keystore.bin", type: "file" },
      ]},
    ],
  },
  {
    name: "lib", type: "directory", children: [
      { name: "arm64-v8a", type: "directory", children: [
        { name: "libsecurity.so", type: "file" },
        { name: "libcrypto.so", type: "file" },
      ]},
    ],
  },
  {
    name: "assets", type: "directory", children: [
      { name: "config.json", type: "file", language: "json" },
      { name: "cert.der", type: "file" },
    ],
  },
];

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (name: string, language?: string) => void;
}

function FileTreeNode({ node, depth, selectedFile, onSelect }: FileTreeNodeProps) {
  const colors = useColors();
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "directory") {
    return (
      <View>
        <TouchableOpacity
          onPress={() => setOpen(!open)}
          style={[styles.row, { paddingLeft: depth * 14 + 8 }]}
          activeOpacity={0.7}
        >
          <Feather name={open ? "chevron-down" : "chevron-right"} size={12} color={colors.mutedForeground} />
          <Feather name={open ? "folder-open" : "folder"} size={14} color="#F59E0B" />
          <Text style={[styles.dirName, { color: colors.foreground }]}>{node.name}</Text>
          {node.children && (
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{node.children.length}</Text>
          )}
        </TouchableOpacity>
        {open && node.children?.map((child, i) => (
          <FileTreeNode key={i} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
        ))}
      </View>
    );
  }

  const ext = node.language ?? "default";
  const { icon, color } = FILE_ICON[ext] ?? FILE_ICON.default;
  const isSelected = selectedFile === node.name;

  return (
    <TouchableOpacity
      onPress={() => onSelect(node.name, node.language)}
      style={[
        styles.row,
        { paddingLeft: depth * 14 + 8 },
        isSelected && { backgroundColor: colors.primary + "18" },
      ]}
      activeOpacity={0.7}
    >
      <View style={{ width: 12 }} />
      <Feather name={icon} size={13} color={isSelected ? colors.primary : color} />
      <Text
        style={[styles.fileName, { color: isSelected ? colors.primary : colors.foreground }]}
        numberOfLines={1}
      >
        {node.name}
      </Text>
    </TouchableOpacity>
  );
}

interface FileTreeProps {
  nodes: FileNode[];
  onSelect: (name: string, language?: string) => void;
  selectedFile: string | null;
}

export function FileTree({ nodes, onSelect, selectedFile }: FileTreeProps) {
  return (
    <View>
      {nodes.map((node, i) => (
        <FileTreeNode key={i} node={node} depth={0} selectedFile={selectedFile} onSelect={onSelect} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingRight: 8, borderRadius: 6, marginBottom: 1 },
  dirName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  fileName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  count: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
