(() => {
  const departments = [
    { name: 'Bachelor of Elementary Education (BEEd)', category: 'Education', short: 'BEEd', details: 'Elementary Education' },
    { name: 'BSEd — Major in English', category: 'Education', short: 'BSEd · English', details: 'Bachelor of Secondary Education' },
    { name: 'BSEd — Major in Filipino', category: 'Education', short: 'BSEd · Filipino', details: 'Bachelor of Secondary Education' },
    { name: 'BSEd — Major in Mathematics', category: 'Education', short: 'BSEd · Mathematics', details: 'Bachelor of Secondary Education' },
    { name: 'BSEd — Major in Social Studies', category: 'Education', short: 'BSEd · Social Studies', details: 'Bachelor of Secondary Education' },
    { name: 'BSEd — Major in Science', category: 'Education', short: 'BSEd · Science', details: 'Bachelor of Secondary Education · offered/expanded' },
    { name: 'Bachelor of Science in Hospitality Management (BSHM)', category: 'HM', short: 'BSHM', details: 'Hospitality Management' },
    { name: 'BS InTech — Major in Computer Technology', category: 'IT', short: 'InTech · Computer', details: 'Bachelor of Science in Industrial Technology' },
    { name: 'BS InTech — Major in Electronics Technology', category: 'IT', short: 'InTech · Electronics', details: 'Bachelor of Science in Industrial Technology' },
    { name: 'Bachelor of Science in Business Administration (BSBA)', category: 'Business', short: 'BSBA', details: 'Business Administration' },
    { name: 'Bachelor of Science in Information Systems (BSIS)', category: 'IT', short: 'BSIS', details: 'Information Systems' },
    { name: 'Bachelor of Physical Education (BPEd)', category: 'Education', short: 'BPEd', details: 'Physical Education' }
  ];
  let students = departments.map((department, index) => ({
    id: `DEMO-${String(1001 + index).padStart(4, '0')}`,
    name: `Sample Student ${String(index + 1).padStart(2, '0')}`,
    username: `student${String(index + 1).padStart(2, '0')}`,
    phone: `+63 ••• ••• ${String(4101 + index).slice(-4)}`,
    department: department.name
  }));
  let selectedDepartment = 'All departments';
  let activeCategory = 'All';
  let toastTimer;
  const grid = document.querySelector('#department-grid');
  const targetSelect = document.querySelector('#announcement-target');
  const rosterSelect = document.querySelector('#roster-department');
  const studentRows = document.querySelector('#student-rows');
  const searchInput = document.querySelector('#student-search');

  function escapeText(value) { return String(value); }
  function updateCounts() { document.querySelector('#program-total').textContent = departments.length; document.querySelector('#student-total').textContent = students.length; }
  function makeOption(select, value, label) { const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option); }
  function refreshDepartmentOptions() {
    [targetSelect, rosterSelect].forEach(select => { const current = select.value || 'All departments'; select.replaceChildren(); makeOption(select, 'All departments', 'All departments'); departments.forEach(dept => makeOption(select, dept.name, dept.short)); if ([...select.options].some(option => option.value === current)) select.value = current; });
    document.querySelector('#target-badge').textContent = targetSelect.value;
  }
  function renderDepartments() {
    grid.replaceChildren();
    departments.filter(dept => activeCategory === 'All' || dept.category === activeCategory).forEach(dept => {
      const count = students.filter(student => student.department === dept.name).length;
      const card = document.createElement('button'); card.type = 'button'; card.className = `dept-card${selectedDepartment === dept.name ? ' selected' : ''}`; card.dataset.department = dept.name;
      const category = document.createElement('span'); category.className = 'dept-category'; category.textContent = dept.category;
      const name = document.createElement('strong'); name.textContent = dept.name;
      const details = document.createElement('small'); details.textContent = dept.details;
      const tag = document.createElement('span'); tag.className = 'count'; tag.textContent = `${count} demo account${count === 1 ? '' : 's'}`;
      card.append(category, name, details, tag); card.addEventListener('click', () => selectDepartment(dept.name)); grid.append(card);
    });
  }
  function selectDepartment(name) { selectedDepartment = name; targetSelect.value = name; rosterSelect.value = name; document.querySelector('#target-badge').textContent = name; renderDepartments(); renderStudents(); notify(`${name === 'All departments' ? 'All departments selected' : `Selected ${name}`}. The composer and masterlist are ready.`); }
  function renderStudents() {
    const filter = rosterSelect.value || 'All departments'; const query = searchInput.value.trim().toLowerCase();
    const visible = students.filter(student => (filter === 'All departments' || student.department === filter) && `${student.name} ${student.id} ${student.username} ${student.department}`.toLowerCase().includes(query));
    studentRows.replaceChildren(); document.querySelector('#no-students').hidden = visible.length > 0;
    visible.forEach(student => {
      const row = document.createElement('tr'); row.dataset.id = student.id;
      const selectCell = document.createElement('td'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'student-check'; checkbox.value = student.id; checkbox.setAttribute('aria-label', `Select ${student.name}`); selectCell.append(checkbox);
      const nameCell = document.createElement('td'); const name = document.createElement('span'); name.className = 'student-name'; name.textContent = student.name; const id = document.createElement('span'); id.className = 'student-sub'; id.textContent = student.id; nameCell.append(name, id);
      const userCell = document.createElement('td'); userCell.textContent = student.username; const deptCell = document.createElement('td'); deptCell.textContent = student.department; const phoneCell = document.createElement('td'); phoneCell.textContent = student.phone;
      const actionCell = document.createElement('td'); const del = document.createElement('button'); del.type = 'button'; del.className = 'student-actions'; del.textContent = 'Delete'; del.addEventListener('click', () => deleteStudents([student.id])); actionCell.append(del);
      row.append(selectCell, nameCell, userCell, deptCell, phoneCell, actionCell); studentRows.append(row);
    });
    document.querySelector('#select-all').checked = visible.length > 0 && visible.every(student => document.querySelector(`.student-check[value="${student.id}"]`)?.checked);
    updateSelectionCount();
  }
  function updateSelectionCount() { const checked = [...document.querySelectorAll('.student-check:checked')]; document.querySelector('#selection-count').textContent = `${checked.length} selected`; document.querySelector('#delete-selected').disabled = checked.length === 0; }
  function deleteStudents(ids) { if (!ids.length) return; const ok = window.confirm(`Delete ${ids.length} selected demo account${ids.length === 1 ? '' : 's'}? This cannot be undone in this prototype.`); if (!ok) return; students = students.filter(student => !ids.includes(student.id)); renderStudents(); renderDepartments(); updateCounts(); notify(`${ids.length} demo account${ids.length === 1 ? '' : 's'} deleted from this page.`); }
  function notify(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200); }
  function setView(view) {
    const views = {
      dashboard: document.querySelector('#dashboard-view'),
      announcements: document.querySelector('#announcements-view'),
      students: document.querySelector('#students-view')
    };
    Object.entries(views).forEach(([name, element]) => { element.hidden = name !== view; });
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'students') renderStudents();
    if (view === 'announcements') document.querySelector('#recent-heading').focus({ preventScroll: true });
  }

  function renderSidebarDepartments() { const nav = document.querySelector('#sidebar-departments'); nav.replaceChildren(); const groups = ['Education', 'IT', 'HM', 'Business', 'Other']; groups.forEach(category => { const subset = departments.filter(dept => dept.category === category); if (!subset.length) return; const categoryButton = document.createElement('button'); categoryButton.type = 'button'; categoryButton.className = 'nav-item'; categoryButton.innerHTML = `<span class="nav-icon">${category === 'Education' ? 'E' : category === 'Business' ? 'B' : category === 'HM' ? 'H' : category === 'IT' ? 'I' : '+'}</span>${category}`; categoryButton.addEventListener('click', () => { activeCategory = category; document.querySelectorAll('[data-category]').forEach(chip => chip.classList.toggle('active', chip.dataset.category === category)); renderDepartments(); }); nav.append(categoryButton); }); }

  document.querySelectorAll('[data-category]').forEach(chip => chip.addEventListener('click', () => { activeCategory = chip.dataset.category; document.querySelectorAll('[data-category]').forEach(item => item.classList.toggle('active', item === chip)); renderDepartments(); }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  const announcementDialog = document.querySelector('#announcement-dialog');
  function openAnnouncementDialog() {
    document.querySelector('#target-badge').textContent = targetSelect.value;
    announcementDialog.showModal();
    document.querySelector('#announcement-title').focus();
  }
  document.querySelectorAll('[data-compose]').forEach(button => button.addEventListener('click', openAnnouncementDialog));
  document.querySelector('#close-announcement-dialog').addEventListener('click', () => announcementDialog.close());
  targetSelect.addEventListener('change', () => { selectedDepartment = targetSelect.value; document.querySelector('#target-badge').textContent = selectedDepartment; rosterSelect.value = selectedDepartment; renderDepartments(); });
  rosterSelect.addEventListener('change', () => { selectedDepartment = rosterSelect.value; targetSelect.value = selectedDepartment; document.querySelector('#target-badge').textContent = selectedDepartment; renderDepartments(); renderStudents(); });
  searchInput.addEventListener('input', renderStudents);
  document.querySelector('#select-all').addEventListener('change', event => { document.querySelectorAll('.student-check').forEach(check => { check.checked = event.target.checked; }); updateSelectionCount(); });
  studentRows.addEventListener('change', event => { if (event.target.matches('.student-check')) updateSelectionCount(); });
  document.querySelector('#delete-selected').addEventListener('click', () => deleteStudents([...document.querySelectorAll('.student-check:checked')].map(check => check.value)));
  document.querySelector('#announcement-form').addEventListener('submit', event => {
    event.preventDefault(); const title = document.querySelector('#announcement-title').value.trim(); const message = document.querySelector('#announcement-message').value.trim(); const type = document.querySelector('#announcement-type').value; const target = targetSelect.value;
    if (!title || !message) { notify('Add a title and message before dispatching.'); return; }
    const announcement = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, message, type, target, createdAt: new Date().toISOString() };
    try {
      const saved = JSON.parse(localStorage.getItem('tcc-announcements') || '[]');
      localStorage.setItem('tcc-announcements', JSON.stringify([announcement, ...(Array.isArray(saved) ? saved : [])].slice(0, 100)));
    } catch { }
    const item = document.createElement('article'); item.className = 'recent-item'; const top = document.createElement('div'); top.className = 'recent-top'; const heading = document.createElement('strong'); heading.textContent = title; const badge = document.createElement('span'); badge.className = `badge ${type}`; badge.textContent = type; top.append(heading, badge); const body = document.createElement('p'); body.textContent = message; const meta = document.createElement('small'); meta.textContent = `To ${target} · Just now · Preview only`; item.append(top, body, meta); const list = document.querySelector('#recent-list'); list.querySelector('.empty')?.remove(); list.prepend(item);
    document.querySelector('#announcement-total').textContent = Number(document.querySelector('#announcement-total').textContent) + 1; event.target.reset(); targetSelect.value = target; document.querySelector('#target-badge').textContent = target; announcementDialog.close(); notify(`Announcement preview created for ${target}. No SMS was sent.`);
  });
  const dialog = document.querySelector('#department-dialog');
  function openDialog() { dialog.showModal(); document.querySelector('#new-department-name').focus(); }
  document.querySelector('#new-department-button').addEventListener('click', openDialog); document.querySelector('#new-department-from-roster').addEventListener('click', openDialog); document.querySelector('#close-dialog').addEventListener('click', () => dialog.close()); document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
  document.querySelector('#department-form').addEventListener('submit', event => { event.preventDefault(); const name = document.querySelector('#new-department-name').value.trim(); const category = document.querySelector('#new-department-category').value; if (!name) return; if (departments.some(dept => dept.name.toLowerCase() === name.toLowerCase())) { notify('That department already exists.'); return; } departments.push({ name, category, short: name, details: `${category} department · added in this prototype` }); refreshDepartmentOptions(); renderDepartments(); renderSidebarDepartments(); updateCounts(); dialog.close(); event.target.reset(); selectDepartment(name); notify(`${name} added to this prototype.`); });
  function logout() { window.location.href = 'index.html'; } document.querySelector('#logout-button').addEventListener('click', logout);
  document.querySelector('#date-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  refreshDepartmentOptions(); renderDepartments(); renderSidebarDepartments(); updateCounts(); renderStudents();
})();
