// js/supabase.js
const SUPABASE_URL = 'https://kluefrvavvyhtswsvxee.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KHfOsEWDCW6RyV-Mbx_v6w_pyUtOR03';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// โหมด: 'signin' | 'signup' | 'forgot' | 'reset'
let authMode = 'signin';

// ==========================================
// DataScope: ใช้โค้ด/โครงสร้างร่วมกัน แต่ข้อมูลแยกตามบัญชีผู้ใช้
// โมดูลทุกตัวยังเรียก localStorage ด้วยชื่อคีย์เดิม แต่คีย์ที่เป็นข้อมูลส่วนตัว
// จะถูกแปลเป็น "คีย์จริง" ที่ต่อท้ายด้วย #u<uid> ของผู้ที่ล็อกอินอยู่
// ==========================================

const DataScope = {
  SEP: '#u',

  // โครงสร้างที่ทั้งบ้านใช้ร่วมกัน (ใครแก้ทุกบัญชีเห็นตาม)
  // หมายเหตุ: debts-contracts เคยอยู่กลุ่มนี้ แต่ย้ายเป็น per-user แล้ว
  // เพราะสัญญาผ่อนเป็นหนี้ส่วนบุคคล สมาชิกคนอื่นไม่ควรเห็น
  SHARED: [
    'family-finance:categories:v1',
    'family-finance:master-accounts:v1',
    'family-finance:settings',
    'family-finance:credit-cards:v1'
  ],

  // คีย์ข้อมูลส่วนตัวที่โมดูลเรียกด้วยชื่อตรงตัว → ต่อท้ายด้วย #u<uid> ตามผู้ที่ล็อกอิน
  // ไม่มีการยุบชื่อข้ามเวอร์ชัน (v1/v2/member) มาอยู่คีย์เดียวกัน เพราะ JSONB บน Cloud
  // ไม่เก็บลำดับคีย์ ทำให้คีย์ที่ pull มาทีหลังเขียนทับข้อมูลของคนอื่นได้
  DATA_KEYS: [
    'family-finance:cashflow:v2',
    'family-finance:cashflow:v1',
    'family-finance:portfolio:v1',
    'family-finance:initial-balances:v1',
    'family-finance:wealth-extras:v1',
    'family-finance:pvd:v1',
    'family-finance:card-limits',
    'family-finance:debt-plans',
    'family-finance:bill-schedules',
    'family-finance:debts-contracts:v1',
    'stock-trading-log:v3',
    'stock-trading-log:quote-cache:v1',
    'wealthport:latest-usd-thb',
    'wealthport:avg-cost-ledger:v1',
    'wealthport:dividend-plan-models:v3',
    'wealthport:dividend-plan-pillars:v3',
    'wealthport:dividend-plan-target:v3',
    'family-finance-db',
    'transactions'
  ],

  // กลุ่มคีย์ที่ชื่อเปลี่ยนไดนามิก (ตามเจ้าของ/ตามปี) → ต่อท้าย #u<uid> ทั้งชื่อ
  DYNAMIC_DATA_PREFIX: [
    'family-finance:tax-planner:',
    'family-finance:cashflow:member:',
    'family-finance:card-limits:member:',
    'family-finance:debt-plans:member:',
    'family-finance:categories:member:',
    'family-finance:master-accounts:member:',
    'stock-trading-log:member:',
    'wealthport:dividend-plan-models:member:',
    'wealthport:dividend-plan-target:member:',
    'wealthport:dividend-plan-pillars:member:'
  ],

  // คีย์แบบ "<ฐาน>:member:<ชื่อเจ้าของ>" → ชื่อมาตรฐานที่โมดูลใช้อย่างเดียวในปัจจุบัน
  MEMBER_TO_CANONICAL: {
    'family-finance:cashflow': 'family-finance:cashflow:v2',
    'stock-trading-log': 'stock-trading-log:v3',
    'family-finance:card-limits': 'family-finance:card-limits',
    'family-finance:debt-plans': 'family-finance:debt-plans',
    'wealthport:dividend-plan-models': 'wealthport:dividend-plan-models:v3',
    'wealthport:dividend-plan-target': 'wealthport:dividend-plan-target:v3',
    'wealthport:dividend-plan-pillars': 'wealthport:dividend-plan-pillars:v3',
    'family-finance:categories': 'family-finance:categories:v1',
    'family-finance:master-accounts': 'family-finance:master-accounts:v1'
  },

  uid: null,
  nameSlug: '',
  emailLocal: '',

  // อ่าน session ที่ supabase-js เก็บไว้แบบ synchronous เพื่อให้แปลคีย์ได้ทันก่อน module อื่นรัน
  detectUidFromToken() {
    try {
      const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!tokenKey) return null;
      const raw = nativeGetItem.call(localStorage, tokenKey);
      return JSON.parse(raw)?.user?.id || null;
    } catch (e) {
      return null;
    }
  },

  stripScope(key) {
    const i = String(key).indexOf(this.SEP);
    return i === -1 ? String(key) : String(key).slice(0, i);
  },

  isUserDataKey(key) {
    return this.DATA_KEYS.includes(key) ||
      this.DYNAMIC_DATA_PREFIX.some(p => key.startsWith(p));
  },

  physical(logicalKey) {
    const key = String(logicalKey);
    if (!this.uid || key.includes(this.SEP)) return key;
    if (this.isSharedKey(key)) return key;
    return this.isUserDataKey(key) ? key + this.SEP + this.uid : key;
  },

  isOwnDataKey(key) {
    return !!this.uid && typeof key === 'string' && key.endsWith(this.SEP + this.uid);
  },

  isSharedKey(key) {
    return this.SHARED.includes(key);
  },

  // ย้ายข้อมูลจากคีย์กลางเดิม (ตอนเคยเป็น SHARED) เข้าซองรายผู้ใช้ครั้งแรก
  // ต้องเรียกก่อนอ่าน/seed คีย์นั้น เพื่อไม่ให้ข้อมูลเดิมหายไปตอนเปลี่ยน scope
  adoptLegacyIfAbsent(logicalKey) {
    if (!this.uid) return;
    const physical = this.physical(logicalKey);
    if (physical === logicalKey) return;
    if (nativeGetItem.call(localStorage, physical) !== null) return;
    const legacy = nativeGetItem.call(localStorage, logicalKey);
    if (legacy !== null) nativeSetItem.call(localStorage, physical, legacy);
  },

  // ชื่อเจ้าของที่ระบุไว้ในคีย์เก่า (":member:<ชื่อ>", "tax-planner:member_<ชื่อ>:ปี", "tax-planner:<ชื่อ>:ปี")
  // คืน null เมื่อคีย์ไม่กำกับชื่อเจ้าของ = ข้อมูลเดิมของพ่อ
  legacyOwnerInKey(key) {
    const member = key.match(/:member[:_]([^:_#]+)/);
    const raw = member ? member[1] : (key.match(/^family-finance:tax-planner:([^:_#]+)[:_]/) || [])[1];
    if (!raw) return null;
    const owner = String(raw).toLowerCase().replace(/^member[_:]?/, '');
    return ['dad', 'admin'].includes(owner) ? null : owner;
  },

  myOwnerNames() {
    const names = new Set();
    [this.nameSlug, this.emailLocal, this.displayName].forEach(value => {
      const s = String(value || '').toLowerCase().trim();
      if (!s) return;
      names.add(s);
      names.add(s.replace(/[^a-z0-9ก-๙]+/g, '_').replace(/^_+|_+$/g, ''));
    });
    return names;
  },

  ownerIsMe(owner) {
    if (!owner) return false;
    return this.myOwnerNames().has(String(owner).toLowerCase());
  },

  // คีย์แบบ "<ฐาน>:member:<ชื่อ>" ที่ชื่อเจ้าของตรงกับบัญชีปัจจุบันหรือไม่
  memberKeyOwnerMatches(key) {
    return this.ownerIsMe(this.legacyOwnerInKey(key));
  },

  // ตัดสินว่าคีย์เก่า (ไม่มี #u) จาก Cloud ควรลงเครื่องนี้ไหม
  // - คีย์กำกับชื่อคนอื่น → ไม่เอา
  // - คีย์ไม่กำกับชื่อ = ข้อมูลเดิมของพ่อ ให้เฉพาะบัญชี admin และเมื่อซองของเรายังว่าง
  //   (กันข้อมูลของพ่อทับข้อมูลของคนที่ล็อกอินเป็นสมาชิก)
  acceptLegacyKey(key) {
    if (this.isSharedKey(key)) return true;
    const owner = this.legacyOwnerInKey(key);
    if (owner !== null) return this.ownerIsMe(owner);
    if (this.role !== 'admin') return false;
    const base = (key.match(/^(.+?):member[:_]/) || [])[1];
    const logical = base ? (this.MEMBER_TO_CANONICAL[base] || key) : key;
    return nativeGetItem.call(localStorage, this.physical(logical)) === null;
  },

  // คีย์ยุคก่อนที่ชื่อถูกยุบเหลือเฉพาะฐาน (ไม่มีโมดูลใดอ่านแล้ว) → ล้างทิ้ง
  // ถ้าคีย์มาตรฐานยังว่างอยู่ ให้ย้ายค่าออกมาเก็บก่อนลบ กันข้อมูลหาย
  ALIAS_LEFTOVERS: {
    'family-finance:cashflow': 'family-finance:cashflow:v2',
    'family-finance:portfolio': 'family-finance:portfolio:v1',
    'family-finance:initial-balances': 'family-finance:initial-balances:v1',
    'family-finance:wealth-extras': 'family-finance:wealth-extras:v1',
    'family-finance:pvd': 'family-finance:pvd:v1',
    'stock-trading-log': 'stock-trading-log:v3',
    'stock-trading-log:quote-cache': 'stock-trading-log:quote-cache:v1',
    'wealthport:avg-cost-ledger': 'wealthport:avg-cost-ledger:v1',
    'wealthport:dividend-plan-models': 'wealthport:dividend-plan-models:v3',
    'wealthport:dividend-plan-pillars': 'wealthport:dividend-plan-pillars:v3',
    'wealthport:dividend-plan-target': 'wealthport:dividend-plan-target:v3'
  },

  purgeAliasLeftovers() {
    if (!this.uid) return 0;
    let cleaned = 0;
    Object.entries(this.ALIAS_LEFTOVERS).forEach(([oldName, canonical]) => {
      const oldKey = oldName + this.SEP + this.uid;
      const value = nativeGetItem.call(localStorage, oldKey);
      if (value === null) return;
      if (nativeGetItem.call(localStorage, this.physical(canonical)) === null) {
        nativeSetItem.call(localStorage, this.physical(canonical), value);
      }
      nativeRemoveItem.call(localStorage, oldKey);
      cleaned++;
    });
    if (cleaned) console.log('[DataScope] ล้างคีย์ยุคก่อนที่เลิกใช้แล้ว', cleaned, 'คีย์');
    return cleaned;
  },

  async bindUser(user, profile) {
    const uid = user?.id || null;
    const changed = uid !== this.uid;
    this.uid = uid;
    this.role = profile?.role || 'member';
    this.displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : '');
    this.nameSlug = String(profile?.full_name || (user?.email || '').split('@')[0])
      .toLowerCase().replace(/[^a-z0-9ก-๙]/g, '_');
    this.emailLocal = String(user?.email || '').split('@')[0].toLowerCase();

    if (uid) {
      try {
        if (changed) await this.migrateLegacyData(user, profile);
        this.normalizeMemberKeys();
        this.purgeAliasLeftovers();
      } catch (e) {
        console.warn('[DataScope] migration error:', e);
      }
    }
    return changed;
  },

  // จัดระเบียบคีย์เก่าของใครของมัน: "<ฐาน>:member:<ชื่อเรา>" → คีย์มาตรฐานในซองของเรา
  // เรียกทุกครั้งที่ผูกผู้ใช้และหลัง pull จาก Cloud (ข้อมูลเก่าอาจเพิ่งลงมา)
  // คีย์ shared (หมวดหมู่/บัญชีหลัก) ยุบเข้าคีย์ร่วมของบ้าน ไม่เขียนทับของเดิม
  normalizeMemberKeys() {
    if (!this.uid) return 0;
    const rawKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) rawKeys.push(k);
    }

    let moved = 0;
    rawKeys.forEach(rawKey => {
      if (!rawKey.includes(':member:')) return;
      const logical = this.stripScope(rawKey);
      if (!this.memberKeyOwnerMatches(logical)) return;
      const base = logical.match(/^(.+):member:/)[1];
      const canonical = this.MEMBER_TO_CANONICAL[base];
      if (!canonical) return;

      const target = this.physical(canonical);
      if (rawKey === target) return;
      const value = nativeGetItem.call(localStorage, rawKey);
      const hasTarget = nativeGetItem.call(localStorage, target) !== null;
      // คีย์มาตรฐานมีข้อมูลอยู่แล้ว = ของใหม่กว่า (มาจาก Cloud หรือผู้ใช้แก้ไว้) ให้เก็บของใหม่ทิ้งคีย์เก่า
      if (hasTarget) {
        if (value !== null) nativeRemoveItem.call(localStorage, rawKey);
        moved++;
        return;
      }
      if (value === null) return;
      nativeSetItem.call(localStorage, target, value);
      nativeRemoveItem.call(localStorage, rawKey);
      moved++;
    });

    if (moved) console.log('[DataScope] จัดระเบียบคีย์เดิมเข้าคีย์มาตรฐาน', moved, 'คีย์');
    return moved;
  },

  // ย้ายข้อมูลเดิม (คีย์ไม่มี #u) เข้าซองของผู้ที่ควรเป็นเจ้าของ
  // - บัญชี admin = เจ้าของข้อมูลเดิมทั้งชุด ตามที่ผู้ใช้ยืนยัน
  // - บัญชี member = เอาเฉพาะคีย์ ":member:<ชื่อ>" ที่ชื่อตรงกับผู้ใช้นั้น
  // ไม่เขียนทับคีย์ที่มีอยู่แล้ว (ข้อมูลจาก Cloud ที่ pull มาก่อนชนะเสมอ)
  legacyOwnerIsMember(key) {
    if (key.includes(':member:')) return true;
    const taxOwner = (key.match(/^family-finance:tax-planner:([^:]+):/) || [])[1];
    if (taxOwner) return !['dad', 'admin'].includes(taxOwner.toLowerCase());
    return false;
  },

  async migrateLegacyData(user, profile) {
    const doneFlag = 'family:dataScopeMigrated:' + this.uid;
    if (nativeGetItem.call(localStorage, doneFlag)) return;

    const isAdmin = (profile?.role || 'member') === 'admin';

    const legacyToMove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.includes(this.SEP)) continue;
      if (this.SHARED.includes(key)) continue;
      if (key.startsWith('sb-')) continue;
      if (!this.isUserDataKey(key)) continue;

      const owner = this.legacyOwnerInKey(key);
      if (isAdmin) {
        // ของพ่อ = คีย์เดิมที่ไม่มีชื่อเจ้าของกำกับ (cashflow:v2, stock-trading-log:v3, tax-planner:DAD:*)
        // คีย์ที่กำกับชื่อสมาชิกไว้ ปล่อยไว้ให้เป็นของเจ้าของเดิม
        if (owner !== null) continue;
        legacyToMove.push(key);
      } else {
        // สมาชิก: เอาเฉพาะคีย์ที่กำกับชื่อตรงกับบัญชีนี้
        if (owner !== null && this.ownerIsMe(owner)) legacyToMove.push(key);
      }
    }

    if (legacyToMove.length === 0) {
      nativeSetItem.call(localStorage, doneFlag, '1');
      console.log('[DataScope] ไม่มีข้อมูลเดิมต้องย้ายสำหรับบัญชีนี้');
      return;
    }

    // ระหว่างย้ายข้อมูลห้าม push ขึ้น Cloud (เดี๋ยวจะ sync เสร็จทีเดียวหลังย้าย)
    if (typeof CloudSync !== 'undefined') CloudSync._bulkWrite = true;
    try {
      legacyToMove.forEach(key => {
        const target = this.physical(key);
        if (nativeGetItem.call(localStorage, target) !== null) return;
        const value = nativeGetItem.call(localStorage, key);
        if (value === null) return;
        nativeSetItem.call(localStorage, target, value);
        nativeRemoveItem.call(localStorage, key);
      });
      nativeSetItem.call(localStorage, doneFlag, new Date().toISOString());
    } finally {
      if (typeof CloudSync !== 'undefined') CloudSync._bulkWrite = false;
    }
    console.log('[DataScope] ย้ายข้อมูลเดิมเข้าซองผู้ใช้แล้ว', legacyToMove.length, 'คีย์');
    if (typeof window.triggerCloudSync === 'function') window.triggerCloudSync();
  }
};

// ติดตั้งก่อนทุกโมดูล: เก็บ method ดั้งไว้ใช้เองภายใน (เขียนอ่านแบบไม่แปลคีย์)
const nativeGetItem = Storage.prototype.getItem;
const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;

// เรียงคีย์ใน object ให้เป็นมาตรฐานก่อนเทียบค่า
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map(k => JSON.stringify(k) + ':' + canonicalJson(value[k]))
      .join(',') + '}';
  }
  return value === undefined ? 'null' : JSON.stringify(value);
}

