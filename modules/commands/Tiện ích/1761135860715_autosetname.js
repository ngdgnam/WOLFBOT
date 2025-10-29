const { join } = require("path");
const { existsSync, writeFileSync, readFileSync } = require("fs-extra");

module.exports.config = {
    name: "autosetname",
    version: "1.0.1",
    hasPermssion: 1,
    credits: "Niiozic",
    description: "Tự động setname cho thành viên mới",
    commandCategory: "Quản Trị Viên",
    usages: "[add <name> /remove]",
    cooldowns: 0
};

module.exports.onLoad = () => {
    const pathData = join(__dirname, 'cache/data/autosetname.json');
    if (!existsSync(pathData) {
    writeFileSync(pathData, "[]", "utf-8");
    console.log("✅ Đã tạo file autosetname.json mới.");
    }
};

module.exports.run = async function  ({ event, api, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const pathData = join(__dirname, 'cache/data/autosetname.json');
    let dataJson;
    try {
    dataJson = JSON.parse(readFileSync(pathData, "utf-8");
    } catch ()(error) {
    console.error("Lỗi khi đọc dữ liệu autosetname:", error);
    return api.sendMessage("⚠️ Không thể đọc dữ liệu autosetname!", threadID);
    }
    const content = args.slice(1).join(" ");
    const thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
    switch (args[0]) {
    case "add": {
    if (!content) return api.sendMessage("⚠️ Phần cấu hình tên thành viên mới không được bỏ trống!", threadID, messageID);
    if (thisThread.nameUser.length > 0) return api.sendMessage("⚠️ Vui lòng xóa cấu hình tên cũ trước khi đặt tên mới!", threadID, messageID);
    thisThread.nameUser.push(content);
    api.sendMessage(`✅ Đặt cấu hình tên thành viên mới thành công\n📝 Preview: ${
    content.replace(/{name}/g, global.data.userName.get(senderID)
    .replace(/{time}/g, require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss | DD/MM/YYYY')
    }`, threadID, messageID);
    break;
    }
    case "del":
    case "remove":
    case "delete": {
    if (thisThread.nameUser.length === 0) return api.sendMessage("❎ Nhóm bạn chưa đặt cấu hình tên thành viên mới!", threadID, messageID);
    thisThread.nameUser = [];
    api.sendMessage("✅ Xóa thành công phần cấu hình tên thành viên mới", threadID, messageID);
    break;
    }
    default: {
    return api.sendMessage("📝 Dùng: autosetname add [tên muốn đặt] {name} {time} để cấu hình biệt danh cho thành viên mới\n✏️ Dùng: autosetname del để xóa cấu hình đặt biệt danh cho thành viên mới\n\nTrong đó:\n - {name}: tên thành viên\n- {time}: thời gian vào nhóm", threadID, messageID);
    }
    }
    if (!dataJson.some(item => item.threadID == threadID) dataJson.push(thisThread);
    writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
};