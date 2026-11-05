# Data Dictionary — ฐานข้อมูลหลักทรัพย์กลาง (Phase 1)

คู่กับ [`securities_db.sql`](securities_db.sql) · อ้างตาม "แผนการสร้างฐานข้อมูลหุ้นและกองทุน" ข้อ 5–6, 12
Schema ทั้งหมดอยู่ใน `public` บน Supabase (PostgreSQL 15) · คีย์กลางคือ `security_id` (uuid) **ไม่ใช่ symbol**

## กฎกลางที่ใช้ทุกตาราง

| เรื่อง | ข้อกำหนด |
| --- | --- |
| สกุลเงิน | ทุกตารางที่มีตัวเลขราคา/เงินปันผลต้องมี `currency char(3)` และเก็บตามสกุลเดิมของหลักทรัพย์ (ไม่แปลงเป็นบาทในชั้นฐานข้อมูล) |
| หน่วย `%` | `ratios.roe/roa/dividend_yield`, `fund_details.expense_ratio`, `fund_holdings.weight_pct` เก็บเป็นเปอร์เซ็นต์ตรงตัว (`12.5` = 12.5%) ไม่ใช่ทศนิยม |
| หน่วยงบการเงิน | `financials.unit_scale` บอกว่าตัวเลขเป็น `absolute` / `thousand` / `million` / `billion` — บังคับเก็บคู่กับ `currency` เสมอ ไม่งั้น P/E จะคำนวณผิดหลัก |
| ที่มาของข้อมูล | ทุกแถวมี `source_code → data_sources` + `fetched_at` (ข้อ 2 ของเอกสาร: เก็บแหล่งที่มาและเวลาดึงทุกครั้ง) |
| ค่าจริง vs ค่าคำนวณ | ค่าที่ระบบคำนวณเองต้องตั้ง `ratios.is_derived = true` และระบุ `derived_formula` — ห้ามปนกับตัวเลขจากแหล่งข้อมูล |
| การกันซ้ำ | ใช้ `unique (… , source_code)` ตามที่ระบุแต่ละตาราง ข้อมูลจากคนละแหล่งอยู่คนละแถว ไม่กลบกัน |
| ประวัติห้ามหาย | `prices_daily`, `fund_nav_history`, `dividends` เป็น append/upsert-only ไม่มี `delete` จาก collector |
| สิทธิ์เขียน | ทุกตาราง RLS: อ่านได้ `anon`/`authenticated`, เขียนได้ `service_role` เท่านั้น (collector บน GitHub Actions) |

---

## 1. `securities` — ทะเบียนหลักทรัพย์ (ข้อ 6 ลำดับ 1)

| ฟิลด์ | ชนิด | หน่วย/ค่า | ความหมาย | แหล่งข้อมูล |
| --- | --- | --- | --- | --- |
| security_id | uuid PK | — | รหัสกลางตลอดชีพ ใช้ FK จากทุกตาราง | ระบบสร้าง |
| symbol | text | — | สัญลักษณ์ **ปัจจุบัน** ตามที่ Family Finance เรียก (`BDMS.BK`, `NVDA`, `KFGAAP`) | SET / vendor |
| name_th / name_en | text | — | ชื่อย่อ/ชื่อบริษัท/ชื่อกองทุน | SET, บลจ. |
| asset_type | text FK | `thai-stock`, `foreign-stock`, `etf`, `mutual-fund`, `reit` | ใช้คำเดียวกับ trade log ของแอปเพื่อไม่ต้องแปลชื่อ | ระบบกำหนด |
| exchange_code | text FK | `SET`,`mai`,`NASDAQ`,`NYSE`,`AMEX`,`OFFSHORE` | ตลาดที่จดทะเบียน/ขาย | vendor |
| currency | char(3) | `THB`,`USD` | สกุลเงินของราคาและปันผล | vendor |
| isin | text | — | รหัสสากล 12 หลัก (ถ้าแหล่งข้อมูลให้มา) | SET / vendor |
| sector / industry | text | — | หมวดธุรกิจ | SET |
| status | text | `active`,`delisted`,`suspended`,`merged`,`unknown` | ไว้ตัดตัวที่หลุดตลาดออกจาก screener | SET |
| listed_from / listed_to | date | yyyy-mm-dd | ช่วงเวลาที่จดทะเบียน | SET |
| created_at / modified_at | timestamptz | — | `modified_at` ดูแลโดย trigger | ระบบ |

