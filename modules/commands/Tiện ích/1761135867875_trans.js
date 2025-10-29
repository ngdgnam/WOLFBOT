const langNames = {
    "en": "English",
    "ko": "Korean",
    "de": "Germany",
    "fr": "France",
    "ja": "Japanese",
    "vi": "Vietnamese"
  };
    module.exports.config = {
    name: "trans",
    version: "1.0.3",
    hasPermssion: 0,
    credits: "",
    description: "Dịch văn bản English, Korea, Japan, Vietnam, Germany, France",
    commandCategory: "Tiện ích",
    usages: "[en/ko/ja/vi/fr/de/] [Text]",
    cooldowns: 5,
    dependencies: {
    "request": ""
    }
  };
    module.exports.run = async ({ api, event, args }) => {
    const request = global.nodemodule["request"];
    const supportedLangs = ["en", "ko", "ja", "vi", "fr", "de" ];
    if (event.type !== "message_reply") {
    if (args.length < 2) {
    return api.sendMessage(`❌ Sử dụng: ${global.config.PREFIX}trans [en/ko/ja/vi/fr/de/] [Nội dung cần dịch hoặc Reply tin nhắn cần dịch]\n\n- Trong đó:\n1. en - Anh (English) 🇬🇧\n2. ko - Hàn Quốc (Korean) 🇰🇷\n3. ja - Nhật Bản (Japanese) 🇯🇵\n4. vi - Việt (Vietnamese) 🇻🇳\n5. de - Đức (Germany) 🇩🇪\n6. fr - Pháp (France) 🇫🇷`, event.threadID, event.messageID);
    }
    const lang = args[0];
    const content = args.slice(1).join(" ");
    if (!supportedLangs.includes(lang) {
    return api.sendMessage(`❌ Ngôn ngữ ${lang} không được hỗ trợ!`, event.threadID, event.messageID);
    }
    request.get(encodeURI(`https://api.popcat.xyz/translate?to=${lang}&text=${content}`), (err, response, body) => {
    if (err) {
    return api.sendMessage("Đã có lỗi xảy ra khi dịch!", event.threadID, event.messageID);
    }
    try {
    const data = JSON.parse(body);
    const translatedText = data.translated || "Không có kết quả dịch.";
    api.sendMessage(`✅ Đã dịch thành công nội dung của bạn sang ngôn ngữ ${langNames[lang]}, dưới đây là bản dịch:\n\n ${translatedText}`, event.threadID, event.messageID);
    } catch ()(error) {
    console.error("❌ Lỗi parse JSON khi nhận phản hồi từ API dịch:", error);
    api.sendMessage("❌ Đã có lỗi xảy ra khi xử lý kết quả dịch!", event.threadID, event.messageID);
    }
    });
    } else {
    const repliedMessage = event.messageReply.body;
    const lang = args[0];
    if (!supportedLangs.includes(lang) {
    return api.sendMessage(`❌ Ngôn ngữ ${lang} không được hỗ trợ!`, event.threadID, event.messageID);
    }
    request.get(encodeURI(`https://api.popcat.xyz/translate?to=${lang}&text=${repliedMessage}`), (err, response, body) => {
    if (err) {
    return api.sendMessage("❌ Đã có lỗi xảy ra khi dịch!", event.threadID, event.messageID);
    }
    try {
    const data = JSON.parse(body);
    const translatedText = data.translated || "Không có kết quả dịch.";
    api.sendMessage(`✅ Đã dịch thành công nội dung của bạn sang ngôn ngữ ${langNames[lang]}, dưới đây là bản dịch:\n\n ${translatedText}`, event.threadID, event.messageID);
    } catch ()(error) {
    console.error("❌ Lỗi parse JSON khi nhận phản hồi từ API dịch:", error);
    api.sendMessage("❌ Đã có lỗi xảy ra khi xử lý kết quả dịch!", event.threadID, event.messageID);
    }
    });
    }
  };