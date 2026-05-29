import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface HookLog {
  id: string;
  timestamp: string;
  type: "enter" | "exit" | "intercept" | "error";
  data: string;
}

export interface FridaHook {
  id: string;
  className: string;
  methodName: string;
  signature: string;
  isActive: boolean;
  interceptCount: number;
  logs: HookLog[];
  category: "crypto" | "network" | "file" | "jni" | "reflection" | "custom";
}

export interface FridaScript {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

const PRESET_HOOKS: FridaHook[] = [
  {
    id: "h1",
    className: "javax.crypto.Cipher",
    methodName: "doFinal",
    signature: "([B)[B",
    isActive: true,
    interceptCount: 47,
    category: "crypto",
    logs: [
      { id: "l1", timestamp: "12:34:21.441", type: "enter", data: "Algorithm: AES/CBC/PKCS5Padding\nKey: 7a8b9c0d1e2f3456...\nIV: a1b2c3d4e5f60708..." },
      { id: "l2", timestamp: "12:34:21.449", type: "exit", data: "Output: 3a4b5c6d7e8f9012... (16 bytes)" },
      { id: "l3", timestamp: "12:34:23.112", type: "enter", data: "Algorithm: AES/CBC/PKCS5Padding\nPlaintext: {\"token\":\"eyJhbGci...\"}" },
    ],
  },
  {
    id: "h2",
    className: "okhttp3.OkHttpClient",
    methodName: "newCall",
    signature: "(Lokhttp3/Request;)Lokhttp3/Call;",
    isActive: true,
    interceptCount: 23,
    category: "network",
    logs: [
      { id: "l4", timestamp: "12:34:22.001", type: "intercept", data: "POST https://api.bank.com/v2/transfer\nAuthorization: Bearer eyJhbGci...\nBody: {\"amount\":5000,\"to\":\"ACC-789\"}" },
      { id: "l5", timestamp: "12:34:22.341", type: "intercept", data: "Response: 200 OK\n{\"status\":\"success\",\"txId\":\"TX-2024-8823\"}" },
    ],
  },
  {
    id: "h3",
    className: "java.io.FileOutputStream",
    methodName: "<init>",
    signature: "(Ljava/lang/String;)V",
    isActive: false,
    interceptCount: 8,
    category: "file",
    logs: [
      { id: "l6", timestamp: "12:33:10.200", type: "enter", data: "Path: /data/data/com.banking.securepay/files/session.enc" },
    ],
  },
  {
    id: "h4",
    className: "java.lang.Class",
    methodName: "forName",
    signature: "(Ljava/lang/String;)Ljava/lang/Class;",
    isActive: true,
    interceptCount: 12,
    category: "reflection",
    logs: [
      { id: "l7", timestamp: "12:34:18.777", type: "enter", data: "Class: com.banking.securepay.internal.AntiDebug" },
      { id: "l8", timestamp: "12:34:19.001", type: "enter", data: "Class: com.banking.securepay.root.RootDetector" },
    ],
  },
];

const PRESET_SCRIPTS: FridaScript[] = [
  {
    id: "s1",
    name: "Auto Crypto Hook",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    code: `Java.perform(function() {
  var Cipher = Java.use('javax.crypto.Cipher');
  Cipher.doFinal.overload('[B').implementation = function(input) {
    console.log('[CRYPTO] doFinal called');
    console.log('[CRYPTO] Algorithm: ' + this.getAlgorithm());
    var result = this.doFinal(input);
    console.log('[CRYPTO] Output length: ' + result.length);
    return result;
  };
});`,
  },
  {
    id: "s2",
    name: "Network Interceptor",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    code: `Java.perform(function() {
  var OkHttpClient = Java.use('okhttp3.OkHttpClient');
  OkHttpClient.newCall.implementation = function(request) {
    console.log('[NET] ' + request.method() + ' ' + request.url());
    var body = request.body();
    if (body) {
      console.log('[NET] Body: ' + body.toString());
    }
    return this.newCall(request);
  };
});`,
  },
];

interface FridaContextType {
  hooks: FridaHook[];
  scripts: FridaScript[];
  deviceConnected: boolean;
  liveLogs: string[];
  isStreaming: boolean;
  toggleHook: (id: string) => void;
  addCustomHook: (className: string, methodName: string, category: FridaHook["category"]) => void;
  removeHook: (id: string) => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  clearLogs: () => void;
}

const FridaContext = createContext<FridaContextType | null>(null);

const LOG_SAMPLES = [
  "[CRYPTO] Cipher.doFinal called | AES/CBC | Key: 7a8b9c...",
  "[NET] GET https://api.bank.com/v2/balance | Auth: Bearer eyJh...",
  "[NET] Response: 200 OK | {\"balance\": 15420.00}",
  "[FILE] FileOutputStream: /data/data/.../session.enc",
  "[REFLECT] Class.forName: com.banking.internal.AntiDebug",
  "[CRYPTO] MessageDigest.digest | SHA-256 | Input: password123",
  "[NET] POST https://api.bank.com/v2/transfer | Body: {\"amount\":500}",
  "[JNI] JNI_OnLoad called | libsecurity.so",
  "[REFLECT] Method.invoke: RootDetector.isRooted()",
  "[CRYPTO] Cipher.init | AES/GCM/NoPadding | IV: a1b2c3...",
];

export function FridaProvider({ children }: { children: React.ReactNode }) {
  const [hooks, setHooks] = useState<FridaHook[]>(PRESET_HOOKS);
  const [scripts] = useState<FridaScript[]>(PRESET_SCRIPTS);
  const [deviceConnected] = useState(true);
  const [liveLogs, setLiveLogs] = useState<string[]>([
    "Frida 16.2.1 — Device connected: emulator-5554",
    "Attached to process: com.banking.securepay (PID: 2847)",
    "Hooks loaded: 4 active hooks",
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleHook = useCallback((id: string) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h));
  }, []);

  const addCustomHook = useCallback((className: string, methodName: string, category: FridaHook["category"]) => {
    const newHook: FridaHook = {
      id: Date.now().toString(),
      className,
      methodName,
      signature: "custom",
      isActive: true,
      interceptCount: 0,
      category,
      logs: [],
    };
    setHooks(prev => [...prev, newHook]);
  }, []);

  const removeHook = useCallback((id: string) => {
    setHooks(prev => prev.filter(h => h.id !== id));
  }, []);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    intervalRef.current = setInterval(() => {
      const log = LOG_SAMPLES[Math.floor(Math.random() * LOG_SAMPLES.length)];
      const time = new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLiveLogs(prev => [`[${time}] ${log}`, ...prev.slice(0, 49)]);
      setHooks(prev => prev.map(h =>
        h.isActive ? { ...h, interceptCount: h.interceptCount + (Math.random() > 0.7 ? 1 : 0) } : h
      ));
    }, 1200);
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const clearLogs = useCallback(() => setLiveLogs([]), []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <FridaContext.Provider value={{ hooks, scripts, deviceConnected, liveLogs, isStreaming, toggleHook, addCustomHook, removeHook, startStreaming, stopStreaming, clearLogs }}>
      {children}
    </FridaContext.Provider>
  );
}

export function useFrida() {
  const ctx = useContext(FridaContext);
  if (!ctx) throw new Error("useFrida must be used within FridaProvider");
  return ctx;
}