`unique (symbol, exchange_code)`

## 2. `security_symbol_history` — การเปลี่ยนสัญลักษณ์ (ข้อ 12)

| ฟิลด์ | ชนิด | ความหมาย |
| --- | --- | --- |
| security_id | uuid FK | หลักทรัพย์เดียวกัน |
| symbol / exchange_code | text | ชื่อที่เคยใช้ |
| from_date / to_date | date | ช่วงที่ใชชื่อนั้น (`to_date` NULL = ยังใช้อยู่) |
| reason | text | เช่น "เปลี่ยนชื่อบริษัท", "ย้ายจาก mai ไป SET" |

## 3. `security_aliases` — แมปชื่อที่แต่ละแหล่งข้อมูลเรียก

| ฟิลด์ | ชนิด | ความหมาย |
| --- | --- | --- |
| security_id + alias | PK | `alias` คือชื่อที่ vendor ใช้ เช่น `bdms.bk`, `BDMS.BK`, `NVDA`, `NVDA.US` |
| source_code | text FK | เจ้าของ alias นี้ (yahoo ใช้ `NVDA`, settrade ใช้ `BDMS.BK`) |

> สำคัญต่อ collector: ของเดิมในแอปเก็บ symbol แบบมี `.BK` สำหรับหุ้นไทยและไม่มีสำหรับกองทุน — ตารางนี้ทำให้แมปกลับได้โดยไม่ต้องแก้ข้อมูลใน Family Finance

## 4. `prices_latest` — ราคาล่าสุด 1 แถวต่อหลักทรัพย์ (ข้อ 6 ลำดับ 3)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| security_id | uuid PK | — | 1 แถวต่อหลักทรัพย์เท่านั้น |
| trade_date | date | — | วันทำการของราคา (ไม่ใช่ วันดึง) |
| close / prev_close | numeric(18,6) | สกุลเงินของหลักทรัพย์ | ราคาปิดล่าสุด / ปิดวันก่อน |
| change_pct | numeric(8,4) | % | ปิดเทียบวันก่อน (เก็บไว้เพื่อไม่ต้องคำนวณซ้ำ) |
| is_estimate | boolean | — | `true` เมื่อเป็น NAV ประมาณการ (กองทุน) — ตรงกับ `isEstimate` ใน quote cache เดิม |
| source_code / fetched_at | | | ที่มา + เวลาดึง |

## 5. `prices_daily` — ประวัติราคา (ข้อ 6 ลำดับ 4)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| security_id | uuid FK | — | |
| trade_date | date | — | วันทำการ |
| open/high/low/close | numeric(18,6) | สกุลเงินเดิม | แท่งราคา (กองทุนอาจมีเฉพาะ close = NAV) |
| adj_close | numeric(18,6) | สกุลเงินเดิม | ปรับ split/ปันผลแล้ว ถ้าแหล่งข้อมูลให้มา; **ห้าม** เอามาใช้คำนวณยอดถือครอง |
| volume | numeric(20) | หน่วย (หุ้น) / บาท (SET ให้เป็นมูลค่า) | SET ส่วนใหญ่ส่ง value ไม่ใช่ volume → เก็บ `turnover` แทน |
| turnover | numeric(20) | สกุลเงิน | มูลค่าซื้อขาย |
| source_code | text FK | | |

`unique (security_id, trade_date, source_code)` · index `(security_id, trade_date desc)`
**ข้อจำกัดจริงที่ตรวจแล้ว:** `/api/chart` ของ backend ปัจจุบันคืน closes ~12 เดือน และ NAV กองทุน capped ที่ 1 ปี → `data_sources.history_limit_days` เก็บไว้ว่าแหล่งให้กี่วัน ส่วนที่ลึกกว่านั้นต้อง import CSV (`source_code='manual_upload'`)

