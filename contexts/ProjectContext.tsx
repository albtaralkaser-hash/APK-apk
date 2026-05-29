import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ProjectStatus = "pending" | "analyzing" | "complete" | "error";
export type ModuleStatus = "idle" | "running" | "complete" | "error";

export interface Module {
  id: string;
  name: string;
  nameAr: string;
  status: ModuleStatus;
  progress: number;
  resultCount?: number;
}

export interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  location: string;
  category: string;
}

export interface Project {
  id: string;
  name: string;
  packageName: string;
  sizeBytes: number;
  createdAt: string;
  status: ProjectStatus;
  analysisProgress: number;
  modules: Module[];
  apkVersion: string;
  targetSdk: number;
  minSdk: number;
  permissions: string[];
  classCount: number;
  methodCount: number;
  stringCount: number;
  urlCount: number;
  findings: SecurityFinding[];
  obfuscated: boolean;
  nativeLibs: string[];
}

const DEMO_FINDINGS: SecurityFinding[] = [
  { id: "f1", severity: "critical", title: "مفتاح AES مضمّن في الكود", description: "تم اكتشاف مفتاح تشفير AES-256 مضمّن في ملف MainActivity.smali", location: "com/banking/app/MainActivity.smali:847", category: "Cryptography" },
  { id: "f2", severity: "critical", title: "بيانات اعتماد API مكشوفة", description: "تم اكتشاف API Key وSecret مكشوفين في ملف الإعدادات", location: "res/values/strings.xml:23", category: "Secrets" },
  { id: "f3", severity: "high", title: "تخزين غير آمن في SharedPreferences", description: "يتم تخزين رمز الجلسة (Session Token) بدون تشفير في SharedPreferences", location: "com/banking/app/auth/SessionManager.smali:112", category: "Storage" },
  { id: "f4", severity: "high", title: "عدم التحقق من شهادة SSL", description: "التطبيق يتجاهل أخطاء شهادة SSL (TrustAllCerts)", location: "com/banking/app/network/HttpClient.smali:67", category: "Network" },
  { id: "f5", severity: "medium", title: "تفعيل وضع التصحيح", description: "تطبيق مُفعَّل وضع التصحيح (debuggable=true) في AndroidManifest", location: "AndroidManifest.xml:8", category: "Configuration" },
  { id: "f6", severity: "medium", title: "كشف بيانات في الـ Logcat", description: "يتم طباعة بيانات المستخدم الحساسة في السجلات", location: "com/banking/app/utils/Logger.smali:45", category: "Logging" },
  { id: "f7", severity: "low", title: "استخدام خوارزمية MD5 للتجزئة", description: "MD5 خوارزمية ضعيفة، يُنصح باستخدام SHA-256", location: "com/banking/app/crypto/HashUtil.smali:29", category: "Cryptography" },
  { id: "f8", severity: "info", title: "واجهة API داخلية مكتشفة", description: "تم اكتشاف نقطة نهاية API داخلية: https://api-internal.bank.com/v2", location: "com/banking/app/network/ApiEndpoints.smali:15", category: "Network" },
];

const DEMO_MODULES: Module[] = [
  { id: "m1", name: "Project Manager", nameAr: "مدير المشاريع", status: "complete", progress: 100, resultCount: 1 },
  { id: "m2", name: "Disassembly Engine", nameAr: "محرك التفكيك", status: "complete", progress: 100, resultCount: 1247 },
  { id: "m3", name: "Deobfuscation Engine", nameAr: "محرك فك التشفير", status: "complete", progress: 100, resultCount: 89 },
  { id: "m4", name: "Static Analysis", nameAr: "التحليل الثابت", status: "complete", progress: 100, resultCount: 8 },
  { id: "m5", name: "Dynamic Analysis (Frida)", nameAr: "التحليل الديناميكي", status: "idle", progress: 0 },
  { id: "m6", name: "Smart Code Editor", nameAr: "محرر الأكواد", status: "complete", progress: 100 },
  { id: "m7", name: "Rebuild Engine", nameAr: "محرك إعادة البناء", status: "idle", progress: 0 },
];

