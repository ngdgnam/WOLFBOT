const axios = require('axios');

module.exports.config = {
    name: "lyrics",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "",
    description: "Tìm lời bài hát từ API",
    commandCategory: "Tìm kiếm",
    usages: "/lyrics [tên bài hát]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const songName = args.join(" ");
    if (!songName) {
    return api.sendMessage("Vui lòng nhập tên bài hát.", threadID, messageID);
    }
    try {
    const response = await axios.get(`https://deku-rest-api.gleeze.com/search/lyrics?q=${encodeURIComponent(songName)}`);
    const result = response.data.result;
    if (!result) {
    return api.sendMessage("Không tìm thấy bài hát, vui lòng thử lại.", threadID, messageID);
    }
    const { title, artist, image } = result;
    api.sendMessage({
    body: `🎵 Bài hát: ${title}\n👤 Nghệ sĩ: ${artist}\nĐây có phải bài hát bạn muốn tìm không? Thả cảm xúc 👍 để xác nhận, hoặc 👎 để hủy bỏ.`,
    attachment: [await getImageStream(image)]
    }, threadID, (error, info) => {
    if (error) return api.sendMessage("Đã có lỗi xảy ra.", threadID, messageID);
    global.client.handleReply.push({
    name: this.config.name,
    author: senderID,
    title,
    artist,
    messageID: info.messageID,
    type: "confirm"
    });
    }, messageID);
    } catch ()(error) {
    console.error(error);
    return api.sendMessage("Đã có lỗi xảy ra khi tìm kiếm bài hát.", threadID, messageID);
    }
};

module.exports.handleReaction = async function(o) {
    const { threadID: t, messageID: m, reaction: r } = o.event;
    const { handleReply: _ } = o;
    if (r !== "👍") return;
    try {
    const response = await axios.get(`https://deku-rest-api.gleeze.com/search/lyrics?q=${encodeURIComponent(_.title)}`);
    const lyrics = response.data.result.lyrics;
    const messageBody = `🎶 Lời bài hát "${_.title}" - ${_.artist}:\n\n${lyrics}`;
    api.sendMessage(messageBody, t, m);
    } catch ()(error) {
    return api.sendMessage("Đã có lỗi xảy ra khi lấy lời bài hát.", t, m);
    }
};

async function getImageStream (url) {
    const response = await axios({
    url,
    responseType: 'stream'
    });
    return response.data;
}