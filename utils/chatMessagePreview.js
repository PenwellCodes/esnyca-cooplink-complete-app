/**
 * Build chat-list preview text from the latest visible message.
 */
export function formatMessagePreview(message, labels = {}) {
  const startConversation =
    labels.startConversation || "Start a conversation";
  const fileSent = labels.fileSent || "📂 File sent";

  if (!message) return startConversation;

  if (message.type === "story_reply") {
    const text = (message.text || "").trim();
    return text ? `Replied to status: ${text}` : "Replied to status";
  }

  if (message.text && String(message.text).trim()) {
    return String(message.text).trim();
  }

  if (message.fileUrl) return fileSent;

  return startConversation;
}