const DEMO_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Banking App",
    packageName: "com.banking.securepay",
    sizeBytes: 48_500_000,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "complete",
    analysisProgress: 100,
    modules: DEMO_MODULES,
    apkVersion: "3.2.1",
    targetSdk: 34,
    minSdk: 21,
    permissions: ["android.permission.INTERNET", "android.permission.READ_CONTACTS", "android.permission.CAMERA", "android.permission.RECORD_AUDIO", "android.permission.ACCESS_FINE_LOCATION"],
    classCount: 1247,
    methodCount: 8934,
    stringCount: 3421,
    urlCount: 47,
    findings: DEMO_FINDINGS,
    obfuscated: true,
    nativeLibs: ["libsecurity.so", "libcrypto.so", "libssl.so"],
  },
  {
    id: "p2",
    name: "Game Modding",
    packageName: "com.gameloft.hero",
    sizeBytes: 102_400_000,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    status: "analyzing",
    analysisProgress: 62,
    modules: [
      { id: "m1", name: "Project Manager", nameAr: "مدير المشاريع", status: "complete", progress: 100 },
      { id: "m2", name: "Disassembly Engine", nameAr: "محرك التفكيك", status: "complete", progress: 100 },
      { id: "m3", name: "Deobfuscation Engine", nameAr: "محرك فك التشفير", status: "running", progress: 62 },
      { id: "m4", name: "Static Analysis", nameAr: "التحليل الثابت", status: "idle", progress: 0 },
      { id: "m5", name: "Dynamic Analysis (Frida)", nameAr: "التحليل الديناميكي", status: "idle", progress: 0 },
      { id: "m6", name: "Smart Code Editor", nameAr: "محرر الأكواد", status: "idle", progress: 0 },
      { id: "m7", name: "Rebuild Engine", nameAr: "محرك إعادة البناء", status: "idle", progress: 0 },
    ],
    apkVersion: "8.0.0",
    targetSdk: 33,
    minSdk: 19,
    permissions: ["android.permission.INTERNET", "android.permission.WRITE_EXTERNAL_STORAGE"],
    classCount: 4521,
    methodCount: 31240,
    stringCount: 9823,
    urlCount: 12,
    findings: [],
    obfuscated: true,
    nativeLibs: ["libgame.so", "libunity.so"],
  },
  {
    id: "p3",
    name: "Social Media",
    packageName: "com.socialtarget.app",
    sizeBytes: 67_200_000,
    createdAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    status: "complete",
    analysisProgress: 100,
    modules: DEMO_MODULES.map(m => ({ ...m, status: "complete" as ModuleStatus, progress: 100 })),
    apkVersion: "12.4.2",
    targetSdk: 34,
    minSdk: 24,
    permissions: ["android.permission.INTERNET", "android.permission.CAMERA", "android.permission.RECORD_AUDIO", "android.permission.READ_CONTACTS", "android.permission.ACCESS_FINE_LOCATION", "android.permission.BLUETOOTH"],
    classCount: 2834,
    methodCount: 19450,
    stringCount: 6234,
    urlCount: 83,
    findings: DEMO_FINDINGS.slice(0, 4),
    obfuscated: false,
    nativeLibs: [],
  },
];

interface PickedFile {
  name: string;
  size: number;
  uri: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  addProject: (name: string, packageName: string, pickedFile?: PickedFile) => void;
  deleteProject: (id: string) => void;
  stopProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>("p1");
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    loadProjects();
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const loadProjects = async () => {
    try {
      const stored = await AsyncStorage.getItem("apk_projects");
      if (stored) {
        const parsed = JSON.parse(stored) as Project[];
        if (parsed.length > 0) setProjects(parsed);
      }
    } catch {}
  };

  const saveProjects = async (updated: Project[]) => {
    try {
      await AsyncStorage.setItem("apk_projects", JSON.stringify(updated));
    } catch {}
  };

  const addProject = useCallback((name: string, packageName: string, pickedFile?: PickedFile) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      packageName,
      sizeBytes: pickedFile?.size ?? Math.floor(Math.random() * 80_000_000) + 20_000_000,
      createdAt: new Date().toISOString(),
      status: "analyzing",
      analysisProgress: 0,
      modules: DEMO_MODULES.map(m => ({ ...m, status: "idle" as ModuleStatus, progress: 0 })),
      apkVersion: "1.0.0",
      targetSdk: 34,
      minSdk: 21,
      permissions: ["android.permission.INTERNET"],
      classCount: 0,
      methodCount: 0,
      stringCount: 0,
      urlCount: 0,
      findings: [],
      obfuscated: false,
      nativeLibs: [],
    };
    setProjects(prev => {
      const updated = [newProject, ...prev];
      saveProjects(updated);
      return updated;
    });
    setActiveProjectId(newProject.id);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        delete intervalsRef.current[newProject.id];
        setProjects(prev => {
          const updated = prev.map(p =>
            p.id === newProject.id
              ? { ...p, status: "complete" as ProjectStatus, analysisProgress: 100, modules: DEMO_MODULES, classCount: 892, methodCount: 6234, stringCount: 2100, urlCount: 28, findings: DEMO_FINDINGS.slice(0, 5), obfuscated: true }
              : p
          );
          saveProjects(updated);
          return updated;
        });
      } else {
        setProjects(prev => prev.map(p =>
          p.id === newProject.id ? { ...p, analysisProgress: Math.min(progress, 100) } : p
        ));
      }
    }, 400);

    intervalsRef.current[newProject.id] = interval;
  }, []);

  const stopProject = useCallback((id: string) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }
    setProjects(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, status: "pending" as ProjectStatus } : p
      );
      saveProjects(updated);
      return updated;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveProjects(updated);
      return updated;
    });
    setActiveProjectId(prev => {
      if (prev === id) {
        const remaining = projects.filter(p => p.id !== id);
        return remaining.length > 0 ? remaining[0].id : "";
      }
      return prev;
    });
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProjectId, addProject, deleteProject, stopProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
