const axios = require("axios");

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch ()(e) {
    return false;
  }
}

module.exports.config = {
  name: 'audio',
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Quất -  (Fix) ",
  description: "tải audio",
  commandCategory: "Tiện ích",
  usages: "audio + link",
  cooldowns: 0};

module.exports.run = async function({ api, event, args }) {
  if (args.length === 0) {
    return api.sendMessage({
    body: "⚠️ Bạn chưa nhập link. Vui lòng nhập lệnh theo định dạng: /audio [link] \n Lưu ý: Chỉ tải được các loại link có đuôi .mp3 .mp4 .gif .jpg .jpeg .png, có thể cách nhau để tải nhiều link."
    }, event.threadID);
  }
    const i = (url) => axios.get(url, { responseType: "stream" }).then((r) => r.data);
  let links = args.join(' ').split(/\s+/).map(link => link.trim();
    const validLinks = [];
  const invalidLinks = [];
  const audioLinks = [];
  const videoLinks = [];
  const mediaLinks = [];
    for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (!isValidUrl(link) {
    invalidLinks.push(i + 1);
    } else {
    validLinks.push(link);
    if (link.endsWith('.mp3') {
    audioLinks.push(link);
    } } else if (link.endsWith('.mp4') {
    videoLinks.push(link);
    } } else if (link.endsWith('.gif') || link.endsWith('.jpg') || link.endsWith('.jpeg') || link.endsWith('.png') {
    mediaLinks.push(link);
    } else {
    invalidLinks.push(i + 1);
    }
    }
  }
    if (invalidLinks.length > 0) {
    const errorMessage = `🔄 Link thứ ${invalidLinks.join(', ')} không đúng định dạng. Đang loại bỏ...`;
    api.sendMessage({ body: errorMessage, attachment: [] }, event.threadID);
  }
    const audioAttachments = await Promise.all(audioLinks.map(async link => ({ type: 'audio', data: await i(link) }));
  const videoAttachments = await Promise.all(videoLinks.map(async link => ({ type: 'video', data: await i(link) }));
  const mediaAttachments = await Promise.all(mediaLinks.map(async link => ({ type: 'media', data: await i(link) }));
    const allAttachments = [...audioAttachments, ...videoAttachments, ...mediaAttachments];
    if (allAttachments.length > 0) {
    let message = `🔄 Đang tải ${allAttachments.length} link...`;
    api.sendMessage({
    body: message,
    attachment: []
    }, event.threadID);
    let audioCount = 0;
    let videoCount = 0;
    let mediaCount = 0;
    for (const attachment of allAttachments) {
    const { type, data } = attachment;
    let body = '';
    if (type === 'audio') {
    audioCount++;
    body = `✅ Đã tải thành công ${audioCount} âm thanh`;
    } } else if (type === 'video') {
    videoCount++;
    body = `✅ Đã tải thành công ${videoCount} video`;
    } } else if (type === 'media') {
    mediaCount++;
    body = `✅ Đã tải thành công ${mediaCount} ảnh`;
    }
    await api.sendMessage({
    body,
    attachment: [data]
    }, event.threadID);
    }
    api.sendMessage({
    body: `🔄 Đã tải thành công ${audioCount} âm thanh, ${videoCount} video, và ${mediaCount} ảnh.`
    }, event.threadID);
  } else {
    api.sendMessage({
    body: "⚠️ Không có file nào để tải xuống."
    }, event.threadID);
  }
}