// JSONB ของ Supabase ไม่รักษาลำดับคีย์ จึงต้องเทียบ "เนื้อหา" ไม่ใช่เทียบสตริง
// ไม่งั้น pull รอบถัดไปจะคิดว่าข้อมูลเปลี่ยนทุกครั้ง แล้ววาดหน้าจอทับซ้ำ
function sameStoredValue(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  try {
    return canonicalJson(JSON.parse(a)) === canonicalJson(JSON.parse(b));
  } catch (e) {
    return false;
  }
}

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

  // ผูกซองข้อมูลกับผู้ใช้จริง (และย้ายข้อมูลเดิมเข้าซองถ้ายังไม่เคยทำ)
  const uidChanged = await DataScope.bindUser(user, profile);
  if (uidChanged) console.log('[DataScope] ใช้ข้อมูลซองของ ' + (profile?.full_name || user.email));

  const role = profile?.role || 'member';
  const displayName = profile?.full_name || user.email;

  // cache บทบาทไว้อ่านแบบ synchronous (โมดูลอ่านก่อน auth เสร็จได้)
  // ใช้ ":" แทน "#u" เพื่อไม่ให้ถูก isSyncedKey จับไป sync ขึ้น cloud
  try { nativeSetItem.call(localStorage, 'family-finance:session-role:' + user.id, role); } catch (e) {}

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
  if (uidChanged && typeof DashboardModule !== 'undefined' && typeof DashboardModule.calculateAndRender === 'function') {
    try { DashboardModule.calculateAndRender(); } catch (e) {}
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
  // โหมด Local: ถ้าเป็น true จะปิดทั้ง pull และ push (ใช้ localStorage อย่างเดียว)
  // ตั้ง false เพื่อให้เครื่องนี้ sync กับ Cloud / iPad
  LOCAL_ONLY: false,

  // ปิด auto-push ชั่วคราวขณะเขียนหลายคีย์ติดกัน (ตอน pull จาก Cloud) กันการยิง push ซ้อน
  _bulkWrite: false,

  // ข้อมูลโครงสร้างร่วมของบ้านเก็บในตาราง family_storage
  // ถ้ายังไม่ได้รัน SQL สร้างตาราง (familyTableState='missing') จะเก็บไว้ในแถวของบัญชีนั้นไปก่อน
  FAMILY_TABLE: 'family_storage',
  familyTableState: 'unknown',

  // สถานะรอบ auto-sync (ค่าเริ่มต้นทั้งนี้ เพื่อให้ short-circuit ทำงานถูกตั้งแต่แรก)
  _pullInFlight: false,
  _lastPullAt: 0,
  _autoSyncStarted: false,
  _rtChannel: null,
  _familyRetryAt: 0,

  // เวลาของการเขียนข้อมูลครั้งล่าสุดที่ยังไม่ยืนยันว่าส่งขึ้น Cloud สำเร็จ
  _dirtySince: 0,
  hasUnpushedEdits(waitMs = 60000) {
    return this._dirtySince > 0 && (Date.now() - this._dirtySince) < waitMs;
  },

  // มีเฉพาะคีย์ที่เป็นข้อมูลของคนที่ล็อกอินอยู่ (ลงท้าย #u<uid>) กับคีย์โครงสร้างร่วมเท่านั้น
  // ทำให้บัญชีหนึ่งไม่สามารถดึง/ส่งข้อมูลของอีกบัญชีได้
  isSyncedKey(key) {
    if (!key) return false;
    return DataScope.isOwnDataKey(key) || DataScope.isSharedKey(key);
  },

  // อ่าน localStorage ทั้งหมดแล้วแยกเป็นซองของตัวเองกับซองข้อมูลร่วมของบ้าน
  buildBundles() {
    const own = {}, shared = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!this.isSyncedKey(key)) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      let value;
      try {
        value = JSON.parse(raw);
      } catch (e) {
        value = raw;
      }
      (DataScope.isSharedKey(key) ? shared : own)[key] = value;
    }
    return { own, shared };
  },

  isMissingTableError(err) {
    const msg = (err?.message || '') + (err?.details || '') + (err?.code || '');
    return /does not exist|42P01|PGRST205|not find the table/i.test(msg);
  },

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
  async pullFromCloud({ background = false } = {}) {
    if (!supabaseClient) return;
    if (this.LOCAL_ONLY) {
      console.log('[CloudSync] โหมด Local: ข้ามการดึงข้อมูลจาก Cloud (ใช้ localStorage เท่านั้น)');
      return;
    }
    if (this._pullInFlight) return;
    this._pullInFlight = true;
    this._lastPullAt = Date.now();

    // ระหว่างใช้งาน: ถ้าเครื่องนี้เพิ่งมีการแก้ไขที่ยังไม่ทันส่งขึ้น Cloud อย่าเพิ่งดึงลงมาเขียนทับ
    // (เคยทำให้รายการที่ผู้ใช้ลบไปแล้ว โผล่กลับมาใหม่ เพราะ Cloud เวอร์ชันเก่ากลับมาตอน push ยังไม่เสร็จ)
    if (background && this.hasUnpushedEdits()) {
      this._pullInFlight = false;
      if ((this._deferredPulls || 0) < 10) {
        this._deferredPulls = (this._deferredPulls || 0) + 1;
        setTimeout(() => { this._deferredPulls--; this.pullFromCloud({ background: true }); }, 3000);
      }
      return;
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      // อย่าให้ข้อมูลของบัญชีอื่นที่ค้างอยู่ในแถว Cloud เข้ามารวมในเครื่องนี้
      const belongsHere = (key) => {
        const sep = key.indexOf(DataScope.SEP);
        if (sep === -1) return DataScope.acceptLegacyKey(key);
        return key.endsWith(DataScope.SEP + DataScope.uid);
      };

      const bundleSources = [];
      const { data, error } = await supabaseClient
        .from('user_storage')
        .select('data, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (data && data.data) bundleSources.push(data.data);

      // ข้อมูลโครงสร้างร่วมของบ้าน (ตาราง family_storage มีเฉพาะตอนรัน SQL แล้ว)
      let familyBundle = null;
      if (this.familyTableState !== 'missing') {
        const { data: fam, error: famErr } = await supabaseClient
          .from(this.FAMILY_TABLE)
          .select('data')
          .eq('id', 'family')
          .maybeSingle();
        if (famErr) {
          if (this.isMissingTableError(famErr)) { this.familyTableState = 'missing'; this.notifyMissingFamilyTable(); }
          else console.warn('[CloudSync] Family table read error:', famErr);
        } else if (fam && fam.data) {
          this.familyTableState = 'ok';
          familyBundle = fam.data;
          bundleSources.push(familyBundle);
        }
      }

      const readIfScoped = (logicalKey) =>
        DataScope.uid ? nativeGetItem.call(localStorage, DataScope.physical(logicalKey)) : null;
      const wasEmpty = !readIfScoped('family-finance:cashflow:v2') && !readIfScoped('stock-trading-log:v3');
      const changedKeys = [];

      bundleSources.forEach(bundleData => {
        this._bulkWrite = true;
        try {
          Object.entries(bundleData).forEach(([key, val]) => {
            if (val === null || val === undefined || !belongsHere(key)) return;
            const next = typeof val === 'object' ? JSON.stringify(val) : String(val);
            const physicalKey = DataScope.physical(key);
            if (sameStoredValue(nativeGetItem.call(localStorage, physicalKey), next)) return;
            localStorage.setItem(key, next);
            changedKeys.push(physicalKey);
          });
        } finally {
          this._bulkWrite = false;
        }
      });

      // ข้อมูลเก่าแบบ "<ฐาน>:member:<ชื่อเรา>" ที่เพิ่งลงมาจาก Cloud →ยุบเข้าคีย์มาตรฐานในซองของเรา
      this._bulkWrite = true;
      let didNormalize = false;
      try {
        didNormalize = (DataScope.normalizeMemberKeys() + DataScope.purgeAliasLeftovers()) > 0;
      } finally {
        this._bulkWrite = false;
      }
      if (didNormalize) scheduleCloudPush(800);

      // ถ้าตารางข้อมูลร่วมของบ้านยังว่างอยู่ ให้เครื่องนี้ส่งข้อมูลร่วมขึ้นไปเก็บก่อน (ครั้งเดียวต่อ session)
      if (this.familyTableState === 'ok' && !sessionStorage.getItem('ff:familySeeded')) {
        const sharedInCloud = familyBundle && Object.keys(familyBundle).some(k => DataScope.isSharedKey(k));
        const sharedHere = DataScope.SHARED.some(k => nativeGetItem.call(localStorage, k) !== null);
        if (sharedHere && !sharedInCloud) {
          sessionStorage.setItem('ff:familySeeded', '1');
          console.log('[CloudSync] ส่งข้อมูลร่วมของบ้านขึ้นตาราง ' + this.FAMILY_TABLE + ' ครั้งแรก');
          scheduleCloudPush(1500);
        }
      }

      if (background) {
        // ดึงข้อมูลระหว่างใช้งาน: ห้าม reload ทับงาน ให้เขียนค่าใหม่แล้วสั่งวาดหน้าจอใหม่
        if (changedKeys.length || didNormalize) this.applyLiveRefresh(changedKeys);
        return;
      }

      // รีโหลดเมื่อเครื่องเพิ่งมีข้อมูลครั้งแรก หรือหลังจัดระเบียบคีย์ (กันวนซ้ำ: ทำทีละครั้งต่อบัญชีใช้งาน)
      const normalizedThisSession = didNormalize && !sessionStorage.getItem('ff:scopeReloaded');
      if (normalizedThisSession) sessionStorage.setItem('ff:scopeReloaded', '1');
      if ((changedKeys.length || didNormalize) && (wasEmpty || normalizedThisSession)) {
        window.location.reload();
      }
    } catch (err) {
      console.warn('[CloudSync] Pull error:', err);
    } finally {
      this._pullInFlight = false;
    }
  },

  // ให้โมดูลที่เปิดอยู่วาดข้อมูลใหม่ หลังมีชุดข้อมูลจาก Cloud เข้ามาระหว่างใช้งาน
  applyLiveRefresh(changedKeys = [], retry = 0) {
    // ถ้ามีฟอร์ม/โมดัลที่เปิดค้างอยู่ อย่าเพิ่งวาดทับข้อมูลบนจอ เลื่อนออกไปก่อน
    const modalOpen = Array.from(document.querySelectorAll('.modal, [id*="odal"], dialog'))
      .some(el => el.offsetParent !== null && getComputedStyle(el).display !== 'none');
    if (modalOpen || document.querySelector('input:focus, textarea:focus, select:focus')) {
      if (retry < 20) setTimeout(() => this.applyLiveRefresh(changedKeys, retry + 1), 3000);
      return;
    }

    const sharedChanged = changedKeys.some(k => DataScope.isSharedKey(k));
    console.log('[CloudSync] รับข้อมูลจาก Cloud ระหว่างใช้งาน', changedKeys.length, 'คีย์', sharedChanged ? '(รวมข้อมูลร่วมของบ้าน)' : '');
    if (sharedChanged) this.showSyncToast('อัปเดตข้อมูลร่วมของบ้านแล้ว');
    window.dispatchEvent(new CustomEvent('ff:cloud-updated', { detail: { keys: changedKeys, shared: sharedChanged } }));

    this.renderCurrentView();
  },

  // วาดเฉพาะหน้าจอที่ผู้ใช้เปิดอยู่ตอนนี้
  // โมดูลอื่นบนหน้าเดียวกัน (เช่น หนี้สิน/บัตรเครดิต บน cashflow.html) มี fallback เป็น #content-area
  // ถ้าเรียกมั่วจะมายึดพื้นที่คอนเทนเนอร์เดียวกัน ทำให้หน้าเดิมหายไปทั้งหน้า
  renderCurrentView() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const call = (name, fn = 'render') => {
      const mod = window[name];
      if (mod && typeof mod[fn] === 'function') {
        try { mod[fn](); } catch (e) { console.warn('[CloudSync] re-render ' + name + ' error:', e); }
      }
    };

    if (page === 'index.html') { call('DashboardModule', 'calculateAndRender'); call('BillModule', 'renderDashboardBanner'); return; }
    if (page === 'settings.html') { call('SettingsModule'); return; }
    if (page === 'portfolio.html') { call('PortfolioModule'); call('DividendPlannerModule'); return; }

    if (window.CashFlowModule) {
      const onDebtPage = hash.includes('debt') || hash.includes('credit-card');
      const area = document.getElementById('content-area');
      if (onDebtPage && window.DebtModule && typeof DebtModule.render === 'function') {
        try { DebtModule.render(area); } catch (e) { console.warn('[CloudSync] re-render DebtModule error:', e); }
      } else {
        call('CashFlowModule');
      }
      return;
    }
  },

  // ดึงข้อมูลซ้ำระหว่างเปิดหน้าอยู่ (อีกบัญชี/อีกเครื่องเพิ่งแก้) แบบคุมความถี่
  pullIfStale(minGapMs = 20000) {
    if (this.LOCAL_ONLY || this._pullInFlight) return;
    if (Date.now() - (this._lastPullAt || 0) < minGapMs) return;
    this.pullFromCloud({ background: true });
  },

  // ถ้าตาราง family_storage ถูกเพิ่มเข้า Realtime publication จะได้ข้อมูลทันทีที่อีกบัญชีบันทึก
  subscribeToSharedChanges() {
    if (!supabaseClient || this._rtChannel) return;
    try {
      this._rtChannel = supabaseClient
        .channel('family-shared-data')
        .on('postgres_changes', { event: '*', schema: 'public', table: this.FAMILY_TABLE },
          () => this.pullFromCloud({ background: true }))
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') this._rtChannel = null;
        });
    } catch (e) {
      this._rtChannel = null;
    }
  },

  startAutoSync() {
    if (!supabaseClient || this.LOCAL_ONLY || this._autoSyncStarted) return;
    this._autoSyncStarted = true;
    this.subscribeToSharedChanges();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.pullIfStale(10000);
    });
    window.addEventListener('focus', () => this.pullIfStale(10000));
    setInterval(() => {
      // ทดลองใช้ตารางข้อมูลร่วมอีกครั้ง (เผื่อเพิ่งรัน SQL โดยไม่ได้ reload หน้านาน ๆ)
      if (this.familyTableState === 'missing' && Date.now() - (this._familyRetryAt || 0) > 600000) {
        this._familyRetryAt = Date.now();
        this.familyTableState = 'unknown';
      }
      this.pullIfStale();
    }, 60000);
  },

  // เตือนครั้งเดียวต่อบัญชีใช้งานว่ายังไม่ได้สร้างตารางข้อมูลร่วมของบ้าน
  notifyMissingFamilyTable() {
    if (sessionStorage.getItem('ff:familyTableNoticeShown')) return;
    sessionStorage.setItem('ff:familyTableNoticeShown', '1');
    this.showSyncToast('ยังไม่มีตาราง family_storage: ข้อมูลร่วมของบ้านยังไม่ sync ข้ามบัญชี', false);
    console.warn('[CloudSync] ขาดตาราง ' + this.FAMILY_TABLE + ' — รัน sql/family_storage.sql ใน Supabase SQL Editor หนึ่งครั้ง');
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

      const { own, shared } = this.buildBundles();
      const bundleStartedAt = Date.now();

      // ข้อมูลร่วมของบ้านพยายามเก็บในตาราง family_storage
      // ถ้าตารางยังไม่มี (ยังไม่ได้รัน SQL) ให้เก็บรวมในแถวของบัญชีนี้ไปก่อน
      if (this.familyTableState !== 'missing' && Object.keys(shared).length > 0) {
        const { error: famErr } = await supabaseClient
          .from(this.FAMILY_TABLE)
          .upsert({ id: 'family', data: shared, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (famErr) {
          if (this.isMissingTableError(famErr)) {
            this.familyTableState = 'missing';
            console.warn('[CloudSync] ยังไม่มีตาราง ' + this.FAMILY_TABLE + ' จึงเก็บข้อมูลร่วมไว้ในแถวของบัญชีนี้ก่อน');
          } else {
            throw famErr;
          }
        } else {
          this.familyTableState = 'ok';
        }
      }

      const bundle = this.familyTableState === 'missing' ? { ...own, ...shared } : own;

      const { error } = await supabaseClient
        .from('user_storage')
        .upsert({
          user_id: session.user.id,
          data: bundle,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      this.showSyncToast('บันทึกขึ้น Cloud แล้ว', true);
      // มีคนเขียนข้อมูลต่อระหว่างที่ส่งอยู่ → อย่าล้างสถานะ ให้รอบถัดไปจัดการ
      if (this._dirtySince <= bundleStartedAt) this._dirtySince = 0;
      console.log('[CloudSync] Synced to cloud successfully');
    } catch (err) {
      this.showSyncToast('บันทึกขึ้น Cloud ไม่สำเร็จ', false);
      console.error('[CloudSync] Push error:', err);
    }
  }
};

// สั่งโหลดข้อมูลจาก Cloud ทันทีเมื่อเปิดหน้าเว็บ แล้วต่อรอบอัตโนมัติระหว่างใช้งาน
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => CloudSync.pullFromCloud(), 300);
  CloudSync.startAutoSync();
});

