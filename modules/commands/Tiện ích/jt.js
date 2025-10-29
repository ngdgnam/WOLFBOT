const axios = require("axios"), fs = require("fs"), path = require("path");
module.exports.config = {
  name: "jt",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Dũngkon",
  description: "check đơn hàng vận chuyển của J&T",
  commandCategory: "Tìm kiếm",
  usages: "billcode",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID } = event;
  const out = (msg) => api.sendMessage(msg, threadID);
    if (!args.join(" ") return out("⚠️ Thiếu Dữ Liệu");
  const billcode = event.type === "message_reply" ? event.messageReply.senderID : args.join(" ");
    // Đảm bảo rằng thư mục 'cache' tồn tại trước khi tiếp tục
  const cacheDir = path.join(__dirname, "cache/data_jt");
 if (!fs.existsSync(cacheDir) {
    fs.mkdirSync(cacheDir);
    }
    const attachments = [], dungkon = []; // Tao thích xài array
    try {
    const response = await axios.get(`https://apichatbot.sumiproject.io.vn/j&t?billcode=${billcode}`);
    const data = response.data;
api.sendMessage(`🔄 Đang check đơn hàng...`, event.threadID , (err, info)  => setTimeout(() => { api.unsendMessage(info.messageID) }, 5000);
    // const trans = await axios.get(`https://thenamk3.net/api/trans.json?text=${data.data.status}&language=vi&apikey=E8v5sGP5`);
    // const tran = trans.translated;
    // console.log(tran)
    for (let i = 0; i < 1; i++) {
    const message = `
╭─────────────⭓
│ CHECK ĐƠN HÀNG J&T
│ 🌎 Tỉnh: ${data.data.details[i].currentdroppoint.province}
│ 🏣 Thành phố: ${data.data.details[i].city}
│ 🚀 Vĩ độ: ${data.data.details[i].latitude}
│ 🛰 Kinh độ: ${data.data.details[i].longitude}
│ 🕐 Thời gian: ${data.data.details[i].accepttime}
│ 👤 Người nhận đơn hàng: ${data.data.details[i].signer}
│ 🗨️ Trạng Thái: ${data.data.status}
│ 🚛 Địa chỉ hàng ở hiện tại: ${data.data.details[i].currentdroppoint.siteaddr}
╰─────────────⭓`;
console.log(data.data.expressFiles[0].fileUrl)
    const url = data.data.expressFiles[0].fileUrl;
    const hi = path.join(cacheDir, `j&t.jpg`);
    console.log(url)
    const imageResponse = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(hi, Buffer.from(imageResponse.data);
    attachments.push(fs.createReadStream(hi);
    dungkon.push(message); 
    console.log(`🔄 Đang check billcode: ${billcode}`);
    }
    // Gửi tất cả thông tin và ảnh trong một lần
    api.sendMessage({
    body: dungkon.join("\n\n"),
    attachment: attachments
    }, threadID);
  } catch ()(error) {
    const response = await axios.get(`https://apichatbot.sumiproject.io.vn/j&t?billcode=${billcode}`);
    const data = response.data;
    for (let i = 0; i < 1; i++) {
    api.sendMessage(`
╭─────────────⭓
│ CHECK ĐƠN HÀNG J&T
│ 🌎 Tỉnh: ${data.data.details[i].currentdroppoint.province}
│ 🏣 Thành phố: ${data.data.details[i].city}
│ 🚀 Vĩ độ: ${data.data.details[i].latitude}
│ 🛰 Kinh độ: ${data.data.details[i].longitude}
│ 🕐 Thời gian: ${data.data.details[i].accepttime}
│ 👤 Người nhận đơn hàng: ${data.data.details[i].signer}
│ 🗨️ Trạng Thái: ${data.data.status}
│ 🚛 Địa chỉ hàng ở hiện tại: ${data.data.details[i].currentdroppoint.siteaddr}
╰─────────────⭓`, threadID);
 }
    console.error("⚠️ Đã xảy ra lỗi:", error); // Log ra tìm lỗi 
    }
};