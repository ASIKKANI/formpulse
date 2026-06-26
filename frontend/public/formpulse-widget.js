(function() {
  // Find the script tag that loaded this script to extract parameters
  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error("FormPulse Widget: Unable to determine current script tag.");
    return;
  }

  const formId = scriptTag.getAttribute('data-form-id');
  if (!formId) {
    console.error("FormPulse Widget: Missing data-form-id attribute on the script tag.");
    return;
  }

  // Determine the base URL from the script source
  const scriptUrl = new URL(scriptTag.src);
  const baseUrl = scriptUrl.origin;
  const iframeUrl = `${baseUrl}/fill/${formId}?embedded=true`;

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = `
    .formpulse-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      background-color: #2563eb;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      cursor: pointer;
      z-index: 999999;
      transition: transform 0.2s ease, background-color 0.2s ease;
      border: none;
      outline: none;
    }
    .formpulse-fab:hover {
      transform: scale(1.05);
      background-color: #1d4ed8;
    }
    .formpulse-fab svg {
      width: 28px;
      height: 28px;
      fill: currentColor;
    }
    .formpulse-overlay {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 400px;
      height: 600px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 999998;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(0,0,0,0.1);
    }
    .formpulse-overlay.formpulse-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    .formpulse-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    @media (max-width: 600px) {
      .formpulse-overlay {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 85vh;
        max-height: 85vh;
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
      }
      .formpulse-overlay.formpulse-open {
        transform: translateY(0);
      }
      .formpulse-fab {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Inject Overlay Container
  const overlay = document.createElement('div');
  overlay.className = 'formpulse-overlay';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'formpulse-iframe';
  iframe.src = iframeUrl;
  iframe.allow = "microphone";
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  // Inject FAB
  const fab = document.createElement('button');
  fab.className = 'formpulse-fab';
  fab.setAttribute('aria-label', 'Open Survey');
  fab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
  `;
  
  let isOpen = false;
  
  fab.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      overlay.classList.add('formpulse-open');
      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      overlay.classList.remove('formpulse-open');
      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      `;
    }
  });

  document.body.appendChild(fab);

})();
