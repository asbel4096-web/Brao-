import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { NotificationType } from "./types";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, any>;
}): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link || "",
      meta: params.meta || {},
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("createNotification error:", err);
  }
}
