"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { startConversation } from "@/lib/chat";

type StartChatButtonProps = {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
};

function buildConversationId(listingId: string, buyerId: string, sellerId: string) {
  const pair = [buyerId, sellerId].sort().join("_");
  return `${listingId}_${pair}`;
}

export default function StartChatButton({
  listingId,
  listingTitle,
  sellerId,
  sellerName
}: StartChatButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("يجب تسجيل الدخول أولًا لبدء المحادثة.");
      router.push("/profile");
      return;
    }

    if (currentUser.uid === sellerId) {
      alert("هذا إعلانك أنت.");
      return;
    }

    try {
      setLoading(true);

      const conversationId = buildConversationId(
        listingId,
        currentUser.uid,
        sellerId
      );

      await startConversation({
        conversationId,
        listingId,
        listingTitle,
        senderId: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email ||
          currentUser.phoneNumber ||
          "مستخدم",
        recipientId: sellerId,
        recipientName: sellerName,
        firstMessage: ""
      });

      router.push(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error("Start chat error:", error);
      alert("تعذر بدء المحادثة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStartChat}
      disabled={loading}
      className="flex items-center justify-center gap-3 rounded-[22px] border-2 border-slate-300 px-6 py-4 text-xl font-black text-slate-950 dark:border-slate-700 dark:text-white disabled:opacity-60"
    >
      <MessageCircle className="h-5 w-5 text-blue-600" />
      {loading ? "جارٍ فتح المحادثة..." : "دردش"}
    </button>
  );
}
