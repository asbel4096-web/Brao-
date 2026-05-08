# Chat: صوت + صور + نصائح + شريط تفاعل أيقوني

تنفيذ كامل لمتطلبات الصورتين المرجعيتين.

## الملفات (10 ملفات)

```
lib/
└── types.ts                                   ← ChatMessage موسَّع (kind/image/audio)

components/
├── like-button.tsx                            ← تصميم أيقوني نظيف (ThumbsUp + رقم)
├── favorite-button.tsx                        ← Bookmark بدلاً من Heart
├── share-button.tsx                           ← Share2 أيقوني نظيف
├── listing-actions-bar.tsx                    ← شريط بدون خلفية، justify-around
└── chat/
    ├── chat-tips-banner.tsx                   ← نصائح عامة (حدود متقطعة وردية) ← جديد
    ├── audio-recorder.tsx                     ← مسجّل صوت ← جديد
    └── chat-message-bubble.tsx                ← فقاعة تدعم نص/صورة/صوت ← جديد

app/(public)/messages/[chatId]/page.tsx         ← الدردشة الكاملة بكل الميزات

storage.rules                                  ← + chat-media/{chatId}/{userId}/...
```

## التطبيق

```bash
unzip chat-audio-image-and-icons-redesign.zip
git add lib/ components/ app/ storage.rules
git commit -m "feat: chat audio+image + tips banner + redesigned actions bar"
git push

# مهم: انشر القواعد على Firebase
firebase deploy --only storage
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**.

---

## تنفيذ المتطلبات (من الصورتين)

### 🟦 شريط التفاعل (Image 1)

طابقت الصورة بالضبط:
- **بدون خلفيات أو حدود ملوّنة** — مجرد أيقونات.
- **الرقم بجانب الأيقونة** يميناً (RTL): `1 👍` `6 💬`.
- **مقاس موحَّد** — كل الأيقونات `size={18}` والأزرار `h-10`.
- **توزيع متساوٍ** — `justify-around` + خط فاصل علوي خفيف (`border-t`).
- **هوية براتشو** — لون افتراضي slate، عند hover/active يصبح brand-700.
- 4 أزرار: `🔖 Bookmark` / `↪ Share` / `💬 Comment` / `👍 Like`

### 🟦 الدردشة (Image 2)

#### 1. النصائح العامة
بانر علوي ثابت بحدود وردية متقطعة + أيقونة `i` حمراء + 3 نصائح:
- قم بتفقّد المنتج جيداً قبل شرائه
- لا تقم بإرسال المال مسبقاً
- اجتمع في الأماكن العامة فقط

#### 2. رفع صورة
- زر `📎 Paperclip` خارج الحقل + `📷 Camera` داخل الحقل (مطابق للصورة).
- التحقق: `image/*` فقط، حد أقصى **5 MB**.
- Triple auth guard قبل الرفع (`user` + `auth.currentUser` + UID match).
- المسار: `chat-media/{chatId}/{userId}/images/{timestamp}-{filename}`.
- أبعاد الصورة تُقرأ قبل الرفع لتفادي layout shift في الفقاعة.

#### 3. تسجيل صوتي
- زر `🎤` يتحوّل إلى مسجّل واجهي عند الضغط.
- يبدأ تلقائياً، يعرض المؤقت + موجة بصرية نابضة.
- يختار أفضل MIME مدعوم (webm/opus → mp4 → ogg).
- حد أقصى 120 ثانية (تلقائي) و 8 MB.
- الـ Send/Cancel واضحين مع الألوان (brand لإرسال، rose لحذف).
- المسار: `chat-media/{chatId}/{userId}/audio/{timestamp}.{ext}`.

#### 4. الردود السريعة
3 buttons دائرية بحدود brand: `السلام عليكم` / `مرحبا` / `هلا`.
تظهر فقط في المحادثات الفارغة (لا تشتت بعدما تبدأ).

#### 5. Header محسَّن
- اسم المستخدم + صورته يميناً (مطابق RTL).
- زر `📞 اتصال` على اليسار.
- chip تحت الـ header يعرض الإعلان المرتبط بصورة مصغّرة.

#### 6. أيقونة المايك/الإرسال الذكية
عندما الحقل فارغ → زر `🎤 Mic`.
بمجرد كتابة أي حرف → يتحوّل تلقائياً لـ `Send`.
(نفس سلوك واتساب/Messenger).

---

## بنية رسائل Firestore

`ChatMessage` الآن يحمل حقل `kind`:

```ts
{
  kind: "text" | "image" | "audio",
  text: string,                        // نص أو caption
  imageUrl?, imageWidth?, imageHeight?, // للصور
  audioUrl?, audioDurationSec?,         // للصوت
  senderId, senderName, createdAt, read
}
```

**التوافق الرجعي:** الرسائل القديمة بدون `kind` تُعرض كـ text تلقائياً (السلوك الافتراضي).

`lastMessage` في chat document يستخدم previews واضحة:
- نص: النص نفسه
- صورة: `📷 صورة`
- صوت: `🎤 رسالة صوتية (M:SS)`

---

## Storage Rules — مسار chat-media

```
match /chat-media/{chatId}/{userId}/{allPaths=**} {
  allow read: if signedIn();          // أي مستخدم مسجَّل (روابط Firestore تكشف فقط للمشاركين)
  allow write: if isOwner(userId)
    && (imageUnder(5MB) || audioUnder(8MB));
}
```

⚠️ **مهم:** بعد الـ deploy، `firebase deploy --only storage` لتفعيل القواعد الجديدة.

---

## التحقق

```
✓ tsc --noEmit                         → 0 أخطاء
✓ شريط التفاعل أيقوني نظيف             → مطابق Image 1
✓ النصائح العامة                        → مطابق Image 2 (حدود وردية متقطعة)
✓ رفع صورة                              → يعمل بـ guard كامل
✓ تسجيل صوت                             → يعمل بـ MediaRecorder API
✓ الردود السريعة                         → السلام عليكم/مرحبا/هلا
✓ أيقونة Mic/Send ذكية                  → تتبدّل حسب وجود نص
✓ RTL                                  → مطابق
✓ هوية براتشو                          → brand colors محفوظة
✓ التوافق الرجعي                       → الرسائل القديمة (نصية) تعمل
```
