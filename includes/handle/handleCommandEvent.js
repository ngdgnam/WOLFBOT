/**
 * handleCommandEvent.js
 * - Accepts: event (object)  <-- IMPORTANT: function(event)
 * - Responsibilities:
 *    * Safe-guard nếu event undefined
 *    * Bỏ qua tin nhắn do bot gửi (tránh loop)
 *    * Chuẩn hoá event.body
 *    * Tạo record user/thread nếu controller có phương thức createData
 *    * Không ném lỗi ra ngoài (try/catch)
 */

module.exports = function ({ api, Threads, Users, Currencies }) {
  return async function handleCommandEvent(event) {
    try {
      // Safety: event phải tồn tại
      if (!event || typeof event !== "object") return;

      // Normalize senderID/threadID/messageID
      const senderID = event.senderID || event.sender || event.author || null;
      const threadID = event.threadID || event.thread || null;
      const messageID = event.messageID || event.message_id || null;
      const type = event.type || event.messageType || null;

      // Nếu không có sender, bỏ qua
      if (!senderID) return;

      // Bỏ qua các sự kiện không phải tin nhắn nếu muốn (nếu bạn gọi handler cho các loại khác thì comment/loại bỏ)
      // Nếu hệ thống gọi handlerCommandEvent cho nhiều loại thì giữ, ở đây ta chỉ xử lý message-like
      // if (type && !["message","message_reply","message_unsend","message_reaction"].includes(type)) return;

      // Lấy bot id (hàm getCurrentUserID có thể là function)
      let botID = null;
      try {
        botID = (typeof api.getCurrentUserID === "function") ? api.getCurrentUserID() : api.getCurrentUserID;
      } catch (e) {
        botID = null;
      }

      // Skip nếu message do chính bot gửi ra (tránh loop)
      if (botID && String(botID) === String(senderID)) return;

      // Chuẩn hoá nội dung message: nhiều lib có location khác nhau
      const safeBody =
        event.body
        || (event.message && (event.message.text || event.message.body))
        || (event.message && event.message.message)
        || "";

      // Gán lại vào event để các handler khác dùng (nếu họ rely vào event.body)
      event.body = typeof safeBody === "string" ? safeBody : "";

      // Chuẩn hoá isGroup (nhiều code check event.isGroup)
      event.isGroup = !!(event.isGroup || (threadID && senderID && String(threadID) !== String(senderID)));

      // Nếu cần tách senderID có format đặc biệt "xxx:yyy", xử lý an toàn
      let normalizedSender = String(senderID);
      if (normalizedSender.includes(":")) {
        const seg = normalizedSender.split(":");
        // lấy phần sau nếu có, fallback về toàn bộ senderID
        normalizedSender = seg[1] || normalizedSender;
      }

      // TRY create DB records nếu controllers có method createData (không ném lỗi nếu không có)
      if (Users && typeof Users.createData === "function") {
        try { await Users.createData(String(normalizedSender)); } catch (e) { /* ignore */ }
      }
      if (Threads && threadID && typeof Threads.createData === "function") {
        try { await Threads.createData(String(threadID)); } catch (e) { /* ignore */ }
      }

      // Một số handler kỳ vọng có messageID, body, senderID, threadID -> đảm bảo tồn tại
      event.senderID = String(normalizedSender);
      if (threadID) event.threadID = String(threadID);
      if (messageID) event.messageID = messageID;

      // Bạn có thể thêm các flags hỗ trợ ở đây để dùng lại trong các handler khác
      // Ví dụ: event._isCmdCandidate = event.body && event.body.trim().length > 0;
      // Hoặc gán timestamp chuẩn:
      if (!event.timestamp) event.timestamp = Date.now();

      // Kết thúc: trả về, không trả gì cụ thể
      return;
    } catch (err) {
      // Bắt tất cả để không crash bot
      console.error("[handleCommandEvent] Lỗi xử lý sự kiện:", err);
      return;
    }
  };
};
