(() => {
  const programs = {
    BEEd: { department: 'Education', short: 'BEEd', name: 'Bachelor of Elementary Education (BEEd)', audience: 'Bachelor of Elementary Education (BEEd)' },
    'BSEd-English': { department: 'Education', short: 'BSEd English', name: 'Bachelor of Secondary Education, Major in English', audience: 'BSEd — Major in English' },
    'BSEd-Filipino': { department: 'Education', short: 'BSEd Filipino', name: 'Bachelor of Secondary Education, Major in Filipino', audience: 'BSEd — Major in Filipino' },
    'BSEd-Mathematics': { department: 'Education', short: 'BSEd Mathematics', name: 'Bachelor of Secondary Education, Major in Mathematics', audience: 'BSEd — Major in Mathematics' },
    'BSEd-Social-Studies': { department: 'Education', short: 'BSEd Social Studies', name: 'Bachelor of Secondary Education, Major in Social Studies', audience: 'BSEd — Major in Social Studies' },
    'BSEd-Science': { department: 'Education', short: 'BSEd Science', name: 'Bachelor of Secondary Education, Major in Science', audience: 'BSEd — Major in Science' },
    BSHM: { department: 'HM', short: 'BSHM', name: 'Bachelor of Science in Hospitality Management (BSHM)', audience: 'Bachelor of Science in Hospitality Management (BSHM)' },
    'InTech-Computer': { department: 'IT', short: 'InTech Computer', name: 'BS InTech, Major in Computer Technology', audience: 'BS InTech — Major in Computer Technology' },
    'InTech-Electronics': { department: 'IT', short: 'InTech Electronics', name: 'BS InTech, Major in Electronics Technology', audience: 'BS InTech — Major in Electronics Technology' },
    BSBA: { department: 'Business', short: 'BSBA', name: 'Bachelor of Science in Business Administration (BSBA)', audience: 'Bachelor of Science in Business Administration (BSBA)' },
    BSIS: { department: 'IT', short: 'BSIS', name: 'Bachelor of Science in Information Systems (BSIS)', audience: 'Bachelor of Science in Information Systems (BSIS)' },
    BPEd: { department: 'Education', short: 'BPEd', name: 'Bachelor of Physical Education (BPEd)', audience: 'Bachelor of Physical Education (BPEd)' }
  };
  const storageKey = 'tcc-announcements';
  const profileKey = 'tcc-student-profile';
  const samples = [
    { id: 'demo-all-critical', title: 'Campus advisory: schedule update', message: 'Please check the school email and official channels for today\'s updated class schedule.', type: 'critical', target: 'All departments', createdAt: Date.now() - 1800000 },
    { id: 'demo-beed-event', title: 'Future Teachers campus forum', message: 'Join the College of Education forum this Friday at 2:00 PM in the main auditorium.', type: 'event', target: programs.BEEd.audience, createdAt: Date.now() - 14400000 },
    { id: 'demo-all-info', title: 'Library hours this week', message: 'The campus library is open from 8:00 AM to 6:00 PM on weekdays.', type: 'info', target: 'All departments', createdAt: Date.now() - 79200000 }
  ];

  function readAnnouncements() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return [...(Array.isArray(saved) ? saved : []), ...samples];
    } catch {
      return samples;
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    if (Date.now() - date.getTime() < 3600000) return 'Today';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  function addCard(container, item) {
    const card = document.createElement('article');
    card.className = `announcement ${item.type}`;
    const top = document.createElement('div');
    top.className = 'announcement-top';
    const title = document.createElement('h3');
    title.textContent = item.title;
    const badge = document.createElement('span');
    badge.className = `kind ${item.type}`;
    badge.textContent = item.type;
    top.append(title, badge);
    const message = document.createElement('p');
    message.className = 'announcement-body';
    message.textContent = item.message;
    const meta = document.createElement('div');
    meta.className = 'announcement-meta';
    meta.textContent = `${formatDate(item.createdAt)} · ${item.target === 'All departments' ? 'All departments' : 'Your department'}`;
    card.append(top, message, meta);
    container.append(card);
  }

  function render() {
    const announcements = readAnnouncements();
    const profile = readProfile();
    const program = programs[profile.programCode] || programs.BEEd;
    const allItems = announcements.filter(item => item.target === 'All departments');
    const departmentItems = announcements.filter(item => item.target === program.audience);
    const allFeed = document.querySelector('#all-feed');
    const departmentFeed = document.querySelector('#department-feed');
    allFeed.replaceChildren();
    departmentFeed.replaceChildren();
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).forEach(item => addCard(allFeed, item));
    departmentItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).forEach(item => addCard(departmentFeed, item));
    if (!allItems.length) allFeed.innerHTML = '<p class="empty-feed">No school-wide announcements right now.</p>';
    if (!departmentItems.length) departmentFeed.innerHTML = '<p class="empty-feed">No announcements for your department right now.</p>';
    const relevant = [...allItems, ...departmentItems];
    document.querySelector('#all-count').textContent = allItems.length;
    document.querySelector('#department-count').textContent = departmentItems.length;
    document.querySelector('#critical-count').textContent = relevant.filter(item => item.type === 'critical').length;
    document.querySelector('#event-count').textContent = relevant.filter(item => item.type === 'event').length;
    document.querySelector('#announcement-count').textContent = relevant.length;
  }

  function readProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || 'null');
      return saved && typeof saved === 'object' ? saved : { name: 'Jamie Cruz', phone: '+63 912 345 6789', programCode: 'BEEd' };
    } catch {
      return { name: 'Jamie Cruz', phone: '+63 912 345 6789', programCode: 'BEEd' };
    }
  }

  function updateProfileDisplay(profile) {
    const name = profile.name || 'Jamie Cruz';
    const program = programs[profile.programCode] || programs.BEEd;
    document.querySelector('#student-name').textContent = name;
    document.querySelector('#student-avatar').textContent = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    document.querySelector('.topbar h1').textContent = `Welcome back, ${name.split(/\s+/)[0]}`;
    document.querySelector('.program-pill').textContent = program.short;
    document.querySelector('#department-heading').textContent = `For the ${program.department} department`;
    document.querySelector('#department-label').textContent = program.name;
    document.querySelector('#profile-name').value = name;
    document.querySelector('#profile-phone').value = profile.phone || '';
  }

  function showPage(page) {
    const settingsVisible = page === 'settings';
    document.querySelector('#home-view').hidden = settingsVisible;
    document.querySelector('#settings-view').hidden = !settingsVisible;
    document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
    if (settingsVisible) document.querySelector('#profile-name').focus({ preventScroll: true });
  }

  const layout = document.querySelector('.student-layout');
  const menuToggle = document.querySelector('#mobile-menu-toggle');

  function setMobileMenu(open) {
    layout.classList.toggle('sidebar-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuToggle.title = open ? 'Close navigation' : 'Open navigation';
  }

  document.querySelector('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  window.addEventListener('storage', event => { if (event.key === storageKey) render(); });
  window.addEventListener('focus', render);
  menuToggle.addEventListener('click', () => setMobileMenu(!layout.classList.contains('sidebar-open')));
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    showPage(button.dataset.page);
    if (window.matchMedia('(max-width: 620px)').matches) setMobileMenu(false);
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && layout.classList.contains('sidebar-open')) setMobileMenu(false);
  });
  document.querySelector('#account-settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const currentProfile = readProfile();
    const profile = { name: document.querySelector('#profile-name').value.trim(), phone: document.querySelector('#profile-phone').value.trim(), programCode: currentProfile.programCode || 'BEEd' };
    if (!profile.name) return;
    const phoneDigits = profile.phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      const phoneInput = document.querySelector('#profile-phone');
      phoneInput.setCustomValidity('Enter a phone number with 8 to 15 digits, including the country code.');
      phoneInput.reportValidity();
      phoneInput.setCustomValidity('');
      return;
    }
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile));
      updateProfileDisplay(profile);
      render();
      const status = document.querySelector('#settings-status');
      status.textContent = 'Changes saved in this browser prototype.';
      status.className = 'settings-status visible';
    } catch {
      const status = document.querySelector('#settings-status');
      status.textContent = 'Could not save changes in this browser.';
      status.className = 'settings-status visible error';
    }
  });
  document.querySelector('#open-delete-dialog').addEventListener('click', () => document.querySelector('#delete-dialog').showModal());
  document.querySelector('#confirm-delete').addEventListener('click', () => {
    try {
      localStorage.removeItem(profileKey);
      window.location.href = 'index.html';
    } catch {
      const status = document.querySelector('#settings-status');
      status.textContent = 'Could not remove the demo profile from this browser.';
      status.className = 'settings-status visible error';
      document.querySelector('#delete-dialog').close();
    }
  });
  updateProfileDisplay(readProfile());
  render();
})();