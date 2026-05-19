const toTimestamp = (value) => ({
  toDate: () => {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  },
});

function messageTimeToIso(msg) {
  if (!msg?.timestamp) return new Date(0).toISOString();
  try {
    if (typeof msg.timestamp.toDate === "function") {
      const d = msg.timestamp.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime())
        ? d.toISOString()
        : new Date(0).toISOString();
    }
    if (msg.timestamp instanceof Date) {
      return Number.isNaN(msg.timestamp.getTime())
        ? new Date(0).toISOString()
        : msg.timestamp.toISOString();
    }
    const d = new Date(msg.timestamp);
    return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

export function serializeChatStateForCache({
  chatList,
  conversations,
  lastMessages,
  unreadCounts,
  chatIdMap,
  userMap,
}) {
  const conversationsOut = {};
  for (const [chatKey, msgs] of Object.entries(conversations || {})) {
    conversationsOut[chatKey] = (msgs || []).map((m) => ({
      id: m.id,
      sender: m.sender,
      receiver: m.receiver,
      text: m.text,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      type: m.type,
      storyPreview: m.storyPreview,
      read: !!m.read,
      _chatId: m._chatId,
      timestampIso: messageTimeToIso(m),
    }));
  }

  const lastMessagesOut = {};
  for (const [k, v] of Object.entries(lastMessages || {})) {
    try {
      const d =
        v && typeof v.toDate === "function"
          ? v.toDate()
          : v instanceof Date
          ? v
          : new Date(v);
      lastMessagesOut[k] =
        d instanceof Date && !Number.isNaN(d.getTime())
          ? d.toISOString()
          : null;
    } catch {
      lastMessagesOut[k] = null;
    }
  }

  return {
    v: 1,
    chatList: chatList || [],
    conversations: conversationsOut,
    lastMessages: lastMessagesOut,
    unreadCounts: unreadCounts || {},
    chatIdMap: chatIdMap || {},
    userMap: userMap || {},
  };
}

export function deserializeChatStateFromCache(raw) {
  if (!raw || raw.v !== 1) return null;

  const conversations = {};
  for (const [chatKey, msgs] of Object.entries(raw.conversations || {})) {
    conversations[chatKey] = (msgs || []).map((m) => ({
      id: m.id,
      sender: m.sender,
      receiver: m.receiver,
      text: m.text,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      type: m.type || "text",
      storyPreview: m.storyPreview || null,
      read: !!m.read,
      _chatId: m._chatId,
      timestamp: toTimestamp(m.timestampIso || new Date(0).toISOString()),
    }));
  }

  const lastMessages = {};
  for (const [k, iso] of Object.entries(raw.lastMessages || {})) {
    if (!iso) continue;
    lastMessages[k] = toTimestamp(iso);
  }

  return {
    chatList: raw.chatList || [],
    conversations,
    lastMessages,
    unreadCounts: raw.unreadCounts || {},
    chatIdMap: raw.chatIdMap || {},
    userMap: raw.userMap || {},
  };
}
