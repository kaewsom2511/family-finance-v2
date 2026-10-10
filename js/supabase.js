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