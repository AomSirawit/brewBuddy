// FlexMessage.gs

function buildOpenPollFlex(pollId, closeTime) {
  return {
    type: 'flex',
    altText: '☕ เปิดรับออเดอร์กาแฟแล้ว!',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '☕ สั่งกาแฟวันนี้',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: `ปิดรับออเดอร์ ${closeTime} น.`,
            size: 'sm',
            color: '#ffd699'
          }
        ],
        backgroundColor: '#7B4F2E',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'เมนูยอดฮิต',
            weight: 'bold',
            size: 'md',
            color: '#7B4F2E'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: buildMenuButtons(pollId)
          },
          { type: 'separator' },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '📝 พิมพ์สั่งเอง',
              data: `action=custom_order&pollId=${pollId}`,
              inputOption: 'openKeyboard',
              fillInText: 'สั่ง: '
            }
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            // 🆕 ปุ่มปิด poll สำหรับแอดมิน
            type: 'button',
            style: 'secondary',
            color: '#888888',
            action: {
              type: 'postback',
              label: '🛑 ปิดรับออเดอร์ (แอดมิน)',
              data: `action=admin_close&pollId=${pollId}`
            }
          },
          {
            type: 'text',
            text: `Poll ID: ${pollId}`,
            size: 'xxs',
            color: '#aaaaaa',
            align: 'end'
          },
          {
            type: 'text',
            text: 'brewBuddy by ITFeature',
            size: 'xxs',
            color: '#aaaaaa',
            align: 'center',
            margin: 'md'
          }
        ]
      }
    }
  };
}

function buildMenuButtons(pollId) {
  const menus = [
    { label: '☕ อเมริกาโน่ เย็น', data: 'item=americano_iced' },
    { label: '🍦 ลาเต้ เย็น', data: 'item=latte_iced' },
    { label: '🫧 มัทฉะ ลาเต้', data: 'item=matcha_latte' },
    { label: '🧋 ชาไทย', data: 'item=thai_tea' },
    { label: '💧 ไม่สั่ง', data: 'item=none' },
  ];

  return menus.map(m => ({
    type: 'button',
    style: m.data.includes('none') ? 'secondary' : 'primary',
    color: m.data.includes('none') ? undefined : '#7B4F2E',
    action: {
      type: 'postback',
      label: m.label,
      // 🆕 ส่ง pollId + item ไปให้ขั้นตอนเลือกความหวานต่อ
      data: `action=pick_sweetness&pollId=${pollId}&${m.data}`
    }
  }));
}

// 🆕 Flex สำหรับเลือกระดับความหวาน
function buildSweetnessFlex(pollId, item) {
  const levels = [
    { label: '🍬 หวานปกติ', value: 'normal' },
    { label: '🔽 หวานน้อย', value: 'less' },
    { label: '🚫 ไม่หวาน', value: 'no' },
    { label: '⬆️ หวานมาก', value: 'extra' },
  ];

  return {
    type: 'flex',
    altText: 'เลือกระดับความหวาน',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#7B4F2E',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: '🍬 เลือกระดับความหวาน', weight: 'bold', color: '#ffffff', size: 'md' },
          { type: 'text', text: `เมนู: ${item}`, color: '#ffd699', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: levels.map(l => ({
          type: 'button',
          style: 'primary',
          color: '#7B4F2E',
          action: {
            type: 'postback',
            label: l.label,
            data: `action=order&pollId=${pollId}&item=${item}&sweetness=${l.value}`
          }
        }))
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'brewBuddy by ITFeature',
            size: 'xxs',
            color: '#aaaaaa',
            align: 'center'
          }
        ]
      }
    }
  };
}

function buildClosePollFlex(summary, total) {
  const summaryLines = [];
  
  Object.entries(summary).forEach(([detail, data]) => {
    summaryLines.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: detail, flex: 3, size: 'sm', wrap: true },
        { type: 'text', text: `${data.count} แก้ว`, flex: 1, size: 'sm', align: 'end', weight: 'bold', color: '#7B4F2E' }
      ]
    });
    
    if (data.users && data.users.length > 0) {
      summaryLines.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: `👤 ${data.users.join(', ')}`, size: 'xs', color: '#888888', wrap: true }
        ]
      });
    }
  });

  return {
    type: 'flex',
    altText: '⏰ ปิดรับออเดอร์แล้ว! สรุปยอดด้านใน',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4A2C0E',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '⏰ ปิดรับออเดอร์แล้ว', weight: 'bold', size: 'xl', color: '#ffffff' },
          { type: 'text', text: 'สรุปยอดสั่งซื้อ', size: 'sm', color: '#ffd699' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'รายการกาแฟทั้งหมด', weight: 'bold', color: '#7B4F2E' },
          ...summaryLines,
          { type: 'separator' },
          {
            type: 'text',
            text: `รวม ${total} แก้ว`,
            weight: 'bold',
            size: 'md',
            align: 'end',
            color: '#7B4F2E'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'brewBuddy by ITFeature',
            size: 'xxs',
            color: '#aaaaaa',
            align: 'center'
          }
        ]
      }
    }
  };
}