(() => {
  let installPrompt = null;
  const dialog = document.querySelector('#install-dialog');
  const nativeButton = document.querySelector('#install-native');
  const instructions = document.querySelector('#install-instructions');
  const offline = document.querySelector('#offline-status');
  const portable = location.protocol === 'file:' || document.documentElement.dataset.portable === 'true';
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function updateInstallUI() {
    nativeButton.hidden = !installPrompt || installed() || portable;
    if (installed()) instructions.textContent = 'Recall Loop is running as an app. You can open it from your device’s app launcher.';
    else if (portable) instructions.textContent = 'You are using the portable offline copy. To install Recall Loop as a desktop app, open the online version in Chrome or Edge.';
  }
  document.querySelector('#install-top').addEventListener('click', () => {updateInstallUI();dialog.showModal();});
  document.querySelector('#close-install').addEventListener('click', () => dialog.close());
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault();installPrompt = event;updateInstallUI();});
  window.addEventListener('appinstalled', () => {installPrompt = null;updateInstallUI();});
  nativeButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    nativeButton.disabled = true;
    const prompt = installPrompt;
    try {await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')instructions.textContent='Installed. You can open Recall Loop from your device’s apps.';}
    catch {instructions.textContent='Use the install icon in your browser’s address bar to install Recall Loop.';}
    finally {installPrompt=null;nativeButton.disabled=false;updateInstallUI();}
  });
  if (portable) {
    offline.textContent = 'Offline copy ready. No internet connection needed.';offline.classList.add('ready');
    document.querySelector('.portable-section').hidden = true;
    if (location.protocol !== 'file:') {
      const link=document.createElement('a');link.className='button secondary';link.href='./';link.textContent='Open installed-app version';instructions.insertAdjacentElement('afterend',link);
    }
  } else if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').then(async registration => {
      await navigator.serviceWorker.ready;
      offline.textContent = 'Ready for offline use on this device.';offline.classList.add('ready');
      if(registration.waiting) instructions.textContent='An app update is ready. Close all Recall Loop windows and reopen to use it.';
    }).catch(() => {offline.textContent = 'Offline setup could not finish. Reopen while online, or download the portable copy below.';});
  } else {offline.textContent = 'Use the online app over HTTPS to enable offline access, or download the portable copy below.';}
  updateInstallUI();
})();
