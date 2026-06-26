/**
 * براتشو كار — إشعارات الإعجاب والمتابعة (Cloud Functions gen2)
 *
 * عند إعجاب جديد بإعلان  → إشعار + Push لصاحب الإعلان.
 * عند متابعة جديدة لمعرض → إشعار + Push لصاحب المعرض.
 *
 * يكتب الإشعار في مجموعة notifications (نفس مخطط الموقع والتطبيق):
 *   { userId, type, title, body, link, read, createdAt }
 * ويُرسل Push عبر FCM لتوكنات users/{uid}/fcmTokens/{token}.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

/** يرسل Push لكل توكنات المستخدم، ويحذف التوكنات غير الصالحة. */
async function sendPushToUser(uid, { title, body, link }) {
  if (!uid) return;
  const snap = await db.collection("users").doc(uid).collection("fcmTokens").get();
  const tokens = snap.docs.map((d) => d.id).filter(Boolean);
  if (tokens.length === 0) return;

  const message = {
    tokens,
    notification: { title, body },
    data: { title, body, link: link || "" },
    android: {
      priority: "high",
      notification: { sound: "default", channelId: "bratsho_default" },
    },
    apns: { payload: { aps: { sound: "default" } } },
  };

  let res;
  try {
    res = await getMessaging().sendEachForMulticast(message);
  } catch (err) {
    console.error("FCM send error:", err);
    return;
  }

  // تنظيف التوكنات الميتة
  const dead = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = (r.error && r.error.code) || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument") ||
        code.includes("invalid-registration-token")
      ) {
        dead.push(tokens[i]);
      }
    }
  });
  await Promise.all(
    dead.map((t) =>
      db.collection("users").doc(uid).collection("fcmTokens").doc(t).delete().catch(() => {})
    )
  );
}

/** إشعار إعجاب جديد بإعلان. */
exports.onListingLiked = onDocumentCreated(
  "listings/{listingId}/likes/{userId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const like = snap.data() || {};
    const listingId = event.params.listingId;
    const ownerId = like.ownerId;
    const likerId = like.userId || event.params.userId;
    const listingTitle = (like.title || "").toString().trim();

    if (!ownerId || ownerId === likerId) return; // لا تُشعر صاحب الإعلان بإعجابه بنفسه

    const title = "إعجاب جديد 👍";
    const body = listingTitle
      ? `أعجب أحد المستخدمين بإعلانك «${listingTitle}».`
      : "أعجب أحد المستخدمين بإعلانك.";
    const link = `/listings/${listingId}`;

    await db.collection("notifications").add({
      userId: ownerId,
      type: "like",
      title,
      body,
      link,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    await sendPushToUser(ownerId, { title, body, link });
  }
);

/** إشعار متابعة جديدة لمعرض. */
exports.onTraderFollowed = onDocumentCreated(
  "users/{traderId}/followers/{followerId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const follow = snap.data() || {};
    const traderId = event.params.traderId;
    const followerId = follow.followerId || event.params.followerId;
    const followerName = (follow.followerName || "مستخدم").toString().trim();

    if (!traderId || traderId === followerId) return;

    const title = "متابع جديد";
    const body = `قام ${followerName} بمتابعة معرضك.`;
    const link = `/traders/${traderId}`;

    await db.collection("notifications").add({
      userId: traderId,
      type: "follow",
      title,
      body,
      link,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    await sendPushToUser(traderId, { title, body, link });
  }
);
