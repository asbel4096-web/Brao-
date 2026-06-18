# 📱 تحويل "براتشو كار" إلى تطبيق جوال عبر Capacitor — الدليل الكامل

> **مهم — المعمارية:** مشروعك Next.js فيه 45 مسار API ومكوّنات سيرفر، فلا
> يُصدَّر ثابتاً. لذلك نستخدم **النمط المستضاف**: القشرة الأصلية (Android/iOS)
> تُحمّل موقعك المنشور على Vercel (`server.url`) وتضيف فوقه الإضافات الأصلية
> (إشعارات، كاميرا، GPS، مشاركة، روابط عميقة). موقعك يبقى يُنشر على Vercel كالعادة.

---

## 0) المتطلبات (على جهازك — ليس على Vercel)
- **Node.js 18+** و npm.
- **Android:** Android Studio (أحدث) + JDK 17 + Android SDK.
- **iOS:** جهاز **Mac** + Xcode 15+ + CocoaPods (`sudo gem install cocoapods`)
  + حساب **Apple Developer** ($99/سنة) للنشر والإشعارات.
- مشروع Firebase (لديك: bratsho-car).

> بدون Mac لا يمكن بناء iOS. Android يعمل على Windows/Mac/Linux.

---

## 1) ضع ملفات الحزمة في مشروعك
انسخ من مجلد `repo/` في هذه الحزمة إلى جذر مشروعك بنفس المسارات:
- `capacitor.config.ts`            → جذر المشروع
- `lib/native/*`                   → طبقة الجسر الأصلية
- `public/.well-known/assetlinks.json` و `apple-app-site-association`

ثم ادمج `package-capacitor-additions.json` في `package.json` (scripts + deps).

---

## 2) ثبّت الحزم
```bash
npm install
# (الأمر أعلاه يثبّت Capacitor والإضافات بعد دمج package.json)
```
> ⚠️ لا تستورد ملفات `lib/native` في الكود قبل هذا التثبيت، وإلا يفشل `next build`.

---

## 3) هيّئ Capacitor وأضف المنصّتين
```bash
npx cap init "براتشو كار" com.bratsho.car --web-dir=public   # يقرأ capacitor.config.ts
npx cap add android
npx cap add ios        # على Mac فقط
```
هذا يولّد مجلدَي `android/` (مشروع Android Studio) و `ios/` (مشروع Xcode).

---

## 4) ملفات Firebase الأصلية (للإشعارات والمصادقة)
من Firebase Console → Project settings → Your apps:
- **Android:** أضِف تطبيق Android بحزمة `com.bratsho.car`، نزّل
  `google-services.json` وضعه في: `android/app/google-services.json`
- **iOS:** أضِف تطبيق iOS بنفس الـBundle ID، نزّل
  `GoogleService-Info.plist` وأضِفه إلى Xcode داخل `ios/App/App/`
  (اسحبه داخل Xcode مع "Copy items if needed").

> Firebase Auth (الهاتف/OTP) يعمل داخل الـwebview عبر الموقع المنشور؛
> لا حاجة لتغيير شيء. (إن واجهت reCAPTCHA على iOS لاحقاً، يمكن لاحقاً
> استخدام @capacitor-firebase/authentication للهاتف الأصلي.)

---

## 5) الأذونات الأصلية
- **Android:** افتح `android/app/src/main/AndroidManifest.xml` وأضِف الأذونات
  من `native-snippets/android/AndroidManifest.additions.xml`، وحدّث
  `strings.xml` من السنيبت.
- **iOS:** افتح `ios/App/App/Info.plist` وأضِف مفاتيح الأذونات من
  `native-snippets/ios/Info.plist.additions.xml`.

---

## 6) الإشعارات (Push)
- **Android:** يكفي وجود `google-services.json` + إذن `POST_NOTIFICATIONS`.
- **iOS:**
  1. في Xcode: اختر هدف App → Signing & Capabilities → **+ Capability** →
     أضِف **Push Notifications** و **Background Modes** (فعّل Remote notifications).
  2. في Firebase Console → Cloud Messaging → ارفع **APNs Auth Key** (.p8)
     من حساب Apple Developer.
- في الكود: استدعِ `initNativeLayer({ navigate, saveToken })` بعد تسجيل الدخول،
  ومرّر دالة حفظ التوكن الموجودة لديك (users/{uid}/fcmTokens). انظر القسم 9.

---

## 7) الروابط العميقة (Deep / Universal Links)
- ملفّا التحقّق جاهزان في `public/.well-known/` — سيُنشران تلقائياً مع موقعك:
  - **Android:** ضع بصمة SHA256 لمفتاح التوقيع في `assetlinks.json`
    (تحصل عليها: `keytool -list -v -keystore my-release-key.jks`).
  - **iOS:** ضع `TEAMID` (معرّف فريقك في Apple) في `apple-app-site-association`.
