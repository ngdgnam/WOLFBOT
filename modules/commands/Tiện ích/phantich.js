const imgur = require("imgur");
const axios = require("axios");
const fs = require("fs");
const { downloadFile } = require("./../../utils/index");

module.exports.config = {
  name: "phantich",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "",
  description: "Phân tích hình ảnh",
  commandCategory: "Tiện ích",
  usages: "[reply]",
  cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
  const { threadID, type, messageReply, messageID } = event;
  const ClientID = "c76eb7edd1459f3";  
  const analysisAPI = "https://deku-rest-api.gleeze.com/gemini?prompt=describe%20this%20photo&url=";
  const translateAPI = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=";
  if (type !== "message_reply" || messageReply.attachments.length == 0 || messageReply.attachments[0].type !== 'photo') {
    return api.sendMessage("Bạn phải reply một ảnh nào đó.", threadID, messageID);
  }
  imgur.setClientId(ClientID);
  const attachmentSend = [];
  async function getAttachments (attachments) {
    let startFile = 0;
    for (const data of attachments) {
    const ext = "jpg";
    const pathSave = __dirname + `/cache/${startFile}.${ext}`;
    ++startFile;
    const url = data.url;
    await downloadFile(url, pathSave);
    attachmentSend.push(pathSave);
    }
  }
  await getAttachments(messageReply.attachments);
  let msg = "", Error = [];
  for (const getImage of attachmentSend) {
    try {
    const getLink = await imgur.uploadFile(getImage);
    const imgurLink = getLink.link;
    const analysisResponse = await axios.get(`${analysisAPI}${imgurLink}`);
    const analysisData = analysisResponse.data.gemini;
    const translatedResponse = await axios.get(`${translateAPI}${encodeURIComponent(analysisData)}`);
    const translatedText = translatedResponse.data[0][0][0];  
    msg += `📝 Phân tích hình ảnh:\n\n${translatedText}\n`;
    fs.unlinkSync(getImage);
    } catch ()(err) {
    console.error(err);
    Error.push(getImage);
    fs.unlinkSync(getImage);
    }
  }
  if (Error.length > 0) {
    return api.sendMessage("❎ Đã xảy ra lỗi khi xử lý một số ảnh.", threadID, messageID);
  }
    return api.sendMessage(msg || "Không có mô tả nào được trả về từ API.", threadID, messageID);
};