function openPoll() {
  const now = new Date();
  const pollId = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmm');

  // คำนวณเวลาปิด (ชั่วโมงถัดไป 09:00)
  const closeTime = getCloseTime(now);

  // บันทึกสถานะโพลใน Sheet
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const statusSheet = ss.getSheetByName('PollStatus');
  statusSheet.appendRow([pollId, now, closeTime, 'open']);

  // ส่ง Flex Message ไปกลุ่ม
  const flex = buildOpenPollFlex(pollId, Utilities.formatDate(closeTime, 'Asia/Bangkok', 'HH:mm'));
  const targetId = getActiveGroupId();
  pushMessage(targetId, [flex]);

  Logger.log(`Poll ${pollId} opened`);
}

function closePoll() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // หา poll ล่าสุดที่ยัง open
  const statusSheet = ss.getSheetByName('PollStatus');
  const data = statusSheet.getDataRange().getValues();
  let latestPollId = null;
  let latestRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === 'open') {
      latestPollId = data[i][0];
      latestRow = i + 1;
    }
  }
  if (!latestPollId) return;

  // ดึงออเดอร์ทั้งหมดของ poll นี้
  const orderSheet = ss.getSheetByName('Orders');
  const orders = orderSheet.getDataRange().getValues();
  const summary = {};
  let totalCount = 0;

  const itemLabels = {
    americano_iced: 'อเมริกาโน่ เย็น',
    latte_iced: 'ลาเต้ เย็น',
    matcha_latte: 'มัทฉะ ลาเต้',
    thai_tea: 'ชาไทย',
  };

  const sweetLabels = { normal: 'หวานปกติ', less: 'หวานน้อย', no: 'ไม่หวาน', extra: 'หวานมาก' };

  orders.forEach(row => {
    // โครงสร้าง (จาก saveOrder): 0=PollID, 1=Date, 2=UserID, 3=UserName, 4=Item, 5=Sweetness, 6=CustomText
    if (row[0] && row[0] == latestPollId) {
      const item = row[4];
      if (!item || item === 'none') return; // ข้ามคนที่ไม่สั่ง

      let detailName = '';
      if (item === 'custom') {
        // ออเดอร์แบบพิมพ์สั่งเอง
        detailName = `📝 ${row[6]}`;
      } else {
        // ออเดอร์จากปุ่ม
        const label = itemLabels[item] || item;
        const sweet = sweetLabels[row[5]] ? `(${sweetLabels[row[5]]})` : '';
        detailName = `☕ ${label} ${sweet}`.trim();
      }

      if (!summary[detailName]) {
        summary[detailName] = { count: 0, users: [] };
      }
      summary[detailName].count++;
      summary[detailName].users.push(row[3]);
      totalCount++;
    }
  });

  // อัพเดท status เป็น closed
  statusSheet.getRange(latestRow, 4).setValue('closed');

  // ส่งสรุปไปกลุ่ม
  const flex = buildClosePollFlex(summary, totalCount);
  const targetId = getActiveGroupId();
  pushMessage(targetId, [flex]);
}

function getCloseTime(openTime) {
  // ถ้าเปิดตอนเย็น ปิดเช้าวันถัดไป 09:00
  const close = new Date(openTime);
  close.setDate(close.getDate() + 1);
  close.setHours(9, 0, 0, 0);
  return close;
}

function pushMessage(to, messages) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = JSON.stringify({ to, messages });
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}` },
    payload
  };
  UrlFetchApp.fetch(url, options);
}