- **Android:** أضِف `intent-filter` (المعلّق في سنيبت AndroidManifest) داخل
  `MainActivity`.
- **iOS:** أضِف `App.entitlements` (من السنيبت) وفعّل **Associated Domains**
  في Signing & Capabilities: `applinks:www.bratshocar.com`.

---

## 8) زامِن التغييرات مع المنصّتين
بعد أي تعديل على الإعداد/الإضافات:
```bash
npx cap sync
```

---

## 9) (موصى) اربط الميزات الأصلية بالكود
استدعِ التهيئة مرّة عند الإقلاع — مثلاً في `contexts/AuthContext.tsx` أو
مزوّد عام داخل `useEffect`:
```ts
import { useRouter } from "next/navigation";
import { initNativeLayer } from "@/lib/native";
// داخل المكوّن:
const router = useRouter();
useEffect(() => {
  void initNativeLayer({
    navigate: (path) => router.push(path),
    // أعِد استخدام دالة حفظ التوكن الموجودة لديك:
    saveToken: async (token, platform) => {
      if (!user) return;
      await setDoc(doc(db, "users", user.uid, "fcmTokens", token),
        { token, platform, createdAt: serverTimestamp() }, { merge: true });
    },
  });
}, [user]);
```
- **الكاميرا** في إضافة الإعلان: `const dataUrl = await pickPhoto(); if (dataUrl) upload(dataUrlToFile(dataUrl));`
- **GPS** لخدمة الساحبات: `const c = await getCurrentLocation();`
- **المشاركة**: `await shareLink({ url, title })`.
كلها ترجع تلقائياً لسلوك الويب عند عدم وجود بيئة أصلية.

---

## 🏗️ خطوات البناء النهائية

### ✅ APK (للتجربة على جهازك)
**عبر Android Studio:** `npx cap open android` ثم Build ▸ Build Bundle(s)/APK(s) ▸ Build APK(s).
**عبر سطر الأوامر:**
```bash
npx cap sync android
cd android
./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

### ✅ AAB (للرفع على Google Play)
1. أنشئ مفتاح توقيع (مرّة واحدة):
```bash
keytool -genkey -v -keystore bratsho-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bratsho
```
2. في `android/app/build.gradle` أضِف `signingConfigs` ووصّلها بـ`release`
   (أو استخدم Android Studio ▸ Build ▸ Generate Signed Bundle/APK ▸ Android App Bundle).
3. ابنِ:
```bash
cd android
./gradlew bundleRelease
# الناتج: android/app/build/outputs/bundle/release/app-release.aab
```
> لـAPK موقّع للإصدار: `./gradlew assembleRelease`.

### ✅ iOS Archive (للرفع على App Store / TestFlight) — على Mac
```bash
npx cap sync ios
npx cap open ios     # يفتح Xcode
```
في Xcode:
1. اختر هدف **App** ▸ Signing & Capabilities ▸ فعّل Automatically manage signing
   واختر فريقك (Team).
2. من شريط الأجهزة اختر **Any iOS Device (arm64)**.
3. Product ▸ **Archive**.
4. بعد الأرشفة: نافذة Organizer ▸ **Distribute App** ▸ App Store Connect (أو Ad Hoc).

---

## 🐞 إصلاح أخطاء البناء الشائعة
- **`next build` يفشل عند استيراد @capacitor/...** → لم تُثبّت الحزم بعد؛ نفّذ الخطوة 2.
- **خطأ نوع في البنر (تم إصلاحه)** → تأكّد أنك ترفع آخر نسخة من
  `components/homepage-banners-carousel.tsx`.
- **Gradle/JDK** → استخدم JDK 17 (Android Studio ▸ Settings ▸ Gradle JDK).
- **CocoaPods على iOS** → `cd ios/App && pod install`.
- **شاشة بيضاء على الأصلي** → تأكّد أن `server.url` صحيح ويعمل، وأن النطاق
  مُدرَج في `allowNavigation`.

---

## ⚠️ ملاحظتان مهمّتان
1. **App Store (قاعدة 4.2):** آبل قد ترفض تطبيقاً يكتفي بعرض موقع. وجود
   الإشعارات والكاميرا وGPS والمشاركة والروابط العميقة يقوّي القبول — فعّلها فعلاً.
2. هذه نقلة كبيرة في الأدوات. ابدأ بـ**Android/APK** أولاً (أبسط)، ثم iOS لاحقاً
   على Mac. خذها خطوة بخطوة، وأي خطأ أرسله لي بنصّه وأساعدك في حلّه.
