import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "class_chat_messages";

export interface ChatMessage {
  id: string;
  authorEmail: string;
  authorRole: string;
  text: string;
  createdAt: string;
  moderated: boolean;
}

export async function listChatMessages(limit = 100): Promise<ChatMessage[]> {
  const snapshot = await adminDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.max(1, Math.min(500, limit)))
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        authorEmail: String(data.authorEmail || ""),
        authorRole: String(data.authorRole || "STUDENT"),
        text: String(data.text || ""),
        createdAt: String(data.createdAt || ""),
        moderated: Boolean(data.moderated || false)
      };
    })
    .reverse();
}

export async function createChatMessage(input: {
  authorEmail: string;
  authorRole: string;
  text: string;
}) {
  const ref = adminDb().collection(COLLECTION).doc();
  const createdAt = new Date().toISOString();

  await ref.set({
    authorEmail: input.authorEmail.toLowerCase(),
    authorRole: input.authorRole,
    text: input.text,
    createdAt,
    moderated: false
  });

  return {
    id: ref.id,
    authorEmail: input.authorEmail.toLowerCase(),
    authorRole: input.authorRole,
    text: input.text,
    createdAt,
    moderated: false
  };
}

export async function moderateChatMessage(id: string) {
  await adminDb().collection(COLLECTION).doc(id).set(
    {
      moderated: true,
      text: "[Message removed by moderator]"
    },
    { merge: true }
  );
}