## 6. `dividends` — ปันผล / DPU / XD (ข้อ 6 ลำดับ 5)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| kind | text | `dividend`,`dpu`,`capital_return`,`special_dividend`,`interest` | REIT/โครงสร้างพื้นฐานใช้ `dpu` |
| amount_per_share | numeric(18,6) | บาท/USD ต่อหน่วย | ตัวเลขดิบจากแหล่งข้อมูล (ไม่แปลง) |
| ex_date | date | | วัน XD (ขึ้นเครื่องหมาย) |
| record_date | date | | วันกำหนดสิทธิ (RL) |
| pay_date | date | | วันจ่ายจริง — ใช้เป็นเกณฑ์ "เงินเข้า" |
| period_label / fiscal_year | | | งวดที่จ่าย เช่น `H2/2025` |
| is_declared | boolean | | `false` = ประมาณการ ห้ามรวมในยอดรับจริง |
| announced_at | date | | วันประกาศ |

`unique nulls not distinct (security_id, kind, ex_date, record_date, pay_date, amount_per_share, source_code)`
> ต้องมี `pay_date` อยู่ในกุญแจด้วย: แถวปันผลที่ import จาก trade log ของ Family Finance (`source_code='manual_log'`)
> ไม่มี XD/Record date (NULL ทั้งคู่) ถ้าไม่เอา `pay_date` มาช่วยแบ่ง ปันผล "จำนวนเท่ากัน คนละวัน" ของหุ้นตัวเดิมจะยุบเหลือแถวเดียว
> หมายเหตุ: trade log ของ Family Finance มีแถว `side='dividend'` ที่บันทึก "จำนวนหน่วย" ผิดพลาดไม่ได้ — ตารางนี้เป็นแหล่งอ้างอิงปันผลแยกต่างหาก ไม่เขียนทับรายการซื้อขาย

## 7. `financials` — งบการเงิน (ข้อ 6 ลำดับ 6)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| fiscal_year | smallint | พ.ศ./ค.ศ. ตาม `period_label` | งวดบัญชี |
| period_type | text | `Q1..Q4`,`H1`,`H2`,`YTD`,`FY` | ชนิดงวด |
| revenue … operating_cash_flow | numeric(20) | ตาม `unit_scale` + `currency` | งบจริงจากแหล่งข้อมูล |
| eps | numeric(18,6) | บาท/USD ต่อหุ้น | |
| reported_at | date | | วันเผยแพร่งบ (จำเป็นมากถ้าจะ backtest) |

`unique (security_id, fiscal_year, period_type, source_code)`

## 8. `ratios` — อัตราส่วนทางการเงิน (ข้อ 6 ลำดับ 7)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| as_of_date | date | | วันที่ตัวเลขนี้มีผล |
| period_label | text | | งวดที่ใช้คำนวณ |
| pe / pbv / debt_to_equity / ev_ebitda | numeric | เท่า | unitless |
| roe / roa / dividend_yield | numeric(8,4) | % | |
| is_derived | boolean | | `true` = ระบบคำนวณเอง (ข้อ 12) |
| derived_formula | text | | เช่น `sum(12m dividends)/close` |

## 9. `fund_details` / `fund_nav_history` / `fund_holdings` (ข้อ 6 ลำดับ 8–10)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| fund_details.management_company | text | | บลจ. |
| fund_details.fund_type | text | | `Equity`,`Bond`,`Mixed`,`RMF`,`ThaiESG`,`SSF` |
| fund_details.aum / aum_currency | numeric / char(3) | ล้านบาท/พันล้าน ตามที่แหล่งให้ → ระบุใน `notes` | ขนาดกองทุน |
| fund_details.expense_ratio | numeric | % ต่อปี | |
| fund_details.nav_date | date | | วันที่ NAV อ้างอิง |
| fund_nav_history.nav | numeric(18,6) | บาท/หน่วย | ประวัติ NAV (ใช้วาดกราฟมูลค่าพอร์ตแทน close) |
| fund_holdings.asset_name / weight_pct | text / numeric | % | สินทรัพย์ที่กองทุนถือ + น้ำหนัก |

`unique (security_id, nav_date, source_code)` และ `unique (security_id, holding_date, asset_name, source_code)`

## 10. `corporate_actions` (ข้อ 6 ลำดับ 11)

