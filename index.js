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
  const supabaseClient = window.tccSupabase;
  let pendingPhone = '';
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
    let seconds = 60;
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

  async function requestVerificationCode() {
    const status = document.querySelector('#signup-status');
    clearStatus(status);
    if (!supabaseClient) {
      setStatus(status, 'Supabase is not connected yet. Add your project URL and publishable key in supabase/client-config.js.', 'error');
      return;
    }
    if (!validInternationalShape(phoneInput.value)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      setStatus(status, 'Enter a valid number in international format, including the country code (for example, 639171234567).', 'error');
      phoneInput.focus();
      return;
    }
    const requiredFields = ['#signup-username', '#full-name', '#signup-department', '#signup-password'];
    for (const selector of requiredFields) {
      const field = document.querySelector(selector);
      if (!field.reportValidity()) return;
    }

    phoneInput.removeAttribute('aria-invalid');
    pendingPhone = '';
    verificationInput.value = '';
    signupButton.disabled = true;
    const phone = normalizePhone(phoneInput.value);
    const { error } = await supabaseClient.auth.signUp({
      phone,
      password: document.querySelector('#signup-password').value,
      options: {
        channel: 'sms',
        data: {
          username: document.querySelector('#signup-username').value.trim().toLowerCase(),
          full_name: document.querySelector('#full-name').value.trim(),
          program_code: document.querySelector('#signup-department').value
        }
      }
    });
    if (error) {
      setStatus(status, error.message, 'error');
      return;
    }

    pendingPhone = phone;
    verificationField.hidden = false;
    verificationHint.classList.add('visible');
    setStatus(status, `A real verification code was requested for ${phone}. Check your SMS messages.`, 'success');
    startCountdown();
    verificationInput.focus();
  }

  document.querySelector('#send-code').addEventListener('click', requestVerificationCode);
  resendButton.addEventListener('click', async () => {
    const status = document.querySelector('#signup-status');
    if (!supabaseClient || !pendingPhone) return;
    resendButton.disabled = true;
    const { error } = await supabaseClient.auth.resend({ type: 'sms', phone: pendingPhone });
    if (error) {
      resendButton.disabled = false;
      resendButton.textContent = 'Resend code';
      setStatus(status, error.message, 'error');
      return;
    }
    setStatus(status, `A new verification code was requested for ${pendingPhone}.`, 'success');
    startCountdown();
  });

  verificationInput.addEventListener('input', () => {
    signupButton.disabled = !(/^\d{6}$/.test(verificationInput.value) && pendingPhone);
    signupButton.firstChild.textContent = signupButton.disabled ? 'Verify number to sign up ' : 'Verify code and create account ';
  });

  phoneInput.addEventListener('input', () => {
    if (pendingPhone && normalizePhone(phoneInput.value) !== pendingPhone) {
      pendingPhone = '';
      signupButton.disabled = true;
      signupButton.firstChild.textContent = 'Verify number to sign up ';
      verificationField.hidden = true;
      verificationHint.classList.remove('visible');
      window.clearInterval(resendTimer);
      resendButton.disabled = true;
      resendButton.textContent = 'Resend in 60s';
      clearStatus(document.querySelector('#signup-status'));
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.querySelector('#login-status');
    clearStatus(status);
    if (!loginForm.reportValidity()) return;
    if (!supabaseClient) {
      setStatus(status, 'Supabase is not connected yet. Add your project URL and publishable key in supabase/client-config.js.', 'error');
      return;
    }
    const username = document.querySelector('#login-username').value.trim().toLowerCase();
    const password = document.querySelector('#login-password').value;
    const { data, error } = await supabaseClient.functions.invoke('username-login', {
      body: { username, password }
    });
    if (error || !data?.session) {
      setStatus(status, 'Username or password is incorrect.', 'error');
      return;
    }
    const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
    if (sessionError) setStatus(status, 'Login failed. Please try again.', 'error');
    else setStatus(status, 'You are signed in successfully.', 'success');
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.querySelector('#signup-status');
    if (!signupForm.reportValidity()) return;
    if (!supabaseClient) {
      setStatus(status, 'Supabase is not connected yet. Add your project URL and publishable key in supabase/client-config.js.', 'error');
      return;
    }
    if (!pendingPhone || normalizePhone(phoneInput.value) !== pendingPhone) {
      setStatus(status, 'Request a verification code for this phone number first.', 'error');
      return;
    }
    signupButton.disabled = true;
    const { data, error } = await supabaseClient.auth.verifyOtp({
      phone: pendingPhone,
      token: verificationInput.value,
      type: 'sms'
    });
    if (error) {
      signupButton.disabled = false;
      setStatus(status, error.message, 'error');
      return;
    }

    const previewProfile = {
      username: document.querySelector('#signup-username').value.trim().toLowerCase(),
      name: document.querySelector('#full-name').value.trim(),
      phone: pendingPhone,
      programCode: document.querySelector('#signup-department').value,
      userId: data.user?.id
    };
    try {
      localStorage.setItem('tcc-student-profile', JSON.stringify(previewProfile));
      setStatus(status, 'Your phone was verified and your account was created. You can now log in with your phone number and password.', 'success');
    } catch {
      setStatus(status, 'Your account was created, but this browser could not save the student preview profile.', 'error');
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
