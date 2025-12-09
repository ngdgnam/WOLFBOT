const axios = require('axios');
const fs = require('fs');

module.exports.config = {
    name: "vd",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Niio-team (Vtuan) đã cướp cre của DC-nam", // =))  thay cre t chặt buồi từng thằng ok
    description: "Gửi video supper víp",
    commandCategory: "Nhóm",
    usages: "",
    cooldowns: 0
};

const stream_url = async function (url) {
    // axios with timeout and retry to reduce ETIMEDOUT failures
    const attempts = 3;
    const timeout = 30000; // 30s timeout (catbox.moe can be slow)
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await axios({ url: url, responseType: 'stream', timeout });
            return res.data;
        } catch (e) {
            // if final attempt or non-timeout error, fail silently (don't throw to caller)
            if (i === attempts - 1) {
                // last attempt failed, return null to let upload gracefully handle it
                return null;
            }
            // backoff: 1s, 2s, 3s between retries
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    return null;
};
global.anime = [];
global.girl = [];
global.trai = [];
module.exports.onLoad = async function (api) {
    const _v = {
        anime: JSON.parse(fs.readFileSync('./includes/listapi/video/api.json', 'utf-8')),
        girl: JSON.parse(fs.readFileSync('./includes/listapi/video/vdgai.json', 'utf-8')),
        trai: JSON.parse(fs.readFileSync('./includes/listapi/video/trai.json', 'utf-8')),
    };
    ['anime', 'girl', 'trai'].forEach((type, idx) => {
        const _status = `status${idx + 1}`;
        const _gl = `Vtuancuti${idx + 1}`;
        const mảng = global[type];
        if (!global[_gl]) {
            global[_gl] = setInterval(async () => {
                if (global[_status] || mảng.length > 5) return;
                global[_status] = true;

                try {
                    const results = await Promise.all([...Array(7)].map(async () => {
                        const url = _v[type][Math.floor(Math.random() * _v[type].length)];
                        return await upload(url, api);
                    }));
                    // filter out null results (failed uploads) and push only successful ones
                    mảng.push(...results.filter(r => r !== null));
                } catch (e) {
                    // catch any unhandled errors to prevent FCA-ERROR logs
                    console.error(`[${type}] Video fetch error:`, e.message);
                }
                global[_status] = false;
            }, 1000 * 5);
        }
    });
};

const upload = async (url, api) => {
    try {
        const stream = await stream_url(url);
        // if stream is null (download failed after retries), skip this upload
        if (!stream) {
            return null;
        }
        const form = { upload_1024: stream };
        const res = await (api.postFormData ? api.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', form) : Promise.resolve({ body: '' }));
        const bodyStr = res && res.body ? res.body : (typeof res === 'string' ? res : JSON.stringify(res));
        const parsed = JSON.parse(bodyStr.replace('for (;;);', ''));
        return Object.entries(parsed.payload?.metadata?.[0] || {})[0];
    } catch (e) {
        // silent fail on upload errors (prevents spam)
        return null;
    }
};

module.exports.run = async function (o) {
    const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res || err), o.event.messageID));
    const videoTypes = {
        anime: global.anime,
        gái: global.girl,
        trai: global.trai
    };
    send({
        body: videoTypes[o.args[0]] ? `Video ${o.args[0].charAt(0).toUpperCase() + o.args[0].slice(1)}` : 'Vui lòng nhập "anime", "gái", hoặc "trai" để nhận video tương ứng.',
        attachment: videoTypes[o.args[0]] ? videoTypes[o.args[0]].splice(0, 1) : []
    });
};
