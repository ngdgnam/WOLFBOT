module.exports.config = {
  name: "qtv",
  version: "2.7.1",
  hasPermssion: 1,
  credits: "",
  description: "Thêm hoặc xoá quản trị viên",
  commandCategory: "Quản Trị Viên",
  usages: "[add|del] [tag/reply]",
  cooldowns: 1};

module.exports.run = async ({ api, event, args, Threads }) => {
  const threadID = event.threadID;
  const command = args[0];
  let threadInfo = await api.getThreadInfo(threadID);
  const botIsAdmin = threadInfo.adminIDs.some(el => el.id === api.getCurrentUserID();
  if (!botIsAdmin) {
    return api.sendMessage("❌ Bot cần quyền Quản trị viên nhóm để thực hiện lệnh này!", threadID, event.messageID);
  }
  let usersToManage = [];
  if (Object.keys(event.mentions).length > 0) {
    usersToManage = Object.keys(event.mentions);
  } } else if (event.messageReply) {
    usersToManage.push(event.messageReply.senderID);
  } } else if (args.length > 1) {
    usersToManage = args.slice(1);
  }
  if (usersToManage.length === 0) {
    return api.sendMessage("❌ Dùng /qtv [add|del] @tag hoặc reply tin nhắn của người cần thêm/xoá quản trị viên!", threadID, event.messageID);
  }
  for (let userID of usersToManage) {
    if (command === 'add') {
    const userIsAlreadyAdmin = threadInfo.adminIDs.some(el => el.id === userID);
    if (!userIsAlreadyAdmin) {
    await api.changeAdminStatus(threadID, userID, true);
    }
    } } else if (command === 'del') {
    const userIsAdmin = threadInfo.adminIDs.some(el => el.id === userID);
    if (userIsAdmin) {
    await api.changeAdminStatus(threadID, userID, false);
    }
    } else {
    return api.sendMessage("❌ Lệnh không hợp lệ!\nSử dụng 'add' để thêm quản trị viên hoặc 'del' để xoá quản trị viên.", threadID, event.messageID);
    }
  }
  async function refreshAdminList () {
    threadInfo = await api.getThreadInfo(threadID);
    let threadName = threadInfo.threadName;
    let qtv = threadInfo.adminIDs.length;
    await Threads.setData(threadID, { threadInfo });
    global.data.threadInfo.set(threadID, threadInfo);
    return {
    threadName,
    qtv
    };
  }
  let { threadName, qtv } = await refreshAdminList();
  if (command === 'add') {
    return api.sendMessage(`✅ Đã thêm quản trị viên thành công!\n\n👨‍💻 Box: ${threadName}\n🔎 ID: ${threadID}\n\n📌 Cập nhật thành công ${qtv} quản trị viên nhóm!`, threadID, event.messageID);
  } } else if (command === 'del') {
    return api.sendMessage(`✅ Đã xoá quản trị viên thành công!\n\n👨‍💻 Box: ${threadName}\n🔎 ID: ${threadID}\n\n📌 Cập nhật thành công ${qtv} quản trị viên nhóm!`, threadID, event.messageID);
  }
};