| ฟิลด์ | ชนิด | ความหมาย |
| --- | --- | --- |
| action_type | text | `split`,`reverse_split`,`par_change`,`rights_issue`,`warrant`,`merger`,`spin_off`,`delist`,`name_change`,`symbol_change` |
| ratio | numeric(18,8) | เช่น CRWD 4:1 → `4.0`; ใช้ตรวจ/แก้ `adj_close` และคำนวณยอดถือครอง |
| price | numeric | ราคาจองซื้อ rights/warrant (ถ้ามี) |

> ของจริงที่เจอใน Family Finance: `splitRatio` ใน trade log (CRWD 4:1 ปี 2026) — ตารางนี้ทำให้ฐานข้อมูลกลางมีหลักฐานอ้างอิงโดยไม่ต้องพึ่ง trade log

## 11. `fx_rates` (ข้อ 6 ลำดับ 12)

| ฟิลด์ | ชนิด | หน่วย | ความหมาย |
| --- | --- | --- | --- |
| pair | text | เช่น `USDTHB` | |
| rate_date | date | | วันที่อ้างอิง |
| rate | numeric(18,8) | บาทต่อ 1 หน่วยเงินตรา | เก็บรายวันไว้ถอดมูลค่าหุ้น US เป็นบาทย้อนหลังได้ |

> ปัจจุบันแอปเก็บเรทล่าสุดค่าเดียว (`wealthport:latest-usd-thb`) ทำให้มูลค่าหุ้นต่างประเทศย้อนหลังใช้เรทวันนี้ทั้งเส้น — ตารางนี้คือส่วนที่แก้จุดนั้น (ตรงกับข้อสังเกตที่เคยพบเรื่อง FX gap)

## 12. `data_sources` (ข้อ 6 ลำดับ 13)

| ฟิลด์ | ชนิด | ความหมาย |
| --- | --- | --- |
| source_code | text PK | `settrade`,`yahoo`,`stooq`,`fundman`,`sec_th`,`manual_upload` |
| coverage | text | คำอธิบายสั้นว่าให้ข้อมูลอะไรบ้าง |
| history_limit_days | integer | แหล่งให้ย้อนหลังกี่วัน (`NULL` = ไม่ระบุ) |
| auth_mode | text | `none`,`env_secret`,`oauth`,`manual_upload` — **ไม่ฝัง key ในโค้ดหน้าเว็บ** |
| license_notes | text | สิทธิ์นำข้อมูลไปแสดง/เผยแพร่ (ข้อ 8 ของเอกสาร) |

## 13. `update_logs` (ข้อ 6 ลำดับ 14)

| ฟิลด์ | ชนิด | ความหมาย |
| --- | --- | --- |
| run_id | text | ค่าเดียวกันต่อ 1 รอบการรัน (ใช้ GitHub Actions run id) |
| table_name / security_id | text / uuid | งานไหนล้ม |
| status | text | `ok`,`partial`,`error`,`skipped` |
| rows_upserted | integer | จำนวนแถวที่เขียนจริง |
| message | text | ข้อความ error สั้น ๆ |

---

## Views ที่เตรียมไว้ให้ Phase 2 ใช้ตรวจงาน

| view | ใช้ทำอะไร |
| --- | --- |
| `v_price_coverage` | นับแถวราคา/วันแรก–วันสุดท้ายต่อหลักทรัพย์ → ดูว่า "เก็บครบเท่าที่แหล่งให้" หรือยัง และตัวไหนขาด |
| `v_security_latest` | Family Finance เรียกแถวเดียวจบ (ราคา/NAV ล่าสุด + ชื่อ + สกุลเงิน) แทน quote cache |
| `v_dividend_12m` | ปันผล 12 เดือนย้อนหลัง + `derived_yield_pct` ที่ระบบคำนวณ (แยกจาก yield ของ vendor) |

## สิ่งที่ยังไม่ทำใน Phase 1 (ตามเอกสารข้อ 6 ว่า "อาจเพิ่มทีหลัง")

`trading_calendars`, `benchmarks/index levels`, `fund_distributions`, `data_quality_checks` — และ **ไม่มีตารางพอร์ต/รายการซื้อขาย** โดยตั้งใจ เพราะข้อมูลส่วนบุคคลยังอยู่ใน `user_storage`/`family_storage` ตามหลักการแยกฐานข้อมูลกลางออกจากรายการส่วนตัว
