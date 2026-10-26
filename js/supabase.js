// js/supabase.js
const SUPABASE_URL = 'https://kluefrvavvyhtswsvxee.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KHfOsEWDCW6RyV-Mbx_v6w_pyUtOR03';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// โหมด: 'signin' | 'signup' | 'forgot' | 'reset'
let authMode = 'signin';

document.addEventListener('DOMContentLoaded', async () => {
  checkUserSession();
  listenToPasswordReset();
});

// ตรวจสอบเมื่อผู้ใช้คลิกลิงก์จากอีเมลกลับมาตั้งรหัสผ่านใหม่
function listenToPasswordReset() {
  if (!supabaseClient) return;
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      const modal = document.getElementById('authModal');
      if (modal) modal.style.display = 'flex';
      switchAuthMode('reset');
    }
  });
}

async function checkUserSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const modal = document.getElementById('authModal');
  
  if (!session) {
    if (modal && authMode !== 'reset') modal.style.display = 'flex';
  } else {
    if (modal && authMode !== 'reset') modal.style.display = 'none';
    applyUserPermissions(session.user);
  }
}

// สลับโหมดการทำงานของ Modal
function switchAuthMode(mode) {
  authMode = mode;
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleLink = document.getElementById('toggleAuthMode');
  const errBox = document.getElementById('authError');
  
  const nameGroup = document.getElementById('authNameGroup');
  const emailGroup = document.getElementById('authEmailGroup');
  const passGroup = document.getElementById('authPasswordGroup');
  const passLabel = document.getElementById('authPasswordLabel');
  const forgotBtn = document.getElementById('btnForgotPassword');

  if (errBox) errBox.style.display = 'none';

  if (mode === 'signup') {
    if (title) title.innerText = 'สมัครสมาชิกใหม่';
    if (subtitle) subtitle.innerText = 'สร้างบัญชีเพื่อเข้าใช้งาน Family Finance';
    if (submitBtn) submitBtn.innerText = 'ลงทะเบียน';
    if (toggleLink) toggleLink.innerText = 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ';
    if (nameGroup) nameGroup.style.display = 'block';
    if (emailGroup) emailGroup.style.display = 'block';
    if (passGroup) passGroup.style.display = 'block';
    if (passLabel) passLabel.innerText = 'รหัสผ่าน';
    if (forgotBtn) forgotBtn.style.display = 'none';
  } else if (mode === 'forgot') {
    if (title) title.innerText = 'ลืมรหัสผ่าน';
    if (subtitle) subtitle.innerText = 'กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล';
    if (submitBtn) submitBtn.innerText = 'ส่งลิงก์รีเซ็ตรหัสผ่าน';
    if (toggleLink) toggleLink.innerText = '← กลับไปหน้าเข้าสู่ระบบ';
    if (nameGroup) nameGroup.style.display = 'none';
    if (emailGroup) emailGroup.style.display = 'block';
    if (passGroup) passGroup.style.display = 'none';
    if (forgotBtn) forgotBtn.style.display = 'none';
  } else if (mode === 'reset') {
    if (title) title.innerText = 'ตั้งรหัสผ่านใหม่';
    if (subtitle) subtitle.innerText = 'กรุณาระบุรหัสผ่านใหม่ที่คุณต้องการใช้งาน';
    if (submitBtn) submitBtn.innerText = '💾 บันทึกรหัสผ่านใหม่';
    if (toggleLink) toggleLink.innerText = '';
    if (nameGroup) nameGroup.style.display = 'none';
    if (emailGroup) emailGroup.style.display = 'none';
    if (passGroup) passGroup.style.display = 'block';
    if (passLabel) passLabel.innerText = 'รหัสผ่านใหม่';
    if (forgotBtn) forgotBtn.style.display = 'none';
  } else {
    // signin
    if (title) title.innerText = 'เข้าสู่ระบบ';
    if (subtitle) subtitle.innerText = 'Family Finance เข้าถึงข้อมูลพอร์ตและการเงิน';
    if (submitBtn) submitBtn.innerText = 'เข้าสู่ระบบ';
    if (toggleLink) toggleLink.innerText = 'ยังไม่มีบัญชี? สมัครสมาชิกใหม่';
    if (nameGroup) nameGroup.style.display = 'none';
    if (emailGroup) emailGroup.style.display = 'block';
    if (passGroup) passGroup.style.display = 'block';
    if (passLabel) passLabel.innerText = 'รหัสผ่าน';
    if (forgotBtn) forgotBtn.style.display = 'inline';
  }
}

