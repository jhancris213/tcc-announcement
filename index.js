(() => {
  const loginTab = document.querySelector('#login-tab');
  const signupTab = document.querySelector('#signup-tab');
  const loginPanel = document.querySelector('#login-panel');
  const signupPanel = document.querySelector('#signup-panel');
  const authCard = document.querySelector('.auth-card');
  const title = document.querySelector('#form-title');
  const subtitle = document.querySelector('#form-subtitle');
  const loginForm = document.querySelector('#login-form');
  const signupForm = document.querySelector('#signup-form');
  const phoneInput = document.querySelector('#contact-number');
  const verificationField = document.querySelector('#verification-field');
  const verificationInput = document.querySelector('#verification-code');
  const verificationHint = document.querySelector('#verification-hint');
  const resendButton = document.querySelector('#resend-code');
  const signupButton = document.querySelector('#signup-submit');
  let verifiedPhone = '';
  let resendTimer;

  function setTab(mode) {
    const signingUp = mode === 'signup';
    loginTab.setAttribute('aria-selected', String(!signingUp));
    signupTab.setAttribute('aria-selected', String(signingUp));
    loginTab.tabIndex = signingUp ? -1 : 0;
    signupTab.tabIndex = signingUp ? 0 : -1;
    loginPanel.hidden = signingUp;
    signupPanel.hidden = !signingUp;
    authCard.classList.toggle('signup-active', signingUp);
    title.textContent = signingUp ? 'Create your account' : 'Welcome back';
    subtitle.textContent = signingUp ? 'Sign up to receive important school event alerts.' : "Log in to keep up with what's happening at school.";
    document.querySelector(signingUp ? '#signup-username' : '#login-username').focus({ preventScroll: true });
  }

  loginTab.addEventListener('click', () => setTab('login'));
  signupTab.addEventListener('click', () => setTab('signup'));
  document.querySelectorAll('[data-open-signup]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setTab('signup'); }));
  document.querySelectorAll('[data-open-login]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setTab('login'); }));
  document.querySelectorAll('.toggle-password').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(show));
  }));

  const setStatus = (element, message, kind = '') => {
    element.textContent = message;
    element.className = `status-message visible${kind ? ` ${kind}` : ''}`;
  };
  const clearStatus = (element) => { element.textContent = ''; element.className = 'status-message'; };
  const normalizePhone = (value) => `+${value.replace(/\D/g, '')}`;
  const validInternationalShape = (value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 && /^[1-9]/.test(digits);
  };

  function startCountdown() {
    let seconds = 30;
    resendButton.disabled = true;
    resendButton.textContent = `Resend in ${seconds}s`;
    window.clearInterval(resendTimer);
    resendTimer = window.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        window.clearInterval(resendTimer);
        resendButton.disabled = false;
        resendButton.textContent = 'Resend code';
      } else resendButton.textContent = `Resend in ${seconds}s`;
    }, 1000);
  }

  function requestDemoCode() {
    const status = document.querySelector('#signup-status');
    clearStatus(status);
    if (!validInternationalShape(phoneInput.value)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      setStatus(status, 'Enter a number in international format with 8–15 digits, including its country code.', 'error');
      phoneInput.focus();
      return;
    }
    phoneInput.removeAttribute('aria-invalid');
    verifiedPhone = '';
    verificationInput.value = '';
    signupButton.disabled = true;
    verificationField.hidden = false;
    verificationHint.classList.add('visible');
    setStatus(status, `Prototype only: no SMS was sent. Use 123456 to preview verification for ${normalizePhone(phoneInput.value)}.`, 'demo');
    startCountdown();
    verificationInput.focus();
  }

  document.querySelector('#send-code').addEventListener('click', requestDemoCode);
  resendButton.addEventListener('click', requestDemoCode);
  verificationInput.addEventListener('input', () => {
    const status = document.querySelector('#signup-status');
    if (verificationInput.value === '123456' && verificationInput.value.length === 6) {
      verifiedPhone = normalizePhone(phoneInput.value);
      signupButton.disabled = false;
      signupButton.firstChild.textContent = 'Create account ';
      setStatus(status, 'Demo verification complete. This did not verify a real phone number or create an account.', 'demo');
    } else {
      verifiedPhone = '';
      signupButton.disabled = true;
      signupButton.firstChild.textContent = 'Verify number to sign up ';
      if (verificationInput.value.length === 6) setStatus(status, 'That demo code is not correct. Try 123456.', 'error');
    }
  });
  phoneInput.addEventListener('input', () => {
    if (verifiedPhone && normalizePhone(phoneInput.value) !== verifiedPhone) {
      verifiedPhone = '';
      signupButton.disabled = true;
      signupButton.firstChild.textContent = 'Verify number to sign up ';
      verificationField.hidden = true;
      verificationHint.classList.remove('visible');
      window.clearInterval(resendTimer);
      resendButton.disabled = true;
      resendButton.textContent = 'Resend in 30s';
      clearStatus(document.querySelector('#signup-status'));
    }
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.querySelector('#login-status');
    clearStatus(status);
    if (loginForm.reportValidity()) setStatus(status, 'Login screen prototype only. Connect Supabase Auth to validate credentials and create a real session.', 'demo');
  });
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.querySelector('#signup-status');
    if (!signupForm.reportValidity()) return;
    if (!verifiedPhone || normalizePhone(phoneInput.value) !== verifiedPhone) {
      setStatus(status, 'Verify your contact number before signing up.', 'error');
      return;
    }
    const previewProfile = {
      username: document.querySelector('#signup-username').value.trim(),
      name: document.querySelector('#full-name').value.trim(),
      phone: verifiedPhone,
      programCode: document.querySelector('#signup-department').value
    };
    try {
      localStorage.setItem('tcc-student-profile', JSON.stringify(previewProfile));
      setStatus(status, 'Demo profile saved in this browser. Open student.html to preview announcements for the selected program. No real account or SMS was created.', 'demo');
    } catch {
      setStatus(status, 'Could not save the demo profile in this browser.', 'error');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || ![loginTab, signupTab].includes(document.activeElement)) return;
    event.preventDefault();
    const nextTab = document.activeElement === loginTab ? signupTab : loginTab;
    nextTab.focus();
    setTab(nextTab === signupTab ? 'signup' : 'login');
  });
})();
