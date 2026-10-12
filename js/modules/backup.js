/**
 * js/modules/backup.js
 * One-Click Full Family Backup & Restore Engine
 * Isolates Admin (Full System) vs Member (Personal Data) backups.
 */

var BackupModule = {
  getUserContext() {
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const sbData = sbKey ? JSON.parse(localStorage.getItem(sbKey)) : null;
      const userEmail = (sbData?.user?.email || '').toLowerCase();

      const pageText = document.body ? document.body.innerText : '';
      const isExplicitMember = pageText.includes('(MEMBER)') || pageText.includes('สมาชิก');
      const isExplicitAdmin = pageText.includes('(ADMIN)') || pageText.includes('ผู้ดูแล');

      const nameEl = document.querySelector('#current-user-name, .user-name, [class*="name"]');
      let rawName = (nameEl ? nameEl.textContent : '').trim();
      if (!rawName && userEmail) rawName = userEmail.split('@')[0];

      const isMemberUser = !isExplicitAdmin && (
        isExplicitMember ||
        rawName.includes('พลอย') ||
        rawName.toLowerCase().includes('ploy') ||
        userEmail.includes('ploy') ||
        userEmail.includes('member')
      );

      if (isMemberUser) {
        const cleanName = (rawName || 'member').replace(/[^a-zA-Z0-9ก-๙]/g, '_');
        return {
          isMember: true,
          userName: cleanName,
          userKey: `member_${cleanName}`
        };
      }
    } catch (e) {}

    return {
      isMember: false,
      userName: 'DAD',
      userKey: 'DAD'
    };
  },

  // 1. ฟังก์ชันส่งออกรวมทุกโมดูล
  exportFullBackup() {
    try {
      const ctx = this.getUserContext();
      const dateStr = new Date().toISOString().slice(0, 10);
      const backupPayload = {
        _metadata: {
          system: 'FamilyFinance',
          type: 'FULL_BACKUP',
          ownerRole: ctx.isMember ? 'MEMBER' : 'ADMIN',
          ownerUser: ctx.userName,
          userKey: ctx.userKey,
          exportDate: new Date().toISOString()
        },
        cashflow: null,
        portfolio: null,
        tax: {
          years: [],
          activeYear: null,
          data: {}
        },
        ledger: null
      };

      if (ctx.isMember) {
        // --- กรณี Member: เก็บเฉพาะของ Member ---
        // Cashflow
        const cfKey = `family-finance:cashflow:member:${ctx.userName}`;
        const cfData = localStorage.getItem(cfKey);
        if (cfData) backupPayload.cashflow = JSON.parse(cfData);

        // Portfolio
        const portKey = `stock-trading-log:member:${ctx.userName}`;
        const portData = localStorage.getItem(portKey);
        if (portData) backupPayload.portfolio = JSON.parse(portData);

        // Tax Planner
        const taxYearsKey = `family-finance:tax-planner:${ctx.userKey}:years`;
        const taxYears = localStorage.getItem(taxYearsKey);
        if (taxYears) backupPayload.tax.years = JSON.parse(taxYears);

        const activeYearKey = `family-finance:tax-planner:${ctx.userKey}:activeYear`;
        backupPayload.tax.activeYear = localStorage.getItem(activeYearKey) || '2026';

        (backupPayload.tax.years || ['2026', '2025']).forEach(yr => {
          const item = localStorage.getItem(`family-finance:tax-planner:${ctx.userKey}:${yr}`);
          if (item) backupPayload.tax.data[yr] = JSON.parse(item);
        });

      } else {
        // --- กรณี Admin (DAD): รวมข้อมูลทั้งหมด ---
        // Cashflow
        const cfRaw = localStorage.getItem('family-finance:cashflow:v2') 
                   || localStorage.getItem('family-finance:cashflow:v1') 
                   || localStorage.getItem('family-finance-db')
                   || localStorage.getItem('transactions');
        if (cfRaw) backupPayload.cashflow = JSON.parse(cfRaw);

        // Portfolio
        const portRaw = localStorage.getItem('stock-trading-log:v3');
        if (portRaw) backupPayload.portfolio = JSON.parse(portRaw);

        // Ledger
        const ledgerRaw = localStorage.getItem('wealthport:avg-cost-ledger:v1');
        if (ledgerRaw) backupPayload.ledger = JSON.parse(ledgerRaw);

        // Tax Planner
        const taxYears = localStorage.getItem(`family-finance:tax-planner:DAD:years`);
        if (taxYears) backupPayload.tax.years = JSON.parse(taxYears);
        backupPayload.tax.activeYear = localStorage.getItem(`family-finance:tax-planner:DAD:activeYear`) || '2026';

        (backupPayload.tax.years || ['2026', '2025']).forEach(yr => {
          const item = localStorage.getItem(`family-finance:tax-planner:DAD:${yr}`);
          if (item) backupPayload.tax.data[yr] = JSON.parse(item);
        });
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `FamilyFinance_FullBackup_${ctx.userName}_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      alert(`✅ สำรองข้อมูลทั้งหมดของ ${ctx.userName} สำเร็จแล้ว!`);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสำรองข้อมูลรวม: ' + err.message);
    }
  },

  // 2. ฟังก์ชันกู้คืนข้อมูลรวม
  importFullBackup(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const ctx = this.getUserContext();

        // 🔒 ตรวจสอบสิทธิ์เจ้าของไฟล์
        if (json._metadata) {
          const fileRole = (json._metadata.ownerRole || '').toUpperCase();
          const fileUser = json._metadata.ownerUser || '';

          if (ctx.isMember && fileRole === 'ADMIN') {
            alert(`⚠️ ไม่อนุญาตให้นำเข้า!\nไฟล์นี้เป็นข้อมูลสำรองของแอดมิน (${fileUser || 'DAD'}) ไม่สามารถนำเข้าสู่บัญชีสมาชิกได้`);
            inputEl.value = '';
            return;
          }

          if (!ctx.isMember && fileRole === 'MEMBER') {
            const confirmAdmin = confirm(`⚠️ คำเตือน: ไฟล์นี้เป็นข้อมูลสำรองของสมาชิก (${fileUser})\nคุณต้องการกู้คืนข้อมูลนี้ทับบัญชีของคุณหรือไม่?`);
            if (!confirmAdmin) {
              inputEl.value = '';
              return;
            }
          }
        }

        const confirmRestore = confirm(`⚠️ ยืนยันการกู้คืนข้อมูลทั้งหมดของ "${ctx.userName}"?\nการดำเนินการนี้จะเขียนทับข้อมูล Cashflow, Portfolio และ Tax เดิมในระบบ`);
        if (!confirmRestore) {
          inputEl.value = '';
          return;
        }

        if (ctx.isMember) {
          // --- Restore ให้ Member ---
          if (json.cashflow) {
            localStorage.setItem(`family-finance:cashflow:member:${ctx.userName}`, JSON.stringify(json.cashflow));
          }
          if (json.portfolio) {
            localStorage.setItem(`stock-trading-log:member:${ctx.userName}`, JSON.stringify(json.portfolio));
          }
          if (json.tax) {
            if (json.tax.years) localStorage.setItem(`family-finance:tax-planner:${ctx.userKey}:years`, JSON.stringify(json.tax.years));
            if (json.tax.activeYear) localStorage.setItem(`family-finance:tax-planner:${ctx.userKey}:activeYear`, json.tax.activeYear);
            if (json.tax.data) {
              Object.keys(json.tax.data).forEach(yr => {
                localStorage.setItem(`family-finance:tax-planner:${ctx.userKey}:${yr}`, JSON.stringify(json.tax.data[yr]));
              });
            }
          }
        } else {
          // --- Restore ให้ Admin (DAD) ---
          if (json.cashflow) {
            localStorage.setItem('family-finance:cashflow:v2', JSON.stringify(json.cashflow));
          }
          if (json.portfolio) {
            localStorage.setItem('stock-trading-log:v3', JSON.stringify(json.portfolio));
          }
          if (json.ledger) {
            localStorage.setItem('wealthport:avg-cost-ledger:v1', JSON.stringify(json.ledger));
          }
          if (json.tax) {
            if (json.tax.years) localStorage.setItem('family-finance:tax-planner:DAD:years', JSON.stringify(json.tax.years));
            if (json.tax.activeYear) localStorage.setItem('family-finance:tax-planner:DAD:activeYear', json.tax.activeYear);
            if (json.tax.data) {
              Object.keys(json.tax.data).forEach(yr => {
                localStorage.setItem(`family-finance:tax-planner:DAD:${yr}`, JSON.stringify(json.tax.data[yr]));
              });
            }
          }
        }

        alert('🎉 กู้คืนข้อมูลทั้งระบบเรียบร้อยแล้ว! ระบบจะรีเฟรชหน้าเว็บเพื่ออัปเดตข้อมูล');
        inputEl.value = '';
        location.reload();
      } catch (err) {
        alert('รูปแบบไฟล์ JSON สำรองไม่ถูกต้อง: ' + err.message);
        inputEl.value = '';
      }
    };
    reader.readAsText(file);
  },

  // 3. แสดง Modal สวยงามสำหรับจัดการ Backup
  openBackupModal() {
    const modalId = "family-backup-modal";
    document.getElementById(modalId)?.remove();

    const ctx = this.getUserContext();

    const modalHtml = `
      <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: #ffffff; border-radius: 16px; width: 500px; max-width: 95vw; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">📦 สำรองและกู้คืนข้อมูลรวมทั้งระบบ</h3>
              <span style="font-size: 12px; color: #64748b;">บัญชีปัจจุบัน: <strong>${ctx.userName}</strong> (${ctx.isMember ? 'สมาชิก MEMBER' : 'ผู้ดูแล ADMIN'})</span>
            </div>
            <button id="btn-close-backup-modal" style="background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>

          <div style="padding: 22px; display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px;">
              <div style="font-weight: 700; font-size: 13.5px; color: #0369a1; margin-bottom: 4px;">📤 สำรองข้อมูลทั้งหมด (One-Click Backup)</div>
              <div style="font-size: 12px; color: #475569; margin-bottom: 12px; line-height: 1.4;">
                ดาวน์โหลดข้อมูลทุกโมดูล (รายรับรายจ่าย + พอร์ตลงทุน + วางแผนภาษี) รวมเป็นไฟล์ JSON ไฟล์เดียว
              </div>
              <button id="btn-run-full-export" style="background: #0284c7; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%;">
                📥 ดาวน์โหลดไฟล์สำรองข้อมูลรวม
              </button>
            </div>

            <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 14px;">
              <div style="font-weight: 700; font-size: 13.5px; color: #854d0e; margin-bottom: 4px;">📥 กู้คืนข้อมูลทั้งหมด (One-Click Restore)</div>
              <div style="font-size: 12px; color: #713f12; margin-bottom: 12px; line-height: 1.4;">
                เลือกไฟล์ Backup รวม เพื่อนำข้อมูลทั้งหมดกลับคืนสู่ระบบในครั้งเดียว (มีระบบตรวจสิทธิ์เจ้าของไฟล์)
              </div>
              <label style="display: block; text-align: center; background: #eab308; color: #000; padding: 9px 18px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer;">
                📂 เลือกไฟล์ JSON เพื่อกู้คืน
                <input type="file" id="full-backup-file-input" accept=".json" style="display: none;">
              </label>
            </div>
          </div>

          <div style="padding: 12px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end;">
            <button id="btn-close-backup-modal-bottom" style="background: #fff; border: 1px solid #cbd5e1; color: #475569; padding: 7px 16px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeModal = () => document.getElementById(modalId)?.remove();
    document.getElementById('btn-close-backup-modal').onclick = closeModal;
    document.getElementById('btn-close-backup-modal-bottom').onclick = closeModal;

    document.getElementById('btn-run-full-export').onclick = () => this.exportFullBackup();
    document.getElementById('full-backup-file-input').onchange = (e) => this.importFullBackup(e.target);
  }
};

window.BackupModule = BackupModule;