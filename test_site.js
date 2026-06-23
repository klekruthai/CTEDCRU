const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const base = '/mnt/data/cted-chandra-v2.2/dist';
let html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const data = fs.readFileSync(path.join(base, 'data.js'), 'utf8');
const app = fs.readFileSync(path.join(base, 'app.js'), 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>/g, '')
  .replace(/<link href="https:\/\/fonts[^>]*>/g, '')
  .replace(/<link rel="stylesheet" href="styles.css" \/>/, '')
  .replace('<script src="data.js"></script>', () => `<script>${data}</script>`)
  .replace('<script src="app.js"></script>', () => `<script>${app}</script>`);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/#home',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.URL.createObjectURL = () => 'blob:test';
    window.URL.revokeObjectURL = () => {};
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
    window.navigator.clipboard = { writeText: async () => {} };
  }
});

const { document, Event, MouseEvent } = dom.window;
function assert(condition, message) { if (!condition) throw new Error(message); }
function click(el) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }

assert(document.querySelector('#home-stats').children.length === 5, 'Home stats not rendered');
assert(document.querySelector('#home-stats').textContent.includes('316'), 'CLO total missing from home stats');
assert(document.querySelectorAll('#featured-courses [data-course-code]').length === 4, 'Featured courses not rendered');

click(document.querySelector('[data-route="courses"]'));
assert(!document.querySelector('#view-courses').classList.contains('hidden'), 'Courses route did not open');
assert(document.querySelector('#course-result-count').textContent.includes('79'), 'Expected 79 courses');
assert(document.querySelectorAll('#course-list article').length === 12, 'Expected first 12 course cards');

const search = document.querySelector('#course-search');
search.value = 'CLO44';
search.dispatchEvent(new Event('input', { bubbles: true }));
assert(document.querySelector('#course-result-count').textContent.includes('1'), 'CLO search should find one course');
assert(document.querySelector('#course-list').textContent.includes('CTED1301'), 'CTED1301 card missing from CLO search');

click(document.querySelector('#course-list [data-course-code="CTED1301"]'));
assert(document.querySelector('#course-dialog').hasAttribute('open'), 'Course dialog did not open');
assert(document.querySelector('#dialog-title').textContent.includes('อินโฟกราฟิก'), 'Course dialog content incorrect');
assert(document.querySelector('#dialog-content').textContent.includes('ผลลัพธ์การเรียนรู้ระดับรายวิชา'), 'CLO heading missing in dialog');
assert(document.querySelectorAll('#dialog-content .clo-item').length === 8, 'CTED1301 should show 8 CLO items');
assert(document.querySelector('#dialog-content').textContent.includes('CLO37'), 'CLO37 missing');
click(document.querySelector('#dialog-close'));

click(document.querySelector('[data-route="clos"]'));
assert(!document.querySelector('#view-clos').classList.contains('hidden'), 'CLO route did not open');
assert(document.querySelector('#clo-total-count').textContent.includes('316'), 'Expected 316 CLO entries');
assert(document.querySelector('#clo-course-count').textContent.includes('78'), 'Expected 78 courses with CLO descriptions');
assert(document.querySelector('#clo-missing-count').textContent.includes('1'), 'Expected one course without CLO description');
assert(document.querySelectorAll('#clo-list article').length === 8, 'Expected first 8 CLO course cards');

const cloSearch = document.querySelector('#clo-search');
cloSearch.value = 'CLO37';
cloSearch.dispatchEvent(new Event('input', { bubbles: true }));
assert(document.querySelector('#clo-status').textContent.includes('1 รายวิชา'), 'CLO page search should find one course');
assert(document.querySelector('#clo-list').textContent.includes('CTED1301'), 'CLO page should show CTED1301');

click(document.querySelector('[data-route="plos"]'));
assert(document.querySelectorAll('#plo-list article').length === 13, 'Expected 13 PLO cards');
assert(document.querySelectorAll('#qualification-body tr').length === 13, 'Qualification matrix should have 13 rows');

click(document.querySelector('[data-route="ptru"]'));
assert(document.querySelectorAll('#ptru-list details').length === 17, 'Expected 17 PTRU cards');

click(document.querySelector('[data-route="matrix"]'));
assert(document.querySelectorAll('#mapping-table tbody tr').length === 79, 'PLO matrix should have 79 course rows');
click(document.querySelector('[data-matrix="ptru"]'));
assert(document.querySelectorAll('#mapping-table thead th').length === 18, 'PTRU matrix should have course column plus 17 competencies');

console.log('PASS: CTED CHANDRA V2.2 CLO interactions verified');
