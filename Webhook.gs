// Webhook.gs

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK');
    }

    const body = JSON.parse(e.postData.contents);

    if (body.events && body.events.length > 0) {
      const replyToken = body.events[0].replyToken;
      if (
        replyToken === '00000000000000000000000000000000' ||
        replyToken === 'ffffffffffffffffffffffffffffffff'
      ) {
        return ContentService.createTextOutput('OK');
      }
      body.events.forEach(event => handleEvent(event));
    }

  } catch (error) {
    console.log('Webhook Error:', error);
  }

  return ContentService.createTextOutput('OK');
}

function handleEvent(event) {

  // ── JOIN ──────────────────────────────────────────────────────────────
  if (event.type === 'join') {
    const groupId = event.source.groupId;
    if (groupId) {
      PropertiesService.getScriptProperties().setProperty('SAVED_GROUP_ID', groupId);
      replyText(event.replyToken, '✅ บอทเข้ามาแล้ว! บันทึก Group ID เรียบร้อยครับ');
    }
    return;
  }

  // ── POSTBACK ──────────────────────────────────────────────────────────
  if (event.type === 'postback') {
    const params = Object.fromEntries(
      event.postback.data.split('&').map(p => p.split('='))
    );

    // 🆕 ปุ่มปิด poll จาก Flex (เฉพาะแอดมิน) ดักไว้บนสุดก่อน
    if (params.action === 'admin_close') {
      if (!isPollOpen(params.pollId)) {
        replyText(event.replyToken, '🛑 รอบนี้ถูกปิดรับออเดอร์ไปแล้วครับ');
        return;
      }
      closePoll();
      replyText(event.replyToken, '🛑 ปิดรับออเดอร์แล้ว กำลังสรุปยอดครับ...');
      return;
    }

    // 🆕 ตรวจสอบว่าโพลนี้ปิดไปหรือยัง ถ้าปิดไปแล้วให้หยุดการทำงาน (สำหรับคำสั่งสั่งกาแฟ)
    if (params.pollId) {
      if (!isPollOpen(params.pollId)) {
        replyText(event.replyToken, '❌ ขออภัย ปิดรับออเดอร์รอบนี้ไปแล้วครับ ไม่สามารถทำรายการได้');
        return;
      }
    }

    // ขั้นที่ 1: เลือกเมนู → แสดง Flex ความหวาน (ยกเว้น none)
    if (params.action === 'pick_sweetness') {
      if (params.item === 'none') {
        saveOrder(event, { ...params, sweetness: '-' });
        replyText(event.replyToken, '✅ บันทึกแล้ว: ไม่สั่งกาแฟวันนี้');
      } else {
        const flex = buildSweetnessFlex(params.pollId, params.item);
        replyFlex(event.replyToken, flex);
      }
      return;
    }

    // ขั้นที่ 2: เลือกความหวาน → บันทึกออเดอร์
    if (params.action === 'order') {
      saveOrder(event, params);
      const sweetLabel = { normal: 'หวานปกติ', less: 'หวานน้อย', no: 'ไม่หวาน', extra: 'หวานมาก' };
      const sweet = sweetLabel[params.sweetness] || params.sweetness;

      const itemLabels = { americano_iced: 'อเมริกาโน่ เย็น', latte_iced: 'ลาเต้ เย็น', matcha_latte: 'มัทฉะ ลาเต้', thai_tea: 'ชาไทย' };
      const itemTh = itemLabels[params.item] || params.item;

      replyText(event.replyToken, `✅ รับออเดอร์ ${itemTh} (${sweet}) แล้วนะ!`);
      return;
    }

    // พิมพ์สั่งเอง
    if (params.action === 'custom_order') {
      setUserState(event.source.userId, 'waiting_order', params.pollId);
      replyText(event.replyToken, '📝 พิมพ์ออเดอร์เลยนะ เช่น "ลาเต้ เย็น หวานน้อย"');
      return;
    }

    return;
  }

  // ── MESSAGE ──────────────────────────────────────────────────────────
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    if (text === CONFIG.ADMIN_PASSWORD) {
      openPoll();
      replyText(event.replyToken, '✅ เปิดรับออเดอร์กาแฟแล้ว!');
      return;
    }

    // รับ custom order
    const state = getUserState(event.source.userId);
    if (state && state.status === 'waiting_order') {
      // 🆕 ตรวจสอบว่าโพลเปิดอยู่หรือไม่
      if (!isPollOpen(state.pollId)) {
        clearUserState(event.source.userId);
        replyText(event.replyToken, '❌ ขออภัย ปิดรับออเดอร์รอบนี้ไปแล้วครับ');
        return;
      }

      saveCustomOrder(event, state.pollId);
      clearUserState(event.source.userId);
      replyText(event.replyToken, `✅ บันทึกออเดอร์แล้ว: "${event.message.text}"`);
      return;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
function isPollOpen(pollId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const statusSheet = ss.getSheetByName('PollStatus');
  const data = statusSheet.getDataRange().getValues();
  // วนลูปจากล่างขึ้นบนเพื่อให้เจอโพลล่าสุดเร็วที่สุด
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == pollId) {
      return data[i][3] === 'open';
    }
  }
  return false; // หากไม่เจอ ถือว่าปิดแล้ว
}

function replyText(replyToken, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}` },
    payload: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });
}

// 🆕 reply ด้วย Flex Message
function replyFlex(replyToken, flexMessage) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}` },
    payload: JSON.stringify({
      replyToken,
      messages: [flexMessage]
    })
  });
}

function saveOrder(event, params) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Orders');
  const userId = event.source.userId;
  const userName = getUserDisplayName(userId);
  // PollID | Timestamp | UserID | UserName | Item | Sweetness | CustomText
  sheet.appendRow([params.pollId, new Date(), userId, userName, params.item, params.sweetness || '-', '']);
}

function saveCustomOrder(event, pollId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Orders');
  const userId = event.source.userId;
  const userName = getUserDisplayName(userId);
  const orderText = event.message.text.replace('สั่ง: ', '').trim();
  // PollID | Timestamp | UserID | UserName | Item | Sweetness | CustomText
  sheet.appendRow([pollId, new Date(), userId, userName, 'custom', '-', orderText]);
}

function setUserState(userId, status, pollId) {
  const cache = CacheService.getScriptCache();
  cache.put(userId, JSON.stringify({ status, pollId }), 300);
}

function getUserState(userId) {
  const cache = CacheService.getScriptCache();
  const data = cache.get(userId);
  return data ? JSON.parse(data) : null;
}

function clearUserState(userId) {
  CacheService.getScriptCache().remove(userId);
}

function getUserDisplayName(userId) {
  try {
    const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}` }
    });
    return JSON.parse(res.getContentText()).displayName;
  } catch (_) {
    return 'เพื่อนในกลุ่ม (ยังไม่แอดบอท)';
  }
}

function getActiveGroupId() {
  const propId = PropertiesService.getScriptProperties().getProperty('SAVED_GROUP_ID');
  return propId || CONFIG.GROUP_ID;
}