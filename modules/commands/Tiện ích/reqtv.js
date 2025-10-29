module.exports.config = {
    name: "reqtv",
    version: "1.0",
    hasPermssion: 1,
    credits: "ReU",
    description: "Làm mới danh sách quản trị viên",
    commandCategory: "Quản Trị Viên",
    usages: "để trống/threadID",
    cooldowns: 5};
  module.exports.run = async function  ({ event, args, api, Threads }) { 
  const { threadID } = event;
  const targetID = args[0] || event.threadID;
  var threadInfo = await api.getThreadInfo(targetID);
  let threadName = threadInfo.threadName;
  let qtv = threadInfo.adminIDs.length;
  await Threads.setData(targetID , { threadInfo });
  global.data.threadInfo.set(targetID , threadInfo);
  return api.sendMessage(`✅ Đã làm mới danh sách quản trị viên nhóm thành công!\n\n👨‍💻 Box: ${threadName}\n🔎 ID: ${targetID}\n\n📌 Cập nhật thành công ${qtv} quản trị viên nhóm!`, threadID);
  }