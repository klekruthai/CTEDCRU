(() => {
  'use strict';

  const data = window.CTED_DATA;
  if (!data || !Array.isArray(data.courses)) {
    document.body.innerHTML = '<main style="padding:2rem;font-family:sans-serif"><h1>ไม่สามารถโหลดข้อมูลหลักสูตรได้</h1><p>กรุณาตรวจสอบไฟล์ data.js</p></main>';
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const normalize = (value = '') => String(value).toLocaleLowerCase('th').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const unique = (values) => [...new Set(values)];
  const pages = (values = []) => unique(values).sort((a, b) => Number(a) - Number(b));

  const categoryNames = {
    all: 'ทุกหมวดวิชา',
    general: 'หมวดวิชาศึกษาทั่วไป',
    teacher: 'กลุ่มวิชาชีพครู',
    major: 'กลุ่มวิชาเอก'
  };
  const categoryChipClasses = {
    general: 'category-chip border-amber-200 bg-amber-50 text-amber-800',
    teacher: 'category-chip border-violet-200 bg-violet-50 text-violet-800',
    major: 'category-chip border-cyan-200 bg-cyan-50 text-cyan-800'
  };
  const routes = ['home', 'courses', 'clos', 'plos', 'ptru', 'matrix', 'about'];

  const state = {
    route: 'home',
    courseQuery: '',
    courseCategory: 'all',
    courseGroup: 'all',
    coursePlo: 'all',
    coursePtru: 'all',
    courseFavoritesOnly: false,
    courseSort: 'code',
    courseVisible: 12,
    cloQuery: '',
    cloCategory: 'all',
    cloVisible: 8,
    ploCategory: 'all',
    ptruQuery: '',
    matrixType: 'plo',
    matrixQuery: '',
    matrixCategory: 'all'
  };

  let favorites = new Set();
  try {
    favorites = new Set(JSON.parse(localStorage.getItem('cted-favorites') || '[]'));
  } catch (_) {
    favorites = new Set();
  }

  const ptruById = new Map(data.ptru.map((item) => [String(item.id), item]));
  const ploById = new Map(data.plos.map((item) => [item.id, item]));
  const courseByCode = new Map(data.courses.map((item) => [item.code, item]));
  const totalCLOs = data.courses.reduce((sum, course) => sum + (course.clos || []).length, 0);
  const coursesWithCLOs = data.courses.filter((course) => (course.clos || []).length > 0).length;

  data.courses.forEach((course) => {
    const ptruNames = course.ptru.map((id) => ptruById.get(String(id))?.name || '').join(' ');
    const cloText = (course.clos || []).map((clo) => `${clo.id} ${clo.description}`).join(' ');
    course.__cloSearch = normalize([course.code, course.thaiName, course.englishName, course.group, cloText].join(' '));
    course.__search = normalize([
      course.code,
      course.thaiName,
      course.englishName,
      course.description,
      course.group,
      categoryNames[course.category],
      course.plos.join(' '),
      ptruNames,
      cloText
    ].join(' '));
    course.__creditTotal = Number.parseInt(String(course.credits || '0'), 10) || 0;
  });

  function saveFavorites() {
    try {
      localStorage.setItem('cted-favorites', JSON.stringify([...favorites]));
    } catch (_) {
      // The site still works if local storage is unavailable.
    }
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2200);
  }

  function parseHash() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return { route: 'home', params: new URLSearchParams() };
    const [routePart, query = ''] = raw.split('?');
    return {
      route: routes.includes(routePart) ? routePart : 'home',
      params: new URLSearchParams(query)
    };
  }

  function buildHash(route, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== false) {
        search.set(key, String(value));
      }
    });
    return `#${route}${search.toString() ? `?${search.toString()}` : ''}`;
  }

  function syncCourseHash(extra = {}) {
    const hash = buildHash('courses', {
      q: state.courseQuery,
      category: state.courseCategory,
      group: state.courseGroup,
      plo: state.coursePlo,
      ptru: state.coursePtru,
      favorites: state.courseFavoritesOnly ? '1' : '',
      sort: state.courseSort === 'code' ? '' : state.courseSort,
      ...extra
    });
    history.replaceState(null, '', hash);
  }

  function syncCloHash(extra = {}) {
    const hash = buildHash('clos', {
      q: state.cloQuery,
      category: state.cloCategory,
      ...extra
    });
    history.replaceState(null, '', hash);
  }

  function setActiveNavigation(route) {
    $$('[data-route]').forEach((button) => {
      const active = button.dataset.route === route;
      button.classList.toggle('is-active', active);
      if (button.classList.contains('nav-button') || button.classList.contains('bottom-nav-button')) {
        button.setAttribute('aria-current', active ? 'page' : 'false');
      }
    });
  }

  function navigate(route, options = {}) {
    if (!routes.includes(route)) route = 'home';
    state.route = route;
    $$('.app-view').forEach((view) => view.classList.add('hidden'));
    $(`#view-${route}`).classList.remove('hidden');
    setActiveNavigation(route);
    $('#mobile-menu').classList.add('hidden');
    $('#mobile-menu-button').setAttribute('aria-expanded', 'false');

    if (options.updateHash !== false) {
      if (route === 'courses') syncCourseHash();
      else if (route === 'clos') syncCloHash();
      else history.pushState(null, '', `#${route}`);
    }

    renderRoute(route);
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: options.smooth ? 'smooth' : 'auto' });
  }

  function renderRoute(route) {
    if (route === 'courses') renderCourses(true);
    if (route === 'clos') renderCLOs(true);
    if (route === 'plos') renderPLOs();
    if (route === 'ptru') renderPTRU();
    if (route === 'matrix') renderMatrix();
  }

  function categoryChip(course) {
    const classes = categoryChipClasses[course.category] || 'category-chip border-slate-200 bg-slate-50 text-slate-700';
    return `<span class="${classes}">${esc(categoryNames[course.category] || course.category)}</span>`;
  }

  function renderHome() {
    $('#home-philosophy').textContent = data.program.philosophy;
    const stats = [
      [data.program.durationYears, 'ปี'],
      [data.program.totalCredits, 'หน่วยกิต'],
      [data.courses.length, 'รายวิชา'],
      [totalCLOs, 'รายการ CLO'],
      [data.ptru.length, 'สมรรถนะ PTRU']
    ];
    $('#home-stats').innerHTML = stats.map(([value, label]) => `
      <div class="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur">
        <div class="font-display text-2xl font-semibold text-cted-yellow">${esc(value)}</div>
        <div class="mt-1 text-xs text-slate-300 sm:text-sm">${esc(label)}</div>
      </div>`).join('');

    $('#home-structure').innerHTML = data.program.structure.map((item, index) => `
      <article class="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div class="text-xs leading-5 text-slate-300">${esc(item.name)}</div>
        <div class="mt-2 font-display text-3xl font-semibold ${index === 0 ? 'text-cted-yellow' : index === 1 ? 'text-cted-cyan' : 'text-white'}">${esc(item.credits)}</div>
        <div class="text-xs text-slate-400">หน่วยกิต</div>
      </article>`).join('');

    const preferred = ['CTED1301', 'CTED2107', 'CTED1304', 'CTED3207'];
    const selected = preferred.map((code) => courseByCode.get(code)).filter(Boolean);
    if (selected.length < 4) {
      data.courses.filter((course) => course.category === 'major').forEach((course) => {
        if (selected.length < 4 && !selected.some((item) => item.code === course.code)) selected.push(course);
      });
    }
    $('#featured-courses').innerHTML = selected.slice(0, 4).map((course) => `
      <button class="featured-course focus-ring flex w-full items-center gap-4 rounded-xl border border-slate-200 p-3 text-left hover:border-cted-cyan hover:bg-cyan-50" data-course-code="${course.code}">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cted-navy font-mono text-[11px] font-bold text-cted-yellow">${esc(course.code.replace('CTED', ''))}</span>
        <span class="min-w-0 flex-1">
          <span class="block font-mono text-xs font-semibold text-cted-cyan-dark">${esc(course.code)}</span>
          <span class="mt-0.5 block truncate text-sm font-medium text-cted-navy">${esc(course.thaiName)}</span>
        </span>
        <span class="text-slate-400" aria-hidden="true">→</span>
      </button>`).join('');
  }

  function populateCourseFilters() {
    const available = data.courses.filter((course) => state.courseCategory === 'all' || course.category === state.courseCategory);
    const groups = unique(available.map((course) => course.group).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'th'));
    $('#course-group').innerHTML = '<option value="all">ทุกกลุ่มวิชา</option>' + groups.map((group) => `<option value="${esc(group)}">${esc(group)}</option>`).join('');
    if (!groups.includes(state.courseGroup)) state.courseGroup = 'all';
    $('#course-group').value = state.courseGroup;

    $('#course-plo').innerHTML = '<option value="all">ทุก PLO</option>' + data.plos.map((plo) => `<option value="${plo.id}">${plo.id} · ${esc(plo.description.slice(0, 62))}${plo.description.length > 62 ? '…' : ''}</option>`).join('');
    $('#course-plo').value = state.coursePlo;

    $('#course-ptru').innerHTML = '<option value="all">ทุกสมรรถนะ</option>' + data.ptru.map((item) => `<option value="${item.id}">${item.id}. ${esc(item.name)}</option>`).join('');
    $('#course-ptru').value = state.coursePtru;
  }

  function getFilteredCourses() {
    const query = normalize(state.courseQuery);
    let courses = data.courses.filter((course) => {
      if (query && !course.__search.includes(query)) return false;
      if (state.courseCategory !== 'all' && course.category !== state.courseCategory) return false;
      if (state.courseGroup !== 'all' && course.group !== state.courseGroup) return false;
      if (state.coursePlo !== 'all' && !course.plos.includes(state.coursePlo)) return false;
      if (state.coursePtru !== 'all' && !course.ptru.map(String).includes(String(state.coursePtru))) return false;
      if (state.courseFavoritesOnly && !favorites.has(course.code)) return false;
      return true;
    });

    courses = [...courses].sort((a, b) => {
      if (state.courseSort === 'name') return a.thaiName.localeCompare(b.thaiName, 'th');
      if (state.courseSort === 'credits') return b.__creditTotal - a.__creditTotal || a.code.localeCompare(b.code);
      return a.code.localeCompare(b.code);
    });
    return courses;
  }

  function courseCard(course) {
    const favorite = favorites.has(course.code);
    const shortDescription = course.description.length > 190 ? `${course.description.slice(0, 190)}…` : course.description;
    return `
      <article class="course-card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-sm font-bold text-cted-cyan-dark">${esc(course.code)}</span>
              ${categoryChip(course)}
            </div>
            <h3 class="mt-3 font-display text-lg font-medium leading-7 text-cted-navy">${esc(course.thaiName)}</h3>
            <p class="mt-1 min-h-5 text-xs text-slate-500">${esc(course.englishName || '')}</p>
          </div>
          <button class="favorite-button focus-ring ${favorite ? 'is-favorite' : ''}" data-favorite-code="${course.code}" aria-label="${favorite ? 'นำออกจากรายการที่บันทึก' : 'บันทึกรายวิชา'}" aria-pressed="${favorite}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.7Z"/></svg>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span class="badge bg-slate-100 text-slate-700">${esc(course.credits)} หน่วยกิต</span>
          <span class="badge bg-slate-100 text-slate-700">${esc(course.group)}</span>
          <span class="badge bg-blue-50 text-blue-800">${(course.clos || []).length} CLO</span>
        </div>
        <p class="mt-4 flex-1 text-sm leading-7 text-slate-600">${esc(shortDescription)}</p>
        <div class="mt-4 flex flex-wrap gap-1.5">
          ${course.plos.slice(0, 4).map((id) => `<span class="badge bg-cyan-50 text-cyan-800">${id}</span>`).join('')}
          ${course.plos.length > 4 ? `<span class="badge bg-slate-100 text-slate-500">+${course.plos.length - 4}</span>` : ''}
          ${course.ptru.slice(0, 3).map((id) => `<span class="badge bg-amber-50 text-amber-800">PTRU ${id}</span>`).join('')}
          ${course.ptru.length > 3 ? `<span class="badge bg-slate-100 text-slate-500">+${course.ptru.length - 3}</span>` : ''}
        </div>
        <button class="course-detail-button focus-ring mt-5 flex w-full items-center justify-between rounded-xl bg-cted-navy px-4 py-3 text-sm font-semibold text-white hover:bg-cted-navy-2" data-course-code="${course.code}">
          ดูรายละเอียดรายวิชา <span aria-hidden="true">→</span>
        </button>
      </article>`;
  }

  function courseFilterSummary(total) {
    const filters = [];
    if (state.courseQuery) filters.push(`คำค้น “${state.courseQuery}”`);
    if (state.courseCategory !== 'all') filters.push(categoryNames[state.courseCategory]);
    if (state.courseGroup !== 'all') filters.push(state.courseGroup);
    if (state.coursePlo !== 'all') filters.push(state.coursePlo);
    if (state.coursePtru !== 'all') filters.push(`PTRU ${state.coursePtru}`);
    if (state.courseFavoritesOnly) filters.push('รายการที่บันทึก');
    return filters.length ? `${filters.join(' · ')} · พบ ${total} รายวิชา` : 'แสดงรายวิชาทั้งหมดในหลักสูตร';
  }

  function renderCourses(resetVisible = false) {
    if (resetVisible) state.courseVisible = 12;
    populateCourseFilters();
    const courses = getFilteredCourses();
    const visible = courses.slice(0, state.courseVisible);
    $('#course-result-count').textContent = `พบ ${courses.length} รายวิชา`;
    $('#course-filter-summary').textContent = courseFilterSummary(courses.length);
    $('#course-list').innerHTML = visible.map(courseCard).join('');
    $('#course-empty').classList.toggle('hidden', courses.length !== 0);
    $('#course-load-more').classList.toggle('hidden', state.courseVisible >= courses.length || courses.length === 0);
  }

  function getFilteredCLOCourses() {
    const query = normalize(state.cloQuery);
    return data.courses
      .filter((course) => {
        if (state.cloCategory !== 'all' && course.category !== state.cloCategory) return false;
        if (query && !course.__cloSearch.includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  function cloCourseCard(course) {
    const clos = course.clos || [];
    const note = course.cloNote ? `<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950"><strong>หมายเหตุ:</strong> ${esc(course.cloNote)}</div>` : '';
    const list = clos.length ? `
      <ol class="mt-5 space-y-3">
        ${clos.map((clo, index) => `
          <li class="clo-item">
            <div class="flex items-start gap-3">
              <span class="clo-id">${esc(clo.id)}</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm leading-7 text-slate-700">${esc(clo.description)}</p>
                <p class="mt-1 text-[11px] font-medium text-slate-500">แหล่งอ้างอิง: มคอ.2 หน้า ${esc(clo.sourcePage)}</p>
              </div>
            </div>
          </li>`).join('')}
      </ol>` : '<div class="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-600">ไม่พบข้อความคำอธิบาย CLO ของรายวิชานี้ในส่วนรายละเอียดของเอกสาร</div>';

    return `
      <article class="clo-course-card">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-sm font-bold text-cted-cyan-dark">${esc(course.code)}</span>
              ${categoryChip(course)}
            </div>
            <h2 class="mt-2 font-display text-xl font-medium leading-8 text-cted-navy">${esc(course.thaiName)}</h2>
            <p class="mt-1 text-xs text-slate-500">${esc(course.englishName || '')}</p>
          </div>
          <span class="clo-count-badge">${clos.length} CLO</span>
        </div>
        ${list}
        ${note}
        <button class="focus-ring mt-5 flex w-full items-center justify-between rounded-xl border border-cted-cyan px-4 py-3 text-sm font-semibold text-cted-cyan-dark hover:bg-cyan-50" data-course-code="${course.code}">
          เปิดรายละเอียดรายวิชา <span aria-hidden="true">→</span>
        </button>
      </article>`;
  }

  function renderCLOs(resetVisible = false) {
    if (resetVisible) state.cloVisible = 8;
    const courses = getFilteredCLOCourses();
    const visible = courses.slice(0, state.cloVisible);
    const shownCLOs = courses.reduce((sum, course) => sum + (course.clos || []).length, 0);
    $('#clo-total-count').textContent = totalCLOs.toLocaleString('th-TH');
    $('#clo-course-count').textContent = coursesWithCLOs.toLocaleString('th-TH');
    $('#clo-missing-count').textContent = (data.courses.length - coursesWithCLOs).toLocaleString('th-TH');
    $('#clo-status').textContent = `พบ ${courses.length} รายวิชา · รวม ${shownCLOs} รายการ CLO`;
    $('#clo-list').innerHTML = visible.map(cloCourseCard).join('');
    $('#clo-empty').classList.toggle('hidden', courses.length !== 0);
    $('#clo-load-more').classList.toggle('hidden', state.cloVisible >= courses.length || courses.length === 0);
  }

  function toggleFavorite(code) {
    if (favorites.has(code)) {
      favorites.delete(code);
      showToast('นำรายวิชาออกจากรายการที่บันทึกแล้ว');
    } else {
      favorites.add(code);
      showToast('บันทึกรายวิชาแล้ว');
    }
    saveFavorites();
    renderCourses(false);
  }

  function courseDetailContent(course) {
    const ploContent = course.plos.length ? course.plos.map((id) => {
      const plo = ploById.get(id);
      return `<button class="focus-ring rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-left hover:border-cted-cyan" data-filter-plo="${id}"><span class="font-mono text-xs font-bold text-cted-cyan-dark">${id}</span><span class="mt-1 block text-sm leading-6 text-slate-700">${esc(plo?.description || '')}</span></button>`;
    }).join('') : '<p class="text-sm text-slate-500">ไม่พบข้อมูล PLO ในเอกสาร</p>';

    const ptruContent = course.ptru.length ? course.ptru.map((id) => {
      const item = ptruById.get(String(id));
      return `<button class="focus-ring rounded-xl border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400" data-filter-ptru="${id}"><span class="text-xs font-bold text-amber-800">PTRU ${id}</span><span class="mt-1 block text-sm leading-6 text-slate-700">${esc(item?.name || '')}</span></button>`;
    }).join('') : '<p class="text-sm text-slate-500">รายวิชานี้ไม่มีรายการเชื่อมโยง PTRU ในตารางของเอกสาร</p>';

    const cloContent = (course.clos || []).length ? `
      <ol class="space-y-3">
        ${(course.clos || []).map((clo) => `
          <li class="clo-item">
            <div class="flex items-start gap-3">
              <span class="clo-id">${esc(clo.id)}</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm leading-7 text-slate-700">${esc(clo.description)}</p>
                <p class="mt-1 text-[11px] font-medium text-slate-500">มคอ.2 หน้า ${esc(clo.sourcePage)}</p>
              </div>
            </div>
          </li>`).join('')}
      </ol>` : '<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-600">ไม่พบข้อความคำอธิบาย CLO ของรายวิชานี้ในส่วนรายละเอียดของเอกสาร</div>';
    const cloNote = course.cloNote ? `<div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950"><strong>หมายเหตุจากเอกสาร:</strong> ${esc(course.cloNote)}</div>` : '';

    return `
      <div class="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div class="space-y-6">
          <section>
            <h3 class="font-display text-lg font-medium text-cted-navy">คำอธิบายรายวิชา</h3>
            <p class="mt-3 whitespace-pre-line text-sm leading-8 text-slate-700">${esc(course.description)}</p>
          </section>
          <section>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-display text-lg font-medium text-cted-navy">ผลลัพธ์การเรียนรู้ระดับรายวิชา (CLOs)</h3>
              <span class="clo-count-badge">${(course.clos || []).length} CLO</span>
            </div>
            <div class="mt-3">${cloContent}</div>
            ${cloNote}
          </section>
          <section>
            <h3 class="font-display text-lg font-medium text-cted-navy">ผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLOs)</h3>
            <div class="mt-3 grid gap-3">${ploContent}</div>
          </section>
          <section>
            <h3 class="font-display text-lg font-medium text-cted-navy">สมรรถนะ PTRU Model</h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">${ptruContent}</div>
          </section>
        </div>
        <aside class="h-fit rounded-2xl bg-slate-50 p-5">
          <dl class="space-y-4 text-sm">
            <div><dt class="text-xs font-semibold text-slate-500">หน่วยกิต</dt><dd class="mt-1 font-medium text-cted-navy">${esc(course.credits)}</dd></div>
            <div><dt class="text-xs font-semibold text-slate-500">หมวดวิชา</dt><dd class="mt-1">${esc(categoryNames[course.category])}</dd></div>
            <div><dt class="text-xs font-semibold text-slate-500">กลุ่มวิชา</dt><dd class="mt-1">${esc(course.group)}</dd></div>
            <div><dt class="text-xs font-semibold text-slate-500">จำนวน CLO</dt><dd class="mt-1 font-medium text-cted-navy">${(course.clos || []).length} รายการ</dd></div>
            <div><dt class="text-xs font-semibold text-slate-500">หน้าอ้างอิง CLO</dt><dd class="mt-1 leading-6">${(course.cloSourcePages || []).length ? `มคอ.2 หน้า ${pages(course.cloSourcePages).join(', ')}` : 'ไม่พบคำอธิบายในเอกสาร'}</dd></div>
            <div><dt class="text-xs font-semibold text-slate-500">แหล่งอ้างอิงรายวิชา</dt><dd class="mt-1 leading-6">มคอ.2 หน้า ${pages(course.sourcePages).join(', ')}</dd></div>
          </dl>
          <div class="mt-5 grid gap-2">
            <button class="focus-ring rounded-xl bg-cted-yellow px-4 py-3 text-sm font-semibold text-cted-navy hover:brightness-95" data-copy-course="${course.code}">คัดลอกลิงก์รายวิชา</button>
            <button class="focus-ring rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white" data-favorite-code="${course.code}">${favorites.has(course.code) ? 'นำออกจากรายการที่บันทึก' : 'บันทึกรายวิชา'}</button>
          </div>
        </aside>
      </div>`;
  }

  function openCourse(code, updateHash = true) {
    const course = courseByCode.get(code);
    if (!course) return;
    $('#dialog-code').textContent = course.code;
    $('#dialog-title').textContent = course.thaiName;
    $('#dialog-english').textContent = course.englishName || '';
    $('#dialog-content').innerHTML = courseDetailContent(course);
    const dialog = $('#course-dialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (updateHash) {
      if (state.route === 'clos') syncCloHash({ course: code });
      else syncCourseHash({ course: code });
    }
  }

  function closeCourse(updateHash = true) {
    const dialog = $('#course-dialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (updateHash && state.route === 'courses') syncCourseHash();
    if (updateHash && state.route === 'clos') syncCloHash();
  }

  async function copyCourseLink(code) {
    const link = `${location.href.split('#')[0]}${buildHash('courses', { course: code })}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('คัดลอกลิงก์รายวิชาแล้ว');
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showToast('คัดลอกลิงก์รายวิชาแล้ว');
    }
  }

  function goToCourses(filter = {}) {
    state.courseQuery = filter.query || '';
    state.courseCategory = filter.category || 'all';
    state.courseGroup = filter.group || 'all';
    state.coursePlo = filter.plo || 'all';
    state.coursePtru = filter.ptru ? String(filter.ptru) : 'all';
    state.courseFavoritesOnly = false;
    state.courseVisible = 12;
    updateCourseControls();
    navigate('courses');
  }

  function updateCourseControls() {
    $('#course-search').value = state.courseQuery;
    $('#course-category').value = state.courseCategory;
    $('#course-group').value = state.courseGroup;
    $('#course-plo').value = state.coursePlo;
    $('#course-ptru').value = state.coursePtru;
    $('#course-favorites-only').checked = state.courseFavoritesOnly;
    $('#course-sort').value = state.courseSort;
  }

  function exportCourses() {
    const courses = getFilteredCourses();
    const rows = [
      ['รหัสวิชา', 'ชื่อวิชา', 'ชื่อภาษาอังกฤษ', 'หน่วยกิต', 'หมวดวิชา', 'กลุ่มวิชา', 'CLO', 'PLO', 'PTRU', 'คำอธิบายรายวิชา'],
      ...courses.map((course) => [
        course.code,
        course.thaiName,
        course.englishName,
        course.credits,
        categoryNames[course.category],
        course.group,
        (course.clos || []).map((clo) => `${clo.id}: ${clo.description}`).join(' | '),
        course.plos.join('|'),
        course.ptru.join('|'),
        course.description
      ])
    ];
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'CTED_Courses.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(`ส่งออก ${courses.length} รายวิชาแล้ว`);
  }

  function renderPLOs() {
    const categories = ['all', 'หมวดวิชาศึกษาทั่วไป', 'กลุ่มวิชาชีพครู', 'กลุ่มวิชาเอก'];
    $('#plo-tabs').innerHTML = categories.map((category) => `
      <button class="focus-ring rounded-full border px-4 py-2 text-sm font-medium ${state.ploCategory === category ? 'border-cted-cyan bg-cted-cyan text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-cted-cyan'}" data-plo-category="${esc(category)}">${category === 'all' ? 'ทั้งหมด' : esc(category)}</button>`).join('');

    const items = data.plos.filter((plo) => state.ploCategory === 'all' || plo.category === state.ploCategory);
    $('#plo-list').innerHTML = items.map((plo) => {
      const courses = data.courses.filter((course) => course.plos.includes(plo.id));
      return `
        <article class="content-card flex flex-col">
          <div class="flex items-start gap-4">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cted-navy font-display text-base font-semibold text-cted-yellow">${plo.id}</div>
            <div class="min-w-0">
              <div class="text-xs font-semibold text-cted-cyan-dark">${esc(plo.category)}</div>
              <p class="mt-2 leading-8 text-slate-700">${esc(plo.description)}</p>
            </div>
          </div>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div class="flex flex-wrap gap-1.5">${plo.qualificationDimensions.map((code) => `<span class="badge bg-slate-100 text-slate-700">${code}</span>`).join('')}</div>
            <button class="focus-ring rounded-xl bg-cyan-50 px-4 py-2 text-sm font-semibold text-cted-cyan-dark hover:bg-cyan-100" data-filter-plo="${plo.id}">ดู ${courses.length} รายวิชา</button>
          </div>
          <div class="mt-3 text-xs text-slate-400">อ้างอิง มคอ.2 หน้า ${pages(plo.sourcePages).join(', ')}</div>
        </article>`;
    }).join('');
  }

  function renderQualification() {
    const dimensions = ['R', 'U', 'Ap', 'An', 'E', 'C', 'S', 'Et', 'At'];
    $('#qualification-legend').innerHTML = Object.entries(data.qualificationLegend).map(([code, label]) => `<span class="qualification-legend-item rounded-full px-3 py-1.5 text-xs"><strong class="qualification-legend-code">${code}</strong> ${esc(label)}</span>`).join('');
    $('#qualification-body').innerHTML = data.plos.map((plo) => `
      <tr>
        <th scope="row" class="sticky-col qualification-plo-cell text-left">${plo.id}</th>
        <td class="min-w-[420px] leading-6">${esc(plo.description)}</td>
        ${dimensions.map((dimension) => `<td class="text-center">${plo.qualificationDimensions.includes(dimension) ? '<span class="matrix-check">✓</span>' : '<span class="empty-mark" aria-label="ไม่เชื่อมโยง">–</span>'}</td>`).join('')}
      </tr>`).join('');
  }

  function renderPTRU() {
    const query = normalize(state.ptruQuery);
    const items = data.ptru.filter((item) => !query || normalize([item.id, item.name, item.english, item.description].join(' ')).includes(query));
    $('#ptru-list').innerHTML = items.map((item) => {
      const courses = data.courses.filter((course) => course.ptru.map(String).includes(String(item.id)));
      return `
        <details class="group content-card">
          <summary class="focus-ring cursor-pointer list-none rounded-lg">
            <div class="flex items-start gap-4">
              <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-cted-yellow font-display text-lg font-semibold text-cted-navy">${String(item.id).padStart(2, '0')}</div>
              <div class="min-w-0 flex-1">
                <h2 class="font-display text-lg font-medium leading-7 text-cted-navy">${esc(item.name)}</h2>
                <p class="mt-1 text-sm text-slate-500">${esc(item.english)}</p>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <span class="text-xs font-medium text-cted-cyan-dark">เชื่อมโยง ${courses.length} รายวิชา</span>
                  <span class="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </div>
              </div>
            </div>
          </summary>
          <div class="mt-4 border-t border-slate-100 pt-4">
            <p class="text-sm leading-8 text-slate-600">${esc(item.description)}</p>
            <button class="focus-ring mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100" data-filter-ptru="${item.id}">ดู ${courses.length} รายวิชาที่เกี่ยวข้อง</button>
            <div class="mt-3 text-xs text-slate-400">อ้างอิง มคอ.2 หน้า ${pages(item.sourcePages).join(', ')}</div>
          </div>
        </details>`;
    }).join('');
  }

  function filteredMatrixCourses() {
    const query = normalize(state.matrixQuery);
    return data.courses.filter((course) => {
      if (query && !course.__search.includes(query)) return false;
      if (state.matrixCategory !== 'all' && course.category !== state.matrixCategory) return false;
      return true;
    });
  }

  function renderMatrix() {
    $$('.matrix-tab').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.matrix === state.matrixType)));
    const courses = filteredMatrixCourses();
    $('#matrix-status').textContent = `แสดง ${courses.length} รายวิชา · ${state.matrixType === 'plo' ? 'เชื่อมโยงกับ PLO1–PLO13' : 'เชื่อมโยงกับ PTRU 1–17'}`;
    const table = $('#mapping-table');

    if (state.matrixType === 'plo') {
      table.innerHTML = `
        <caption class="sr-only">ตารางความสัมพันธ์ระหว่างรายวิชากับ PLO</caption>
        <thead><tr><th class="sticky-col text-left">รายวิชา</th>${data.plos.map((plo) => `<th title="${esc(plo.description)}">${plo.id}</th>`).join('')}</tr></thead>
        <tbody>${courses.map((course) => `
          <tr>
            <th class="sticky-col text-left"><button class="focus-ring rounded text-left" data-course-code="${course.code}"><span class="block font-mono text-[11px] font-bold text-cted-cyan-dark">${course.code}</span><span class="mt-1 block whitespace-normal font-medium leading-5 text-slate-800">${esc(course.thaiName)}</span></button></th>
            ${data.plos.map((plo) => `<td class="text-center">${course.plos.includes(plo.id) ? '<span class="matrix-check">✓</span>' : '<span class="empty-mark" aria-label="ไม่เชื่อมโยง">–</span>'}</td>`).join('')}
          </tr>`).join('')}</tbody>`;
    } else {
      table.innerHTML = `
        <caption class="sr-only">ตารางความสัมพันธ์ระหว่างรายวิชากับ PTRU Model</caption>
        <thead><tr><th class="sticky-col text-left">รายวิชา</th>${data.ptru.map((item) => `<th title="${esc(item.name)}">${item.id}</th>`).join('')}</tr></thead>
        <tbody>${courses.map((course) => `
          <tr>
            <th class="sticky-col text-left"><button class="focus-ring rounded text-left" data-course-code="${course.code}"><span class="block font-mono text-[11px] font-bold text-cted-cyan-dark">${course.code}</span><span class="mt-1 block whitespace-normal font-medium leading-5 text-slate-800">${esc(course.thaiName)}</span></button></th>
            ${data.ptru.map((item) => `<td class="text-center">${course.ptru.map(String).includes(String(item.id)) ? '<span class="matrix-check ptru">✓</span>' : '<span class="empty-mark" aria-label="ไม่เชื่อมโยง">–</span>'}</td>`).join('')}
          </tr>`).join('')}</tbody>`;
    }
  }

  function renderAbout() {
    const p = data.program;
    $('#about-vision').textContent = p.vision;
    $('#about-philosophy').textContent = p.philosophy;
    $('#program-meta').innerHTML = [
      ['ชื่อหลักสูตร', p.thaiName],
      ['ชื่อภาษาอังกฤษ', p.englishName],
      ['ชื่อปริญญา', `${p.degreeThai} · ${p.degreeAbbrThai}`],
      ['ระยะเวลา', `${p.durationYears} ปี`],
      ['หน่วยกิตรวม', `${p.totalCredits} หน่วยกิต`],
      ['หน่วยงาน', `${p.faculty} · ${p.university}`]
    ].map(([term, value]) => `<div class="border-b border-white/10 pb-3"><dt class="text-xs text-slate-400">${esc(term)}</dt><dd class="mt-1 leading-6 text-white">${esc(value)}</dd></div>`).join('');
    $('#identity-list').innerHTML = p.identity.map((item, index) => `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-xl ${index === 0 ? 'bg-cted-yellow text-cted-navy' : 'bg-cted-cyan text-white'} font-display text-xl font-semibold">${esc(item.key)}</span><div><div class="font-display text-lg font-medium text-cted-navy">${esc(item.value)}</div></div></div>
        <p class="mt-3 text-sm leading-7 text-slate-600">${esc(item.description)}</p>
      </div>`).join('');
    $('#career-list').innerHTML = p.careers.map((career) => `<li class="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-cted-cyan"></span><span>${esc(career)}</span></li>`).join('');
  }

  function applyHashState() {
    const { route, params } = parseHash();
    state.route = route;
    if (route === 'courses') {
      state.courseQuery = params.get('q') || '';
      state.courseCategory = ['general', 'teacher', 'major'].includes(params.get('category')) ? params.get('category') : 'all';
      state.courseGroup = params.get('group') || 'all';
      state.coursePlo = ploById.has(params.get('plo')) ? params.get('plo') : 'all';
      state.coursePtru = ptruById.has(params.get('ptru')) ? params.get('ptru') : 'all';
      state.courseFavoritesOnly = params.get('favorites') === '1';
      state.courseSort = ['name', 'credits'].includes(params.get('sort')) ? params.get('sort') : 'code';
      updateCourseControls();
    }
    if (route === 'clos') {
      state.cloQuery = params.get('q') || '';
      state.cloCategory = ['general', 'teacher', 'major'].includes(params.get('category')) ? params.get('category') : 'all';
      $('#clo-search').value = state.cloQuery;
      $('#clo-category').value = state.cloCategory;
    }
    navigate(route, { updateHash: false, scroll: false });
    const courseCode = params.get('course');
    if (courseCode && courseByCode.has(courseCode)) setTimeout(() => openCourse(courseCode, false), 0);
  }

  function handleRouteButton(button) {
    const route = button.dataset.route;
    if (route === 'courses') {
      state.courseQuery = '';
      state.courseCategory = 'all';
      state.courseGroup = 'all';
      state.coursePlo = 'all';
      state.coursePtru = 'all';
      state.courseFavoritesOnly = false;
      updateCourseControls();
    }
    if (route === 'clos') {
      state.cloQuery = '';
      state.cloCategory = 'all';
      state.cloVisible = 8;
      $('#clo-search').value = '';
      $('#clo-category').value = 'all';
    }
    navigate(route);
  }

  function attachEvents() {
    document.addEventListener('click', (event) => {
      const routeButton = event.target.closest('[data-route]');
      if (routeButton) {
        handleRouteButton(routeButton);
        return;
      }

      const courseButton = event.target.closest('[data-course-code]');
      if (courseButton) {
        openCourse(courseButton.dataset.courseCode);
        return;
      }

      const favoriteButton = event.target.closest('[data-favorite-code]');
      if (favoriteButton) {
        toggleFavorite(favoriteButton.dataset.favoriteCode);
        const dialog = $('#course-dialog');
        if (dialog.hasAttribute('open')) {
          const course = courseByCode.get(favoriteButton.dataset.favoriteCode);
          $('#dialog-content').innerHTML = courseDetailContent(course);
        }
        return;
      }

      const ploButton = event.target.closest('[data-filter-plo]');
      if (ploButton) {
        closeCourse(false);
        goToCourses({ plo: ploButton.dataset.filterPlo });
        return;
      }

      const ptruButton = event.target.closest('[data-filter-ptru]');
      if (ptruButton) {
        closeCourse(false);
        goToCourses({ ptru: ptruButton.dataset.filterPtru });
        return;
      }

      const copyButton = event.target.closest('[data-copy-course]');
      if (copyButton) {
        copyCourseLink(copyButton.dataset.copyCourse);
        return;
      }

      const ploCategory = event.target.closest('[data-plo-category]');
      if (ploCategory) {
        state.ploCategory = ploCategory.dataset.ploCategory;
        renderPLOs();
      }
    });

    $('#mobile-menu-button').addEventListener('click', () => {
      const menu = $('#mobile-menu');
      const willOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      $('#mobile-menu-button').setAttribute('aria-expanded', String(willOpen));
    });

    const runHomeSearch = () => goToCourses({ query: $('#home-search').value.trim() });
    $('#home-search-button').addEventListener('click', runHomeSearch);
    $('#home-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') runHomeSearch(); });
    $('#header-search-button').addEventListener('click', () => goToCourses({}));

    $('#course-search').addEventListener('input', (event) => { state.courseQuery = event.target.value; renderCourses(true); syncCourseHash(); });
    $('#course-category').addEventListener('change', (event) => { state.courseCategory = event.target.value; state.courseGroup = 'all'; renderCourses(true); syncCourseHash(); });
    $('#course-group').addEventListener('change', (event) => { state.courseGroup = event.target.value; renderCourses(true); syncCourseHash(); });
    $('#course-plo').addEventListener('change', (event) => { state.coursePlo = event.target.value; renderCourses(true); syncCourseHash(); });
    $('#course-ptru').addEventListener('change', (event) => { state.coursePtru = event.target.value; renderCourses(true); syncCourseHash(); });
    $('#course-favorites-only').addEventListener('change', (event) => { state.courseFavoritesOnly = event.target.checked; renderCourses(true); syncCourseHash(); });
    $('#course-sort').addEventListener('change', (event) => { state.courseSort = event.target.value; renderCourses(true); syncCourseHash(); });
    $('#course-load-more').addEventListener('click', () => { state.courseVisible += 12; renderCourses(false); });
    $('#course-export').addEventListener('click', exportCourses);
    $('#course-clear').addEventListener('click', () => {
      state.courseQuery = '';
      state.courseCategory = 'all';
      state.courseGroup = 'all';
      state.coursePlo = 'all';
      state.coursePtru = 'all';
      state.courseFavoritesOnly = false;
      state.courseSort = 'code';
      updateCourseControls();
      renderCourses(true);
      syncCourseHash();
    });

    $('#clo-search').addEventListener('input', (event) => { state.cloQuery = event.target.value; renderCLOs(true); syncCloHash(); });
    $('#clo-category').addEventListener('change', (event) => { state.cloCategory = event.target.value; renderCLOs(true); syncCloHash(); });
    $('#clo-clear').addEventListener('click', () => {
      state.cloQuery = '';
      state.cloCategory = 'all';
      $('#clo-search').value = '';
      $('#clo-category').value = 'all';
      renderCLOs(true);
      syncCloHash();
    });
    $('#clo-load-more').addEventListener('click', () => { state.cloVisible += 8; renderCLOs(false); });

    $('#ptru-search').addEventListener('input', (event) => { state.ptruQuery = event.target.value; renderPTRU(); });

    $$('.matrix-tab').forEach((button) => button.addEventListener('click', () => {
      state.matrixType = button.dataset.matrix;
      renderMatrix();
    }));
    $('#matrix-search').addEventListener('input', (event) => { state.matrixQuery = event.target.value; renderMatrix(); });
    $('#matrix-category').addEventListener('change', (event) => { state.matrixCategory = event.target.value; renderMatrix(); });
    $('#matrix-print').addEventListener('click', () => window.print());

    $('#dialog-close').addEventListener('click', () => closeCourse());
    $('#course-dialog').addEventListener('cancel', (event) => { event.preventDefault(); closeCourse(); });
    $('#course-dialog').addEventListener('click', (event) => {
      if (event.target === $('#course-dialog')) closeCourse();
    });

    window.addEventListener('hashchange', () => {
      const dialog = $('#course-dialog');
      if (dialog.hasAttribute('open')) closeCourse(false);
      applyHashState();
    });
  }

  function init() {
    renderHome();
    renderQualification();
    renderAbout();
    populateCourseFilters();
    updateCourseControls();
    attachEvents();
    applyHashState();
  }

  init();
})();