// รวมการเขียน localStorage หลายครั้งติดกันให้ push เป็นรอบเดียว (ทุกโมดูล ไม่ต้องเพิ่มโค้ดในโมดูล)
let syncTimeout = null;
function scheduleCloudPush(delay = 1500) {
  if (CloudSync.LOCAL_ONLY || CloudSync._bulkWrite) return;
  CloudSync._dirtySince = Date.now();
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => CloudSync.pushToCloud(), delay);
}

// ชั้น แปลงคีย์ + สั่ง sync อัตโนมัติ ตั้งที่ Storage.prototype
// เพราะทุกโมดูลเรียก localStorage.getItem/setItem/removeItem โดยตรงอยู่แล้ว
Storage.prototype.setItem = function(key, value) {
  const physicalKey = DataScope.physical(key);
  nativeSetItem.call(this, physicalKey, value);
  if (this === window.localStorage && CloudSync.isSyncedKey(physicalKey)) {
    scheduleCloudPush();
  }
};

Storage.prototype.getItem = function(key) {
  return nativeGetItem.call(this, DataScope.physical(key));
};

Storage.prototype.removeItem = function(key) {
  nativeRemoveItem.call(this, DataScope.physical(key));
};

// อ่าน uid จาก session ที่เคยล็อกอินไว้ ให้ทันก่อนที่โมดูลแรกจะเรียกอ่านข้อมูล
DataScope.uid = DataScope.detectUidFromToken();
if (DataScope.uid) console.log('[DataScope] แยกข้อมูลรายผู้ใช้แล้วที่ uid=' + DataScope.uid.slice(0, 8) + '...');

// กรณีแท็บอื่นเดียวกันเขียนข้อมูล (cross-tab) ก็ต้อง push ต่อ
window.addEventListener('storage', (e) => {
  if (CloudSync.isSyncedKey(e.key)) scheduleCloudPush();
});

// สร้างฟังก์ชัน Global ให้โมดูลอื่นเรียกสั่งซิงค์ได้ทันที
window.triggerCloudSync = () => scheduleCloudPush(500);