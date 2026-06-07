function openPoll(groupId) {  // ← รับ groupId เป็น parameter
  const now = new Date();
  const pollId = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmm');
  const closeTime = getCloseTime(now);

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const statusSheet = ss.getSheetByName('PollStatus');
  statusSheet.appendRow([pollId, now, closeTime, 'open', groupId]);  // ← เพิ่ม groupId ใน row

  const flex = buildOpenPollFlex(pollId, Utilities.formatDate(closeTime, 'Asia/Bangkok', 'HH:mm'));
  pushMessage(groupId, [flex]);  // ← ใช้ groupId ที่รับมาเลย ไม่ต้อง getActiveGroupId()

  Logger.log(`Poll ${pollId} opened for group ${groupId}`);
}

function closePoll(pollId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // หา poll ที่ตรงกับ pollId และยัง open
  const statusSheet = ss.getSheetByName('PollStatus');
  const data = statusSheet.getDataRange().getValues();
  let targetRow = -1;
  let targetGroupId = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == pollId && data[i][3] === 'open') {
      targetRow = i + 1;
      targetGroupId = data[i][4];  // ← column ที่ 5 คือ groupId
    }
  }
  if (targetRow === -1) return;

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
    if (row[0] && row[0] == pollId) {
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
  statusSheet.getRange(targetRow, 4).setValue('closed');

  // ส่งสรุปไปกลุ่มที่เปิด poll
  const flex = buildClosePollFlex(summary, totalCount);
  pushMessage(targetGroupId, [flex]);
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
  Logger.log('Payload: ' + payload);

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}` },
    payload,
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);

  // Log ดู error จริงๆ
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Body: ' + response.getContentText());
}

function debugGroupId() {
  const id = getActiveGroupId();
  Logger.log('ID: ' + id);
  Logger.log('Length: ' + (id ? id.length : 'null'));
}

function checkProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  Logger.log(JSON.stringify(props));
}

function fixGroupId() {
  const correctId = 'C...'; // ← วาง Group ID ที่ได้จาก Step 3
  PropertiesService.getScriptProperties().setProperty('SAVED_GROUP_ID', correctId);
  Logger.log('Saved: ' + correctId + ' (length: ' + correctId.length + ')');
}
