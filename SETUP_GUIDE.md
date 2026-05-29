# APK-ReverseEngine — دليل الإعداد

## معلومات المشروع
- **الاسم**: APK-ReverseEngine
- **التقنية**: React Native + Expo (TypeScript)
- **الإصدار**: 1.0.0

---

## طريقة التشغيل المباشر (Expo Go)

### المتطلبات
- Node.js 18 أو أحدث
- pnpm (`npm install -g pnpm`)
- تطبيق Expo Go على هاتفك

### الخطوات
```bash
# 1. فك ضغط المجلد
cd artifacts/mobile

# 2. تثبيت المكتبات
pnpm install

# 3. تشغيل التطبيق
pnpm exec expo start

# 4. امسح QR Code بهاتفك عبر تطبيق Expo Go
```

---

## تحويل المشروع إلى Android Studio

### الخطوة 1: توليد كود Android الأصلي
```bash
cd artifacts/mobile
pnpm install
npx expo prebuild --platform android
```
سيُنشئ هذا مجلد `android/` يحتوي على مشروع Android Studio كامل.

### الخطوة 2: فتح في Android Studio
```
File → Open → اختر مجلد android/
```

### الخطوة 3: البناء
```
Build → Generate Signed Bundle / APK
```

---

## هيكل الملفات

```
artifacts/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          ← شاشة المشاريع
│   │   ├── analysis.tsx       ← شاشة التحليل
│   │   ├── editor.tsx         ← محرر الأكواد + حقن
│   │   ├── frida.tsx          ← التحليل الديناميكي
│   │   ├── reports.tsx        ← التقارير الأمنية
│   │   └── _layout.tsx        ← إعداد التبويبات
│   ├── rebuild.tsx            ← شاشة إعادة البناء والتصدير
│   └── _layout.tsx            ← إعداد التطبيق الجذر
├── components/
│   ├── APKCard.tsx            ← بطاقة عرض المشروع
│   ├── ModuleCard.tsx         ← بطاقة الوحدة
│   ├── SecurityBadge.tsx      ← شارة الثغرة الأمنية
│   ├── HookCard.tsx           ← بطاقة Frida Hook
│   ├── CodeViewer.tsx         ← عارض الكود
│   └── FileTree.tsx           ← شجرة الملفات
├── contexts/
│   ├── ProjectContext.tsx     ← حالة المشاريع
│   └── FridaContext.tsx       ← حالة Frida
├── constants/
│   └── colors.ts              ← لوحة الألوان
└── app.json                   ← إعدادات Expo
```

---

## الوحدات المُنفَّذة

| الوحدة | الحالة | الوصف |
|--------|--------|-------|
| مدير المشاريع | ✅ | استيراد APK، إدارة المشاريع |
| محرك التفكيك | ✅ UI | واجهة شجرة الملفات + عارض Smali |
| فك التشفير | ✅ UI | استخراج وتعديل الاعتمادات والنصوص |
| التحليل الثابت | ✅ UI | الثغرات + الأذونات + الإحصاءات |
| Frida (ديناميكي) | ✅ UI | Hooks + سجل حي + Scripts |
| محرر الأكواد | ✅ | تعديل + حقن كود Smali |
| إعادة البناء | ✅ UI | workflow كامل + توقيع + تصدير APK |

---

## المكتبات الرئيسية

```json
{
  "expo": "~54.0.27",
  "expo-router": "~6.0.17",
  "expo-document-picker": "~13.0.0",
  "expo-sharing": "~13.0.0",
  "expo-haptics": "~15.0.8",
  "expo-clipboard": "~8.0.0",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@expo/vector-icons": "^15.0.3",
  "@expo-google-fonts/inter": "^0.4.0"
}
```

---

## ملاحظات للمطورين
- التطبيق يعمل بوضع Offline-first (بدون خادم)
- البيانات محفوظة في AsyncStorage
- الوضع الداكن إجباري (dark-only)
- دعم اللغة العربية واتجاه RTL