function toggleAuthModeAction() {
  if (authMode === 'signin') {
    switchAuthMode('signup');
  } else {
    switchAuthMode('signin');
  }
}

// ฟังก์ชันส่งฟอร์มตามโหมดต่างๆ
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const fullName = document.getElementById('authFullName')?.value.trim();
  const errBox = document.getElementById('authError');
  const btn = document.getElementById('authSubmitBtn');

  if (errBox) errBox.style.display = 'none';
  btn.disabled = true;
  const originalText = btn.innerText;
  btn.innerText = 'กำลังดำเนินการ...';

  try {
    if (authMode === 'signup') {
      if (!fullName) throw new Error('กรุณากรอกชื่อที่ใช้เรียก');
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      alert('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
      switchAuthMode('signin');

    } else if (authMode === 'forgot') {
      if (!email) throw new Error('กรุณากรอกอีเมล');
      
      // ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      alert(`ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมล ${email} เรียบร้อยแล้ว กรุณาตรวจสอบในกล่องข้อความหรืออีเมลขยะ`);
      switchAuthMode('signin');

    } else if (authMode === 'reset') {
      if (!password || password.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      
      // อัปเดตรหัสผ่านใหม่
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      alert('เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว! กำลังเข้าสู่ระบบ...');
      window.location.href = 'index.html';

    } else {
      // signin
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      document.getElementById('authModal').style.display = 'none';
      location.reload();
    }
  } catch (err) {
    if (errBox) {
      errBox.innerText = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      errBox.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

async function applyUserPermissions(user) {
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'member';
  const displayName = profile?.full_name || user.email;

  const profileNav = document.getElementById('userProfileNav');
  const emailText = document.getElementById('navUserEmail');
  const roleBadge = document.getElementById('navUserRole');

  if (profileNav) profileNav.style.display = 'flex';
  if (emailText) emailText.innerText = displayName;
  if (roleBadge) {
    roleBadge.innerText = role === 'admin' ? '🛡️ ผู้ดูแล (ADMIN)' : '👤 สมาชิก (MEMBER)';
  }

  const updateDashboardHeader = () => {
    const titleEl = document.getElementById('dashboardTitle');
    if (titleEl) {
      titleEl.innerText = role === 'admin' 
        ? `พอร์ตภาพรวมครอบครัว (${displayName})` 
        : `พอร์ตส่วนตัวของ ${displayName}`;
    }
  };

  updateDashboardHeader();
  setTimeout(updateDashboardHeader, 300);

  // CashFlowModule อ่านข้อมูลตามสิทธิ์ผู้ใช้ ซึ่งช่วงโหลดหน้าแรก auth ยังไม่พร้อม
  // ทำให้ render ครั้งแรกอาจอ่านผิดคีย์ ให้วาดใหม่เมื่อระบุตัวตนเสร็จแล้ว
  if (typeof CashFlowModule !== 'undefined' && typeof CashFlowModule.render === 'function') {
    try { CashFlowModule.render(); } catch (e) {}
  }
}

async function handleSignOut() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert('เกิดข้อผิดพลาดในการออกจากระบบ: ' + error.message);
  } else {
    window.location.href = 'index.html';
  }
}

// ==========================================
// Cloud Data Sync Engine (PC ↔ iPad / Mobile)
// ==========================================

const CloudSync = {
  // โหมด Local: เมื่อรันบน 127.0.0.1 / localhost ให้ใช้ localStorage อย่างเดียว
  // ปิดทั้ง pull และ push เพื่อไม่ให้การทดสอบในเครื่องไปแก้ข้อมูลบน Cloud
  // เปลี่ยนค่าเป็น false เมื่อพร้อมให้เครื่องนี้ sync กับ Cloud
  LOCAL_ONLY: ['127.0.0.1', 'localhost', '0.0.0.0'].includes(window.location.hostname),

  STORAGE_KEYS: [
    'family-finance:cashflow:v2',
    'family-finance:cashflow:member:ploy',
    'family-finance:cashflow:member:ploy1',
    'family-finance:categories:v1',
    'family-finance:credit-cards:v1',
    'family-finance:debts-contracts:v1',
    'family-finance:settings',
    'family-finance:tax-planner:DAD:2025',
    'family-finance:tax-planner:DAD:2026',
    'family-finance:tax-planner:DAD:active-year',
    'family-finance:tax-planner:DAD:years',
    'stock-trading-log:v3',
    'stock-trading-log:member:ploy',
    'wealthport:dividend-plan-models:v3',
    'wealthport:dividend-plan-pillars:v3',
    'wealthport:dividend-plan-target:v3'
  ],

  // กล่องแจ้งเตือนสถานะมุมขวาล่าง
  showSyncToast(message, isSuccess = true) {
    let toast = document.getElementById('cloudSyncToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cloudSyncToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        transform: translateY(10px);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    if (isSuccess) {
      toast.style.background = '#10B981'; // สีเขียว
      toast.style.color = '#FFFFFF';
      toast.innerText = `☁️ ${message}`;
    } else {
      toast.style.background = '#EF4444'; // สีแดง
      toast.style.color = '#FFFFFF';
      toast.innerText = `⚠️ ${message}`;
    }

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 2500);
  },

  // 1. ดึงข้อมูลจาก Cloud ลงมาใส่ LocalStorage (อัตโนมัติเมื่อเปิดเว็บ)
  async pullFromCloud() {
    if (!supabaseClient) return;
    if (this.LOCAL_ONLY) {
      console.log('[CloudSync] โหมด Local: ข้ามการดึงข้อมูลจาก Cloud (ใช้ localStorage เท่านั้น)');
      return;
    }
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const { data, error } = await supabaseClient
        .from('user_storage')
        .select('data, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.data) {
        let hasNewData = false;
        Object.entries(data.data).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
            hasNewData = true;
          }
        });

        // ถ้าเครื่องปลายทางยังไม่มีข้อมูล แล้วเพิ่งดึงมาจาก Cloud ให้รีโหลด 1 ครั้งเพื่อแสดงผล
        const isCurrentEmpty = !localStorage.getItem('stock-trading-log:v3') && !localStorage.getItem('family-finance:cashflow:v2');
        if (hasNewData && isCurrentEmpty) {
          window.location.reload();
        }
      }
    } catch (err) {
      console.warn('[CloudSync] Pull error:', err);
    }
  },

  // 2. ส่งข้อมูลทั้งหมดจากเครื่องนี้ขึ้นไปเก็บไว้บน Cloud
  async pushToCloud() {
    if (!supabaseClient) return;
    if (this.LOCAL_ONLY) {
      console.log('[CloudSync] โหมด Local: ข้ามการส่งข้อมูลขึ้น Cloud (ข้อมูลอยู่ในเครื่องเท่านั้น)');
      return;
    }
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const bundle = {};
      this.STORAGE_KEYS.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            bundle[key] = JSON.parse(raw);
          } catch (e) {
            bundle[key] = raw;
          }
        }
      });

      const { error } = await supabaseClient
        .from('user_storage')
        .upsert({
          user_id: session.user.id,
          data: bundle,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      this.showSyncToast('บันทึกขึ้น Cloud แล้ว', true);
      console.log('[CloudSync] Synced to cloud successfully');
    } catch (err) {
      this.showSyncToast('บันทึกขึ้น Cloud ไม่สำเร็จ', false);
      console.error('[CloudSync] Push error:', err);
    }
  }
};

// สั่งโหลดข้อมูลจาก Cloud ทันทีเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => CloudSync.pullFromCloud(), 300);
});

// ดักจับการเซฟข้อมูลเพื่อ Push ขึ้น Cloud อัตโนมัติ (หน่วงเวลา 1.5 วินาทีเพื่อป้องกันการยิงถี่เกินไป)
let syncTimeout = null;
window.addEventListener('storage', (e) => {
  if (CloudSync.STORAGE_KEYS.includes(e.key)) {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      CloudSync.pushToCloud();
    }, 1500);
  }
});

// สร้างฟังก์ชัน Global ให้โมดูลอื่นเรียกสั่งซิงค์ได้ทันที
window.triggerCloudSync = () => {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    CloudSync.pushToCloud();
  }, 500);
};