// Authentication is temporarily bypassed while Firebase quota approval is pending.
// The full Firebase implementation remains available in Git history and can be restored later.
(() => {
  window.IAM_OMANI_AUTH_BYPASSED = true;
  document.documentElement.dataset.authMode = 'bypass';
  const gate = document.getElementById('authGate');
  if (gate) gate.remove();
  window.dispatchEvent(new CustomEvent('iam-omani-auth-bypassed'));
})();
