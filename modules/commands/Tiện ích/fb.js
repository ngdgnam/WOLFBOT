const axios = require('axios');
const moment = require('moment');

module.exports.config = {
  name: "fb",
  version: "1.0.0",
  hasPermission: 0,
  credits: "", 
  description: "Lấy thông tin chi tiết tài khoản FB qua ID",
  commandCategory: "Thành Viên",
  usages: "fb [uid]",
  cooldowns: 5};

const originalCredits = "";
module.exports.run = async function({ api, event, args }) {
  if (module.exports.config.credits !== originalCredits) {
    return api.sendMessage("Nhìn Cái Lồn", event.threadID);
  }
  if (!args[0]) {
    return api.sendMessage("❌ Vui lòng nhập UID của bạn.\nĐể lấy UID vui lòng dùng lệnh /uid để lấy uid của bạn hoặc /uid [@tag|link] để lấy uid của người khác", event.threadID);
  }  
  const ffId = args[0];
  const apiUrl = `https://api.sumiproject.net/facebook/getinfov2?uid=${ffId}&apikey=apikeysumi`;
    try {
    const response = await axios.get(apiUrl);
    const data = response.data;
    if (data) {
    const followersCount = data["subscribers"]["summary"]["total_count"];
    const formattedFollowers = followersCount.toLocaleString('en-US');
    let resultMessage = "╭──────Facebook Info───────⭓\n";
    resultMessage += "┌ 👤 Người Dùng\n";
    resultMessage += `├ Tên: ${data["name"]}\n`;
    resultMessage += `├ ID: ${data["id"]}\n`;
    resultMessage += `├ Tên người dùng: ${data["username"]}\n`;
    resultMessage += `├ Ngôn ngữ: ${data["locale"]}\n`;
    resultMessage += `├ Đến từ: ${data["hometown"] ? data["hometown"]["name"] : "Không có"}\n`;
    resultMessage += `├ Link FB: ${data["link"]}\n`;
    resultMessage += `├ Cập nhật lần cuối: ${moment(data["updated_time"]).format('DD-MM-YYYY')}\n`;
    resultMessage += `├ Ngày tạo tài khoản: ${moment(data["created_time"]).format('DD-MM-YYYY')}\n`;
    resultMessage += `├ Người theo dõi: ${formattedFollowers}\n`;
    resultMessage += `├ Giới thiệu: ${data["about"] ? data["about"] : "Không có"}\n`;
    resultMessage += `├ Ngày sinh: ${data["birthday"] ? moment(data["birthday"], 'MM/DD/YYYY').format('DD/MM/YYYY') : "Không có"}\n`;
    let gender = data["gender"] ? data["gender"] : "Không có";
    if (gender === "male") {
    gender = "Nam";
    } } else if (gender === "female") {
    gender = "Nữ";
    }
    resultMessage += `├ Giới tính: ${gender}\n`;
    resultMessage += `├ Tình trạng quan hệ: ${data["relationship_status"] ? data["relationship_status"] : "Không có"}\n`;
    resultMessage += `├ Người quan trọng: ${data["significant_other"] ? data["significant_other"]["name"] : "Không có"}\n`;
    resultMessage += `└─ Trích dẫn yêu thích: ${data["quotes"] ? data["quotes"] : "Không có"}\n\n`;
    if (data["work"] && data["work"].length > 0) {
    resultMessage += "┌ 💼 Công Việc\n";
    data["work"].forEach((job, index) => {
    resultMessage += `├ Công việc ${index + 1}:\n`;
    resultMessage += `│ ├ Công ty: ${job["employer"]["name"]}\n`;
    resultMessage += `│ ├ Vị trí: ${job["position"] ? job["position"]["name"] : "Không có"}\n`;
    resultMessage += `│ ├ Địa điểm: ${job["location"] ? job["location"]["name"] : "Không có"}\n`;
    resultMessage += `│ ├ Bắt đầu: ${moment(job["start_date"]).format('DD/MM/YYYY')}\n`;
    resultMessage += `│ └ Mô tả: ${job["description"] ? job["description"] : "Không có"}\n`;
    });
    resultMessage += "╰─────────────⭓\n\n";
    }
    if (data["education"] && data["education"].length > 0) {
    resultMessage += "┌ 🎓 Học Vấn\n";
    data["education"].forEach((edu, index) => {
    resultMessage += `├ Học vấn ${index + 1}:\n`;
    resultMessage += `│ ├ Trường: ${edu["school"]["name"]}\n`;
    resultMessage += `│ ├ Loại: ${edu["type"]}\n`;
    resultMessage += `│ ├ Chuyên ngành: ${edu["concentration"] ? edu["concentration"].map(c => c.name).join(", ") : "Không có"}\n`;
    resultMessage += `│ └ Năm: ${edu["year"] ? edu["year"]["name"] : "Không xác định"}\n`;
    });
    resultMessage += "╰─────────────⭓\n\n";
    }
    resultMessage += "┌ 🛡️ Quyền Riêng Tư\n";
    resultMessage += `├ Nội dung: ${data["privacy"] && data["privacy"]["description"] ? data["privacy"]["description"] : "Công khai"}\n`;
    resultMessage += `├ Ai có thể xem: ${data["privacy"] && data["privacy"]["value"] ? data["privacy"]["value"] : "Mọi người"}\n`;
    resultMessage += `╰─────────────⭓`;
    api.sendMessage(resultMessage, event.threadID);
    } else {
    api.sendMessage("Không tìm thấy thông tin hoặc có lỗi xảy ra.", event.threadID);
    }
  } catch ()(error) {
    console.error(error);
    api.sendMessage("Có lỗi xảy ra khi lấy thông tin, có thể là do API bị lỗi.", event.threadID);
  }
};