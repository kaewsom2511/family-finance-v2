// js/supabase.js
const SUPABASE_URL = 'https://kluefrvavvyhtswsvxee.supabase.co';
// แทนที่ด้วย Publishable Key ตัวเต็มที่คุณก๊อปปี้ไว้
const SUPABASE_ANON_KEY = 'sb_publishable_KHfOsEWDCW6RyV-Mbx_v6w_pyUtOR03';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let isSignUpMode = false;

// ตรวจสอบสถานะผู้ใช้เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async () => {
  checkUserSession();
});

async function checkUserSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const modal = document.getElementById('authModal');
  
  if (!session) {
    if (modal) modal.style.display = 'flex';
  } else {
    if (modal) modal.style.display = 'none';
    applyUserPermissions(session.user);
  }
}

// สลับโหมดระหว่าง เข้าสู่ระบบ / สมัครสมาชิก
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById('authTitle');
  const btn = document.getElementById('authSubmitBtn');
  const toggle = document.getElementById('toggleAuthMode');
  const err = document.getElementById('authError');
  if (err) err.style.display = 'none';

  if (isSignUpMode) {
    title.innerText = 'สมัครสมาชิกใหม่';
    btn.innerText = 'ลงทะเบียน';
    toggle.innerText = 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ';
  } else {
    title.innerText = 'เข้าสู่ระบบ';
    btn.innerText = 'เข้าสู่ระบบ';
    toggle.innerText = 'ยังไม่มีบัญชี? สมัครสมาชิกใหม่';
  }
}

// ฟังก์ชันกดส่งฟอร์ม Login / Sign Up
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const errBox = document.getElementById('authError');
  const btn = document.getElementById('authSubmitBtn');

  errBox.style.display = 'none';
  btn.disabled = true;
  btn.innerText = 'กำลังดำเนินการ...';

  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      
      // บันทึกลง profiles table
      if (data?.user) {
        await supabaseClient.from('profiles').insert([
          { id: data.user.id, email: email, role: 'member' }
        ]);
      }
      alert('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
      toggleAuthMode();
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      document.getElementById('authModal').style.display = 'none';
      location.reload(); // รีเฟรชเพื่อโหลดข้อมูลตามสิทธิ์
    }
  } catch (err) {
    errBox.innerText = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = isSignUpMode ? 'ลงทะเบียน' : 'เข้าสู่ระบบ';
  }
}

// นำสิทธิ์มาควบคุมการแสดงผลบนหน้าจอ
async function applyUserPermissions(user) {
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'member';

  // ถ้าเป็นสมาชิกทั่วไป (Member) ให้ซ่อนส่วนสรุปพอร์ตและปุ่มสลับบัญชี
  if (role === 'member') {
    const hiddenSelectors = [
      'a[href*="portfolio"]', 
      '.user-switcher-container',
      '#grand-total-net-worth'
    ];
    hiddenSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
    });
  }
}