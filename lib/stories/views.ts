import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function registerStoryView(storyId: string, userId: string, ownerId?: string) {
  if (!storyId || !userId) return;
  if (ownerId && ownerId === userId) return;

  const viewerRef = doc(db, "stories", storyId, "viewers", userId);
  const storyRef = doc(db, "stories", storyId);

  const viewerSnap = await getDoc(viewerRef);
  if (viewerSnap.exists()) return;

  await setDoc(viewerRef, {
    userId,
    viewedAt: serverTimestamp(),
  });

  await updateDoc(storyRef, {
    viewsCount: increment(1),
  });
}
