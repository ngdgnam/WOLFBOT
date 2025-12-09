// const moment = require('moment');
// const fs = require('fs-extra');
// const DT = "./modules/commands/data/autosetname.json";

// module.exports.config = {
//     name: "autosetname",
//     eventType: ["log:subscribe"],
//     version: "1.0.3",
//     credits: "Niio-team (Vtuan)",
//     description: "Tự động set biệt danh thành viên mới"
// };

// module.exports.run = async function ({ api, event, Users }) {
//     try {
//         let read = await fs.readFile(DT, 'utf-8');
//         let Data = read ? JSON.parse(read) : [];
//         let threadEntry = Data.find(entry => entry.threadID === event.threadID);

//         if (threadEntry) {
//             const mj = event.logMessageData.addedParticipants.map(info => info.userFbId);
//             const sn = threadEntry.nameUser;

//             for (let id of mj) {
//                 try {
//                     let name = await Users.getNameUser(id);
//                     if (!name) {
//                         const userInfoAPI = await api.getUserInfo(id);
//                         name = userInfoAPI[id]?.name || "Unknown";
//                     }

//                     const Jd = moment(event.logMessageData.timestamp).format('DD-MM-YYYY HH:mm:ss');
//                     console.log(`Đã đổi biệt danh cho người dùng: ${id}`);

//                     // Đợi một chút giữa các lần đổi biệt danh để tránh quá tải
//                     await new Promise(resolve => setTimeout(resolve, 500));
//                     await api.changeNickname(`${sn} ${name} || ${Jd}`, id, event.threadID);
//                 } catch (error) {
//                     console.error(`Error setting nickname for user ID ${id}:`, error);
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("Error in autosetname module:", error);
//     }
// };


// thích dùng cái nào thì dùng! muốn dùng cái này thì hủy // của lệnh bên dưới đi và thêm // vào lệnh ở bên trên!
module.exports.config = {
	name: "autosetname",
	eventType: ["log:subscribe"],
	version: "1.0.3",
	credits: "D-Jukie",
	description: "Tự động set biệt danh thành viên mới"
};

module.exports.run = async function ({ api, event, Users }) {
	const { threadID } = event;
	const memJoin = event.logMessageData.addedParticipants || [];
	const fs = require('fs-extra');
	const { join } = require('path');
	const pathData = join(process.cwd(), 'modules', 'data', 'autosetname.json');
	try {
		if (!fs.existsSync(pathData)) {
			fs.mkdirpSync(join(process.cwd(), 'modules', 'data'));
			fs.writeFileSync(pathData, JSON.stringify([], null, 2), 'utf8');
		}
		let dataJson = [];
		try {
			const raw = fs.readFileSync(pathData, 'utf-8');
			dataJson = raw ? JSON.parse(raw) : [];
		} catch (e) {
			dataJson = [];
		}
		if (!Array.isArray(dataJson)) dataJson = [];

		const thisThread = dataJson.find(item => String(item.threadID) === String(threadID)) || { threadID, nameUser: [] };
		if (!thisThread.nameUser || thisThread.nameUser.length === 0) return;

		const setName = thisThread.nameUser[0];
		for (let { userFbId: idUser, fullName } of memJoin) {
			try {
				await new Promise(resolve => setTimeout(resolve, 1000));
				const nickname = String(setName)
					.replace(/{name}/g, fullName)
					.replace(/{time}/g, require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss | DD/MM/YYYY'));
				await api.changeNickname(nickname, threadID, idUser);
			} catch (err) {
				console.error(`autosetname: failed to set nickname for ${idUser}:`, err.message || err);
			}
		}
	} catch (error) {
		console.error('Error in autosetname module:', error);
	}
	try { return api.sendMessage(`✅ Thực thi auto setname cho thành viên mới`, threadID, event.messageID); } catch (e) { return; }
}