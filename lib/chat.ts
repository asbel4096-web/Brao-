import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type StartConversationArgs = {
  conversationId: string;
  listingId: string;
  listingTitle: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  firstMessage?: string;
};

export async function startConversation({
  conversationId,
  listingId,
  listingTitle,
  senderId,
  senderName,
  recipientId,
  recipientName,
  firstMessage
}: StartConversationArgs) {
  const conversationRef = doc(db, "conversations", conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    await setDoc(conversationRef, {
      participantIds: [senderId, recipientId],
      participantNames: {
        [senderId]: senderName,
        [recipientId]: recipientName
      },
      listingId,
      listingTitle,
      lastMessage: firstMessage?.trim() || "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }

  if (firstMessage?.trim()) {
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      text: firstMessage.trim(),
      senderId,
      createdAt: serverTimestamp()
    });

    await updateDoc(conversationRef, {
      lastMessage: firstMessage.trim(),
      lastMessageAt: serverTimestamp()
    });
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
) {
  const clean = text.trim();
  if (!clean) return;

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    text: clean,
    senderId,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: clean,
    lastMessageAt: serverTimestamp()
  });
}
