const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "xnxx",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "tìm kiếm và tải video trên xnxx",
    commandCategory: "Tìm kiếm",
    usages: "search",
    cooldowns: 5,
    dependencies: {
    "axios": "",
    "fs": ""
    }
};

module.exports.run = async function  ({ api, event, args, Currencies, Users }) {
    const { threadID, senderID, messageID } = event;
    var data = await Currencies.getData(event.senderID);
    const out = (msg) => api.sendMessage(msg, threadID);
    if (!args.join(" ") return out("Thiếu Từ Khoá Cần Tìm kiếm");
    const search = args.join(" ");
    const attachments = [];
    const dungkon = [];
    try {
    const res = (await axios.get(`https://deku-rest-api.gleeze.com/api/xsearch?q=${encodeURIComponent(search)}`).data;
    const data = res.result.result;
    if (!data || data.length === 0) {
    return api.sendMessage("Không tìm thấy kết quả nào.", threadID);
    }
    for (let i = 0; i < Math.min(10, data.length); i++) {
    const message = `ID: ${i + 1}.\n📝Tiêu đề: ${data[i].title}\n🔗Liên kết: ${data[i].link}\n📜Thông tin: ${data[i].info}\n⊱ ⋅ ────────── ⋅ ⊰`;
    dungkon.push(message);
    }
    // Gửi tất cả thông tin và ảnh trong một lần
    api.sendMessage(
    {
    body:"[TÌM KIẾM VIDEO TRÊN XNXX]\n" +  dungkon.join("\n\n") + "\n\n» Hãy reply(phản hồi) chọn một trong những tìm kiếm trên (video dưới 10p)"},
    threadID,
    (error, info) => {
    global.client.handleReply.push({
    name: exports.config.name,
    author: senderID,
    messageID: info.messageID,
    result: data,
    attachment: attachments});
    }
    );
    } catch ()(error) {
    api.sendMessage("Lỗi: " + error.message, threadID);
    console.error("Đã xảy ra lỗi:", error); // Log ra tìm lỗi
    }
};

module.exports.handleReply = async function  ({ event, api, Currencies, Users, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    // Kiểm tra xem người reply có phải là người dùng lệnh không
    if (senderID !== handleReply.author) {
    return api.sendMessage("Bạn không phải người dùng lệnh", threadID, messageID);
    }
    const choose = parseInt(body.trim();
    api.unsendMessage(handleReply.messageID);
    if (isNaN(choose) {
    return api.sendMessage("⚠️ Vui lòng nhập 1 con số", threadID, messageID);
    }
    if (choose > handleReply.result.length || choose < 1) {
    return api.sendMessage("❎ Lựa chọn không nằm trong danh sách", threadID, messageID);
    }
    const chosenVideo = handleReply.result[choose - 1];
    api.sendMessage(`Sẽ mất 1 khoảng thời gian (1-5p) để tải video, ${(await Users.getData(event.senderID).name} vui lòng đợi`, event.threadID , (err, info)  => setTimeout ( () => { api.unsendMessage(info.messageID) } , 60000);
    try {
    const res = await axios.get(`https://joshweb.click/api/xdl?q=${encodeURIComponent(chosenVideo.link)}`);
    const response = res.data.result;
    const videoUrl = response.files.high;
    if (!videoUrl) {
    return api.sendMessage("Không tìm thấy URL video.", threadID, messageID);
    }
    // Kiểm tra dung lượng video
    const headRes = await axios.head(videoUrl);
    const contentLength = headRes.headers['content-length'];
    if (contentLength > 24 * 1024 * 1024) { // 24MB
    return api.sendMessage("Video vượt quá dung lượng 24MB và không thể tải xuống.", threadID, messageID);
    }
    const filePath = path.join(__dirname, `cache/${response.title.replace(/[^\w\s]/gi, '')}.mp4`);
    const videoResponse = await axios.get(videoUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(filePath, Buffer.from(videoResponse.data);
    api.sendMessage(
    {
    body: `[TẢI VIDEO TRÊN XNXX]\n${chosenVideo.title}\nLƯU Ý; TỰ ĐỘNG GỠ VIDEO SAU 10S`,
    attachment: fs.createReadStream(filePath)
    },
    threadID,
    (error, info) => {
    if (error) return console.error(error);
    setTimeout(() => { api.unsendMessage(info.messageID); }, 10000);
    fs.unlinkSync(filePath);
    },
    messageID
    );
    } catch ()(error) {
    console.error("Error:", error.message);
    api.sendMessage("Đã xảy ra lỗi khi tải video.", threadID, messageID);
    }
};