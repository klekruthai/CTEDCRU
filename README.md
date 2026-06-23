# CTED CHANDRA Curriculum Explorer — Version 2.2 CLO

เว็บไซต์สารสนเทศหลักสูตรครุศาสตรบัณฑิต สาขาวิชาคอมพิวเตอร์ (4 ปี) หลักสูตรปรับปรุง พ.ศ. 2567 คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏจันทรเกษม

## สิ่งที่เพิ่มใน Version 2.2

- เพิ่มหน้า **ผลลัพธ์การเรียนรู้ระดับรายวิชา (CLOs)**
- เพิ่มข้อมูล CLO รวม 316 รายการ จาก 78 รายวิชา
- ค้นหา CLO ด้วยรหัสวิชา ชื่อวิชา รหัส CLO และข้อความผลลัพธ์ได้
- กรอง CLO ตามหมวดวิชาได้
- แสดง CLO ในหน้ารายละเอียดรายวิชาทุกวิชา พร้อมเลขหน้าอ้างอิงจาก มคอ.2
- เพิ่มจำนวน CLO บน Course Card
- ค้นหารายวิชาจากข้อความ CLO ได้จากหน้า Course Explorer
- เพิ่มข้อมูล CLO ในไฟล์ CSV ที่ส่งออก
- คงการปรับ Contrast จาก Version 2.1

## เปิดใช้งาน

เปิดไฟล์ `dist/index.html` ด้วย Chrome, Edge หรือ Firefox ได้ทันที โดยไม่ต้องใช้ฐานข้อมูลหรือ Web Server

บน Windows สามารถดับเบิลคลิก `dist/OPEN_WEBSITE.bat` ได้

## ฟังก์ชันหลัก

- สืบค้นรายวิชา 79 รายวิชา
- แสดง CLO รายวิชา 316 รายการ
- แสดง PLO1–PLO13
- แสดง PTRU Model 17 สมรรถนะ
- แสดงตาราง Course–PLO และ Course–PTRU
- บันทึกรายวิชาที่สนใจด้วย Local Storage
- ส่งออก CSV
- รองรับ Mobile, Tablet และ Desktop
- รองรับ Keyboard Navigation และ Print View

## หมายเหตุด้านข้อมูล CLO

- `GECS2109` มีการระบุ CLO1–CLO2 ในตารางความสอดคล้อง แต่ไม่พบข้อความคำอธิบาย CLO ในส่วนรายละเอียดของเอกสาร เว็บไซต์จึงไม่สร้างข้อความเพิ่มเติม
- `EDUC2501` มีเลข CLO3 และ CLO4 ซ้ำในเอกสารต้นฉบับ เว็บไซต์คงข้อมูลตามต้นฉบับ
- `CTED1304` ระบุ CLO51 และ CLO53–CLO57 โดยไม่พบ CLO52 เว็บไซต์คงเลขตามต้นฉบับ

## Build

ต้องมี Node.js 20 ขึ้นไป

```bash
npm install
npm run build
npm test
```

## โครงสร้างไฟล์

```text
dist/
  index.html
  app.js
  data.js
  styles.css
  assets/CTED 2022-04.jpg
src/
  index.html
  app.js
  data.js
  data.json
  input.css
  CTED 2022-04.jpg
```

ข้อมูลทั้งหมดมาจากไฟล์ `มคอ. 2 CTED 130367.pdf` และโลโก้ `CTED 2022-04.jpg`
