const axios = require('axios');
const dayTranslations = {
  'Sunday': 'Chủ Nhật',
  'Monday': 'Thứ Hai',
  'Tuesday': 'Thứ Ba',
  'Wednesday': 'Thứ Tư',
  'Thursday': 'Thứ Năm',
  'Friday': 'Thứ Sáu',
  'Saturday': 'Thứ Bảy'
};

const weatherTranslations = {
  'sunny': 'Trời Nắng',
  'mostly sunny': 'Nhiều Nắng',
  'partly sunny': 'Nắng Vài Nơi',
  'rain showers': 'Mưa Rào',
  't-storms': 'Có Bão',
  'light rain': 'Mưa Nhỏ',
  'mostly cloudy': 'Trời Nhiều Mây',
  'rain': 'Trời Mưa',
  'heavy t-storms': 'Bão Lớn',
  'partly cloudy': 'Mây Rải Rác',
  'mostly clear': 'Trời Trong Xanh',
  'cloudy': 'Trời Nhiều Mây',
  'clear': 'Trời Trong Xanh, Không Mây'
};

const translateWeather = (weather) => {
  const normalizedWeather = weather.toLowerCase();
  if (weatherTranslations[normalizedWeather]) {
    return weatherTranslations[normalizedWeather];
  } else {
    console.log(`Không có bản dịch cho trạng thái thời tiết: ${weather}`);
    return weather; // Giữ nguyên nếu không có bản dịch
  }
};

const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

module.exports.config = {
  name: 'nasa',
  version: '1.0.0',
  hasPermission: 0,
  credits: "",
  description: 'Xem dự báo thời tiết của tỉnh/thành phố',
  commandCategory: 'Thành Viên',
  usages: [],
  cooldowns: 3};

module.exports.run = async ({ api, event, args }) => {
  try {
    const location = args.join(" ");
    if (!location) return api.sendMessage("Nhập tỉnh/tp cần xem thời tiết", event.threadID);
    const res = await axios.get(`https://api.popcat.xyz/weather?q=${encodeURI(location)}`);
    if (!res.data || res.data.length === 0) {
    return api.sendMessage("Không tìm thấy dữ liệu thời tiết cho địa điểm này.", event.threadID);
    }
    const data = res.data[0];
    const { location: loc, current, forecast } = data;
    if (!forecast || forecast.length === 0) {
    return api.sendMessage("Không tìm thấy dữ liệu thời tiết cho địa điểm này.", event.threadID);
    }
    let message = `Thời tiết hiện tại của ${loc.name}:\n` +
    `🌡 Nhiệt độ: ${current.temperature}°C\n` +
    `🤲 Cảm giác như: ${current.feelslike}°C\n` +
    `🗺️ Trạng thái: ${translateWeather(current.skytext)}\n` +
    `♒ Độ ẩm: ${current.humidity}%\n` +
    `💨 Gió: ${current.winddisplay}\n\n` +
    `Thả cảm xúc ❤ để xem dự báo thời tiết trong 3 ngày tới.`;
    api.sendMessage(message, event.threadID, (err, info) => {
    global.client.handleReaction.push({
    name: this.config.name,
    messageID: info.messageID,
    location: loc.name,
    forecast: forecast,
    author: event.senderID
    });
    });
    } catch ()(err) {
    api.sendMessage(`Đã xảy ra lỗi khi lấy dữ liệu thời tiết: ${err.message}`, event.threadID);
  }
};

module.exports.handleReaction = async function({ event, api, handleReaction: reaction }) {
  if (event.userID != reaction.author) return;
  if (event.reaction != "❤") return; 
    const { location, forecast } = reaction;
    const today = new Date();
  const nextFiveDays = [];
  for (let i = 0; i < forecast.length; i++) {
    const forecastDate = new Date(forecast[i].date);
    if (forecastDate >= today && nextFiveDays.length < 5) {
    nextFiveDays.push(forecast[i]);
    }
  }
    if (nextFiveDays.length === 0) {
    return api.sendMessage("Không có dữ liệu thời tiết cho 3 ngày tới.", event.threadID);
  }
    let message = `Dự báo thời tiết 3 ngày tới tại ${location}:\n`;
    for (let i = 0; i < nextFiveDays.length; i++) {
    const day = dayTranslations[nextFiveDays[i].day] || nextFiveDays[i].day;
    const weather = translateWeather(nextFiveDays[i].skytextday);
    const date = formatDate(nextFiveDays[i].date);
    message += `${i + 1}. ${day} - ${date}\n` +
    `🌡 Nhiệt độ dự báo: từ ${nextFiveDays[i].low}°C ➝ ${nextFiveDays[i].high}°C\n` +
    `🗺️ Dự báo: ${weather}\n` +
    `🌧 Tỷ lệ mưa: ${nextFiveDays[i].precip}%\n\n`;
  }
    api.sendMessage(message, event.threadID);
}