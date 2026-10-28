/**
 * js/modules/backup.js
 * One-Click Full System Backup & Restore Module
 * Handles cross-module data aggregation (Cashflow, Portfolio, Tax, Categories, Accounts)
 * with strict role-based isolation (ADMIN vs MEMBER).
 */

(function () {
  const BackupModule = {
    // ดึงข้อมูลตัวตนและบทบาทของผู้ใช้ปัจจุบัน
    async getUserContext() {
      let role = 'member';
      let name = 'member';

      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session && session.user) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('role, full_name, email')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              role = profile.role || 'member';
              name = profile.full_name || (session.user.email ? session.user.email.split('@')[0] : 'member');
            }
          }
        } catch (e) {
          console.warn('BackupModule: Could not fetch user context from Supabase', e);
        }
      }

      return {
        role,
        name,
        isDad: role === 'admin'
      };
    },

    // แสดง Modal สำรอง / กู้คืนข้อมูล
    async openBackupModal() {
      const user = await this.getUserContext();
      let modal = document.getElementById('fullBackupModal');

      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fullBackupModal';
        modal.style.cssText = `
          display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;
          padding: 16px; font-family: 'Sarabun', sans-serif;
        `;

        modal.innerHTML = `
          <div style="background: #ffffff; width: 100%; max-width: 520px; border-radius: 16px; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); text-align: left; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                  📦 สำรองและกู้คืนข้อมูลรวมทั้งระบบ
                </h3>
                <div id="backupModalUserBadge" style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600;">
                  บัญชีปัจจุบัน: <strong style="color: #0284c7;">${user.name}</strong> (${user.isDad ? 'ผู้ดูแล ADMIN' : 'สมาชิก MEMBER'})
                </div>
              </div>
              <button onclick="window.BackupModule.closeBackupModal()" style="background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; padding: 4px;">✕</button>
            </div>

            <!-- กล่องที่ 1: การสำรองข้อมูล (Export) -->
            <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
              <div style="font-weight: 700; color: #0369a1; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                📥 สำรองข้อมูลทั้งหมด (One-Click Backup)
              </div>
              <div style="font-size: 12px; color: #475569; margin-bottom: 12px; line-height: 1.5;">
                ดาวน์โหลดข้อมูลทุกโมดูล (รายรับรายจ่าย + พอร์ตลงทุน + ภาษี + หมวดหมู่และบัญชี + บิลประจำ) รวมเป็นไฟล์ JSON ไฟล์เดียว
              </div>
              <button onclick="window.BackupModule.exportFullBackup()" style="width: 100%; background: #0284c7; color: #ffffff; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                📥 ดาวน์โหลดไฟล์สำรองข้อมูลรวม
              </button>
            </div>

            <!-- กล่องที่ 2: การกู้คืนข้อมูล (Restore) -->
            <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 18px; margin-bottom: 18px;">
              <div style="font-weight: 700; color: #b45309; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                📤 กู้คืนข้อมูลทั้งหมด (One-Click Restore)
              </div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">
                เลือกไฟล์ Backup รวม เพื่อนำข้อมูลทั้งหมดกลับคืนสู่ระบบในครั้งเดียว (มีระบบตรวจสิทธิ์เจ้าของไฟล์)
              </div>
              <input type="file" id="inputFullBackupFile" accept=".json" style="display: none;" onchange="window.BackupModule.handleFileSelect(event)">
              <button onclick="document.getElementById('inputFullBackupFile').click()" style="width: 100%; background: #d97706; color: #ffffff; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                📂 เลือกไฟล์ JSON เพื่อกู้คืน
              </button>
            </div>

            <div style="text-align: right;">
              <button onclick="window.BackupModule.closeBackupModal()" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 7px 18px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer;">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      } else {
        const badge = document.getElementById('backupModalUserBadge');
        if (badge) {
          badge.innerHTML = `บัญชีปัจจุบัน: <strong style="color: #0284c7;">${user.name}</strong> (${user.isDad ? 'ผู้ดูแล ADMIN' : 'สมาชิก MEMBER'})`;
        }
        modal.style.display = 'flex';
      }
    },

    closeBackupModal() {
      const modal = document.getElementById('fullBackupModal');
      if (modal) modal.style.display = 'none';
      const fileInput = document.getElementById('inputFullBackupFile');
      if (fileInput) fileInput.value = '';
    },

    // รวบรวมข้อมูลทุกโมดูลแล้วดาวน์โหลดไฟล์ JSON
    async exportFullBackup() {
      const user = await this.getUserContext();
      const isDad = user.isDad;
      const safeUsername = (user.name || 'member').toLowerCase().replace(/\s+/g, '_');

      // 1. ดึง Cashflow (คีย์มาตรฐานชื่อเดียวทุกบทบาท DataScope แยกเจ้าของให้เอง)
      const cashflowKey = 'family-finance:cashflow:v2';
      let cashflowData = null;
      try {
        cashflowData = JSON.parse(localStorage.getItem(cashflowKey) || 'null');
      } catch (e) {}

      // 2. ดึง Portfolio
      const portKey = 'stock-trading-log:v3';
      let portfolioData = null;
      try {
        portfolioData = JSON.parse(localStorage.getItem(portKey) || 'null');
      } catch (e) {}

      // 3. ดึง Tax Planner
      const taxPrefix = isDad ? 'family-finance:tax-planner:DAD' : `family-finance:tax-planner:member_${safeUsername}`;
      const taxData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(taxPrefix)) {
          // เก็บในไฟล์สำรองเฉพาะชื่อคีย์ logical (ไม่เอา #u<uid> ที่ต่อท้ายของเครื่องนี้)
          const logicalKey = key.split('#u')[0];
          try {
            taxData[logicalKey] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            taxData[logicalKey] = localStorage.getItem(key);
          }
        }
      }

      // 4. ดึง Categories & Accounts (ข้อมูลร่วมของบ้าน ใช้คีย์เดียวกันทุกบทบาท)
      const catKey = 'family-finance:categories:v1';
      const accKey = 'family-finance:master-accounts:v1';
      let categoriesData = null;
      let accountsData = null;
      try {
        categoriesData = JSON.parse(localStorage.getItem(catKey) || 'null');
        accountsData = JSON.parse(localStorage.getItem(accKey) || 'null');
      } catch (e) {}

      // 5. ดึง Bill schedules (ข้อมูลส่วนตัวของแต่ละบัญชี)
      const billKey = 'family-finance:bill-schedules';
      let billData = null;
      try {
        billData = JSON.parse(localStorage.getItem(billKey) || 'null');
      } catch (e) {}

      const backupPayload = {
        _metadata: {
          appName: 'FamilyFinance',
          type: 'FULL_BACKUP',
          version: '1.1',
          exportedAt: new Date().toISOString(),
          ownerRole: isDad ? 'ADMIN' : 'MEMBER',
          ownerName: user.name
        },
        cashflow: cashflowData,
        portfolio: portfolioData,
        tax: taxData,
        categories: categoriesData,
        accounts: accountsData,
        billSchedules: billData
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const rolePrefix = isDad ? 'DAD' : safeUsername;
      const fileName = `FamilyFinance_FullBackup_${rolePrefix}_${dateStr}.json`;

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // รับไฟล์ที่ผู้ใช้เลือกมาตรวจสอบ
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          await this.restoreFullBackup(parsed);
        } catch (err) {
          alert('❌ ไฟล์ไม่ถูกต้องหรือไม่ใช่รูปแบบ JSON ที่สมบูรณ์');
        }
      };
      reader.readAsText(file);
    },

    // ตรวจสอบสิทธิ์ความปลอดภัยและนำเข้าข้อมูล
    async restoreFullBackup(data) {
      if (!data || !data._metadata || data._metadata.type !== 'FULL_BACKUP') {
        alert('⚠️ ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลรวมของระบบ Family Finance');
        return;
      }

      const currentUser = await this.getUserContext();
      const currentIsDad = currentUser.isDad;
      const safeUsername = (currentUser.name || 'member').toLowerCase().replace(/\s+/g, '_');
      const backupRole = data._metadata.ownerRole || 'MEMBER';
      const backupOwnerName = data._metadata.ownerName || 'ไม่ระบุ';

      // Security Constraint: สมาชิกห้ามนำเข้าข้อมูลของแอดมิน
      if (!currentIsDad && backupRole === 'ADMIN') {
        alert('⚠️ ไม่อนุญาตให้นำเข้า! ไฟล์นี้เป็นข้อมูลสำรองของแอดมิน (DAD) ไม่สามารถนำเข้าสู่บัญชีสมาชิกได้ เพื่อป้องกันข้อมูลการเงินปะปนกัน');
        return;
      }

      const confirmMsg = `ยืนยันการกู้คืนข้อมูลรวมทั้งระบบ?\n` +
        `- เจ้าของไฟล์: ${backupOwnerName} (${backupRole})\n` +
        `- วันที่สำรอง: ${new Date(data._metadata.exportedAt).toLocaleString('th-TH')}\n\n` +
        `⚠️ ข้อมูลเดิมของบัญชีปัจจุบัน (${currentUser.name}) จะถูกเขียนทับด้วยข้อมูลในไฟล์นี้`;

      if (!confirm(confirmMsg)) return;

      try {
        // 1. กู้คืน Cashflow (เขียนลงซองของบัญชีที่ล็อกอินอยู่)
        const cashflowKey = 'family-finance:cashflow:v2';
        if (data.cashflow) {
          localStorage.setItem(cashflowKey, JSON.stringify(data.cashflow));
        }

        // 2. กู้คืน Portfolio
        const portKey = 'stock-trading-log:v3';
        if (data.portfolio) {
          localStorage.setItem(portKey, JSON.stringify(data.portfolio));
        }

        // 3. กู้คืน Tax Planner
        const currentTaxPrefix = currentIsDad ? 'family-finance:tax-planner:DAD' : `family-finance:tax-planner:member_${safeUsername}`;
        if (data.tax && typeof data.tax === 'object') {
          // ลบ tax เดิมของตนเองก่อน
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(currentTaxPrefix)) keysToRemove.push(k);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));

          // เขียน tax ใหม่ (ตัด #u<uid> จากไฟล์เก่าออก แล้วให้ DataScope ใส่อันของผู้ใช้ปัจจุบัน)
          Object.keys(data.tax).forEach(exportedKey => {
            const oldKey = exportedKey.split('#u')[0];
            let newKey = oldKey;
            if (oldKey.includes(':DAD:')) {
              newKey = oldKey.replace(':DAD:', currentIsDad ? ':DAD:' : `:member_${safeUsername}:`);
            } else if (oldKey.includes(':member_')) {
              newKey = oldKey.replace(/:member_[^:]+:/, currentIsDad ? ':DAD:' : `:member_${safeUsername}:`);
            }
            const val = typeof data.tax[exportedKey] === 'string' ? data.tax[exportedKey] : JSON.stringify(data.tax[exportedKey]);
            localStorage.setItem(newKey, val);
          });
        }

        // 4. กู้คืน Categories & Accounts (ข้อมูลร่วมของบ้าน)
        const catKey = 'family-finance:categories:v1';
        const accKey = 'family-finance:master-accounts:v1';

        if (data.categories) {
          localStorage.setItem(catKey, JSON.stringify(data.categories));
        }
        if (data.accounts) {
          localStorage.setItem(accKey, JSON.stringify(data.accounts));
        }

        // 5. กู้คืน Bill schedules (ไฟล์เก่าที่ยังไม่มีส่วนนี้ = ข้าม ไม่ใช่ล้างค่าที่มีอยู่)
        if (data.billSchedules) {
          localStorage.setItem('family-finance:bill-schedules', JSON.stringify(data.billSchedules));
        }

        // ดันข้อมูลขึ้น Cloud ก่อน reload เพื่อไม่ให้ pullFromCloud เขียนข้อมูลเก่าทับ
        try {
          if (typeof CloudSync !== 'undefined' && typeof CloudSync.pushToCloud === 'function') {
            await CloudSync.pushToCloud();
          }
        } catch (e) {}

        alert('✅ กู้คืนข้อมูลรวมทั้งระบบสำเร็จ! ระบบจะรีเฟรชหน้าเว็บเพื่อปรับปรุงข้อมูล');
        window.location.reload();
      } catch (err) {
        alert('❌ เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + err.message);
      }
    }
  };

  window.BackupModule = BackupModule;
})();