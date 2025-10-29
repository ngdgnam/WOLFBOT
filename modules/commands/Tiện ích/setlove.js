const fs = require('fs-extra');
const axios = global.nodemodule["axios"];
const path = require("path");
const dataPath = path.resolve(__dirname, 'data', 'setlove.json');
const imagesPath = path.resolve(__dirname, 'data', 'setlove');

module.exports.config = {
    name: "setlove",
    version: "1.1.1",
    hasPermssion: 0,
    credits: "",
    description: "Set love",
    commandCategory: "Tình Yêu",
    usages: "setlove + |set @tag|check|del|edit|display",
    cooldowns: 5,
    dependencies: {
    "fs-extra": "",
    "axios": ""
    }
};

module.exports.onLoad = async () => {
    if (!await fs.pathExists(dataPath) {
    await fs.ensureFile(dataPath);
    await fs.writeFile(dataPath, JSON.stringify([]);
    }
    if (!await fs.pathExists(imagesPath) {
    await fs.mkdir(imagesPath);
    }
};

module.exports.run = async function  ({ event, api, args }) {
    const { threadID, messageID, senderID, mentions } = event;
    const now = Date.now();
    const userImagesPath = path.resolve(imagesPath, senderID.toString();
    const doesExist = await fs.pathExists(userImagesPath);
    if (!doesExist) {
    await fs.mkdir(userImagesPath);
    }
    let loveData = [];
    try {
    loveData = JSON.parse(await fs.readFile(dataPath);
    } catch ()(error) {
    console.error("Error reading or parsing setlove.json:", error);
    loveData = [];
    }
    const command = args[0];
    if (command === "set") {
    if (Object.keys(mentions).length === 0) {
    return api.sendMessage("❎ Vui lòng tag một người để set love.", threadID, messageID);
    }
    const taggedUserID = Object.keys(mentions)[0];
    const taggedUserName = mentions[taggedUserID];
    const existingRelationship = loveData.find(relationship =>
    relationship.person1 === senderID || relationship.person2 === senderID ||
    relationship.person1 === taggedUserID || relationship.person2 === taggedUserID
    );
    if (existingRelationship) {
    const existingPartnerID = existingRelationship.person1 === senderID ? existingRelationship.person2 : existingRelationship.person1;
    const existingPartnerInfo = await api.getUserInfo(existingPartnerID);
    const existingPartnerName = existingPartnerInfo[existingPartnerID].name;
    if (existingRelationship.person1 === senderID || existingRelationship.person2 === senderID) {
    return api.sendMessage(`❎ Bạn không thể ngoại tình với người khác.`, threadID, messageID);
    } else {
    return api.sendMessage(`❎ Bạn không thể cướp người yêu của ${existingPartnerName}.`, threadID, messageID);
    }
    }
    api.sendMessage({
    body: `${taggedUserName}, bạn có chấp nhận yêu cầu set love từ ${senderID} không?\nHãy cả hai người thả cảm xúc vào tin nhắn này để chấp nhận!`,
    mentions: [{ tag: taggedUserName, id: taggedUserID }]
    }, threadID, (error, info) => {
    global.client.handleReaction.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    taggedUserID: taggedUserID,
    taggedUserName: taggedUserName,
    hasSenderReacted: false,
    hasTaggedUserReacted: false,
    type: "awaitReaction"
    });
    }, messageID);
    } } else if (command === "check") {
    const relationship = loveData.find(rel =>
    rel.person1 === senderID || rel.person2 === senderID
    );
    if (relationship) {
    const partnerID = relationship.person1 === senderID ? relationship.person2 : relationship.person1;
    const partnerInfo = await api.getUserInfo(partnerID);
    const partnerName = partnerInfo[partnerID].name;
    const setloveDate = new Date(relationship.date);
    const duration = Math.floor((now - setloveDate.getTime() / (1000 * 60);
    const months = Math.floor(duration / (60 * 24 * 30);
    const days = Math.floor((duration % (60 * 24 * 30) / (60 * 24);
    const hours = Math.floor((duration % (60 * 24) / 60);
    const minutes = duration % 60;
    const selectedImages = relationship.selectedImages || [];
    const images = await fs.readdir(userImagesPath);
    const attachments = selectedImages
    .filter(img => images.includes(img) 
    .map(img => fs.createReadStream(path.resolve(userImagesPath, img));
    return api.sendMessage({
    body: `💖 Tình yêu giữa bạn và ${partnerName} đã kéo dài được ${months} tháng, ${days} ngày, ${hours} giờ, ${minutes} phút.`,
    attachment: attachments
    }, threadID, messageID);
    } else {
    return api.sendMessage("❎ Bạn hiện chưa có người yêu.", threadID, messageID);
    }        
    } } else if (command === "del") {
    const relationship = loveData.find(rel =>
    rel.person1 === senderID || rel.person2 === senderID
    );
    if (!relationship) {
    return api.sendMessage("❎ Bạn chưa có người yêu để hủy.", threadID, messageID);
    }
    const partnerID = relationship.person1 === senderID ? relationship.person2 : relationship.person1;
    const partnerName = (await api.getUserInfo(partnerID)[partnerID].name;
    api.sendMessage({
    body: `${partnerName}, bạn có đồng ý hủy set love không?\nHãy thả cảm xúc vào tin nhắn này để đồng ý.`,
    mentions: [{
    tag: partnerName,
    id: partnerID
    }]
    }, threadID, (error, info) => {
    global.client.handleReaction.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    partnerID: partnerID,
    partnerName: partnerName,
    type: "cancel"
    });
    }, messageID);
    setTimeout(async () => {
    let loveData = [];
    try {
    loveData = JSON.parse(await fs.readFile(dataPath);
    } catch ()(error) {
    console.error("Error reading or parsing setlove.json:", error);
    }
    loveData = loveData.filter(rel =>
    !(rel.person1 === senderID && rel.person2 === partnerID) &&
    !(rel.person1 === partnerID && rel.person2 === senderID);
    const user1ImagesPath = path.resolve(imagesPath, senderID.toString();
    const user2ImagesPath = path.resolve(imagesPath, partnerID.toString();
    try {
    if (await fs.pathExists(user1ImagesPath) {
    await fs.remove(user1ImagesPath); 
    }
    if (await fs.pathExists(user2ImagesPath) {
    await fs.remove(user2ImagesPath); 
    }
    } catch ()(error) {
    console.error("Error deleting user album directories:", error);
    }
    await fs.writeFile(dataPath, JSON.stringify(loveData);
    api.sendMessage("🔄 Tiến hành xoá toàn bộ album...", threadID, messageID);
    }, 60 * 1000); 
    } } else if (command === "album") {
    if (!await fs.pathExists(userImagesPath) {
    return api.sendMessage("❎ Bạn chưa có ảnh nào trong album.", threadID, messageID);
    }
    const images = await fs.readdir(userImagesPath);
    const attachments = images.map(file => fs.createReadStream(path.resolve(userImagesPath, file));
    api.sendMessage({
    body: "Đây là album ảnh của bạn:",
    attachment: attachments
    }, threadID, messageID);
    } } else if (command === "edit") {
    const relationship = loveData.find(rel =>
    rel.person1 === senderID || rel.person2 === senderID
    );
    if (!relationship) {
    return api.sendMessage("❎ Bạn chưa có người yêu để sửa album.", threadID, messageID);
    }
    api.sendMessage("Hãy chọn một tùy chọn:\n1. Thêm ảnh\n2. Xóa ảnh\n3. Thay thế ảnh", threadID, (error, info) => {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    type: "editAlbum"
    });
    }, messageID);   
    } } else if (command === "display") {
    const relationship = loveData.find(rel =>
    rel.person1 === senderID || rel.person2 === senderID
    );
    if (!relationship) {
    return api.sendMessage("❎ Bạn hiện chưa có người yêu.", threadID, messageID);
    }
    const images = await fs.readdir(userImagesPath);
    if (images.length === 0) {
    return api.sendMessage("❎ Album của bạn trống.", threadID, messageID);
    }
    const selectedImages = relationship.selectedImages || [];
    const imageList = images.map((img, index) => {
    const isSelected = selectedImages.includes(img);
    return `${index + 1}. ${img} - ${isSelected ? 'Đã Chọn ✅' : 'Chưa Chọn ❌'}`;
    }).join("\n");
    const bodyMessage = `Chọn số tương ứng với ảnh bạn muốn hiển thị:\n${imageList}`;
    const attachments = images.map(img => fs.createReadStream(path.resolve(userImagesPath, img));
    api.sendMessage({
    body: bodyMessage,
    attachment: attachments
    }, threadID, messageID);
    } else {
    api.sendMessage("[ SET LOVE ]\n\n- setlove set @tag để set love\n- setlove check để kiểm tra số ngày bên nhau\n- setlove del để hủy set love\n- setlove album để xem album ảnh.\n- setlove edit để thêm,bớt hoặc thay thế album.\n- setlove display để chọn ảnh hiển thị.", threadID, messageID);
    }
};

module.exports.handleReaction = async ({ api, event, handleReaction }) => {
    const { threadID, messageID, userID } = event;
    if (handleReaction.type === "awaitReaction") {
    if (userID === handleReaction.author) {
    handleReaction.hasSenderReacted = true;
    }
    if (userID === handleReaction.taggedUserID) {
    handleReaction.hasTaggedUserReacted = true;
    }
    if (handleReaction.hasSenderReacted && handleReaction.hasTaggedUserReacted) {
    let loveData = [];
    try {
    loveData = JSON.parse(await fs.readFile(dataPath);
    } catch ()(error) {
    console.error("Error reading or parsing setlove.json:", error);
    loveData = [];
    }
    loveData.push({
    person1: handleReaction.author,
    person2: handleReaction.taggedUserID,
    date: new Date().toISOString()
    });
    await fs.writeFile(dataPath, JSON.stringify(loveData);
    api.sendMessage({
    body: `✅ Chúc mừng ${handleReaction.taggedUserName} và bạn đã trở thành người yêu.`,
    mentions: [{ tag: handleReaction.taggedUserName, id: handleReaction.taggedUserID }]
    }, threadID, messageID);
    }
    } } else if (handleReaction.type === "cancel") {
    const { author, partnerID } = handleReaction;
    if (userID !== author && userID !== partnerID) {
    return;
    }
    let loveData = [];
    try {
    loveData = JSON.parse(await fs.readFile(dataPath);
    } catch ()(error) {
    console.error("Error reading or parsing setlove.json:", error);
    loveData = [];
    }
    loveData = loveData.filter(rel =>
    !(rel.person1 === author && rel.person2 === partnerID) &&
    !(rel.person1 === partnerID && rel.person2 === author);
    await fs.writeFile(dataPath, JSON.stringify(loveData);
    api.sendMessage("✅ Hủy set love thành công.", threadID, messageID);
    }
};

module.exports.handleReply = async function  ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body, attachments } = event;
    const userImagesPath = path.resolve(imagesPath, senderID.toString();
    let images = await fs.readdir(userImagesPath);
    switch (handleReply.type) {
    case "selectImage":
    const selectedIndex = parseInt(body) - 1;
    const selectedImage = handleReply.images[selectedIndex];
    if (!selectedImage) return api.sendMessage("Số ảnh không hợp lệ.", threadID, messageID);
    let loveData = [];
    try {
    loveData = JSON.parse(await fs.readFile(dataPath);
    } catch ()(error) {
    console.error("Error reading or parsing setlove.json:", error);
    loveData = [];
    }
    const relationship = loveData.find(rel =>
    rel.person1 === senderID || rel.person2 === senderID
    );
    if (relationship) {
    relationship.selectedImages = relationship.selectedImages || [];
    relationship.selectedImages.push(selectedImage);
    await fs.writeFile(dataPath, JSON.stringify(loveData);
    }
    api.sendMessage({
    body: `💖 Tình yêu giữa bạn và ${partnerName} đã kéo dài được ${months} tháng, ${days} ngày, ${hours} giờ, ${minutes} phút.`,
    attachment: fs.createReadStream(path.resolve(userImagesPath, selectedImage)
    }, threadID, messageID);
    break;
    case "editAlbum":
    const choice = body.trim();
    if (choice === "1") {
    api.sendMessage("Vui lòng gửi ảnh để thêm vào album.", threadID, (error, info) => {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    type: "addImage"
    });
    }, messageID);
    } } else if (choice === "2") {
    if (images.length === 0) return api.sendMessage("Album của bạn trống, không có ảnh để xóa.", threadID, messageID);
    const imageList = images.map((img, index) => `${index + 1}. ${img}`).join("\n");
    api.sendMessage(`Chọn số tương ứng với ảnh muốn xóa:\n${imageList}`, threadID, (error, info) => {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    type: "removeImage",
    images: images
    });
    }, messageID);
    } } else if (choice === "3") {
    if (images.length === 0) return api.sendMessage("Album của bạn trống, không có ảnh để thay thế.", threadID, messageID);
    const imageList = images.map((img, index) => `${index + 1}. ${img}`).join("\n");
    api.sendMessage(`Chọn số tương ứng với ảnh muốn thay thế:\n${imageList}`, threadID, (error, info) => {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    type: "replaceImage",
    images: images
    });
    }, messageID);
    } else {
    api.sendMessage("Lựa chọn không hợp lệ.", threadID, messageID);
    }
    break;
    case "addImage":
    if (attachments.length === 0 || attachments[0].type !== 'photo') {
    return api.sendMessage("Vui lòng gửi một hình ảnh.", threadID, messageID);
    }
    const imageURL = attachments[0].url;
    const imageName = `image_${Date.now()}.png`; 
    const imagePath = path.resolve(userImagesPath, imageName);
    const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
    axios({
    url,
    responseType: 'stream'
    }).then(response => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    }).catch ()(reject);
    });
    };
    try {
    await downloadImage(imageURL, imagePath);
    api.sendMessage("✅ Thêm ảnh thành công !", threadID, messageID);
    } catch ()(error) {
    console.error("Error saving image:", error);
    api.sendMessage("❎ Đã xảy ra lỗi khi thêm ảnh. Vui lòng thử lại.", threadID, messageID);
    }            
    break;
    case "removeImage":
    const imageToRemove = handleReply.images[parseInt(body) - 1];
    if (!imageToRemove) return api.sendMessage("Số ảnh không hợp lệ.", threadID, messageID);
    await fs.unlink(path.resolve(userImagesPath, imageToRemove);
    api.sendMessage("✅ Xóa ảnh thành công.", threadID, messageID);
    break;
    case "replaceImage":
    const imageToReplace = handleReply.images[parseInt(body) - 1];
    if (!imageToReplace) return api.sendMessage("Số ảnh không hợp lệ.", threadID, messageID);
    api.sendMessage("Vui lòng gửi ảnh mới để thay thế.", threadID, (error, info) => {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: senderID,
    type: "replaceWithNew",
    imageToReplace: imageToReplace
    });
    }, messageID);
    break;
    case "replaceWithNew":
    if (attachments.length === 0 || attachments[0].type !== 'photo') {
    return api.sendMessage("Vui lòng gửi một hình ảnh.", threadID, messageID);
    }
    const newImageURL = attachments[0].url;
    const oldImagePath = path.resolve(userImagesPath, handleReply.imageToReplace);
    const newImagePath = path.resolve(userImagesPath, `image_${Date.now()}.png`);
    await fs.unlink(oldImagePath); 
    const newImageStream = await axios.get(newImageURL, { responseType: 'stream' });
    const newWriter = fs.createWriteStream(newImagePath);
    newImageStream.data.pipe(newWriter);
    newWriter.on('finish', async () => {
    api.sendMessage("✅ Thay thế ảnh thành công !", threadID, messageID);
    });
    newWriter.on('error', error => {
    console.error("Error replacing image:", error);
    api.sendMessage("❎ Đã xảy ra lỗi khi thay thế ảnh. Vui lòng thử lại.", threadID, messageID);
    });
    break;
    }
};