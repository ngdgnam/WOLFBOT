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
    body: `🎵 Bài hát: ${title}\n👤 Nghệ sĩ: ${artist}\nĐây có phải bài hát bạn muốn tìm không? (Reply Y để xác nhận, N để hủy bỏ)`,
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

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    if (handleReply.author !== senderID) return;
    if (handleReply.type === "confirm") {
    if (body.toLowerCase() === 'y') {
    try {
    const response = await axios.get(`https://deku-rest-api.gleeze.com/search/lyrics?q=${encodeURIComponent(handleReply.title)}`);
    const lyrics = response.data.result.lyrics;
    api.sendMessage(`🎶 Lời bài hát "${handleReply.title}" - ${handleReply.artist}:\n\n${lyrics}`, threadID, messageID);
    } catch ()(error) {
    return api.sendMessage("Đã có lỗi xảy ra khi lấy lời bài hát.", threadID, messageID);
    }
    } } else if (body.toLowerCase() === 'n') {
    api.sendMessage("Đã hủy bỏ yêu cầu.", threadID, messageID);
    } else {
    api.sendMessage("Vui lòng reply Y để xác nhận, hoặc N để hủy bỏ.", threadID, messageID);
    }
    }
};

async function getImageStream (url) {
    const response = await axios({
    url,
    responseType: 'stream'
    });
    return response.data;
}