import { Icons } from './Icons';

export function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info', onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-icon ${type}">
        ${type === 'warning' ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` :
        type === 'error' ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>` :
        `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      }
      </div>
      <h3 class="confirm-title">${title}</h3>
      <p class="confirm-message">${message}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary confirm-cancel">${cancelText}</button>
        <button class="btn confirm-confirm ${type === 'danger' ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(14,15,12,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 24px;
      animation: fadeIn 0.2s ease;
    }
    .confirm-dialog {
      background: #fff;
      border-radius: 24px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px rgba(14,15,12,0.1);
      animation: fadeIn 0.3s ease;
    }
    .confirm-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .confirm-icon.info { background: #e2f6d5; color: #0e0f0c; }
    .confirm-icon.warning { background: #fff3cd; color: #b86700; }
    .confirm-icon.error { background: #fde8e8; color: #d03238; }
    .confirm-title {
      font-size: 18px;
      font-weight: 600;
      color: #0e0f0c;
      margin-bottom: 8px;
    }
    .confirm-message {
      font-size: 14px;
      color: #454745;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .confirm-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    overlay.querySelector('.confirm-cancel').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
      if (onCancel) onCancel();
    };
    overlay.querySelector('.confirm-confirm').onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
      if (onConfirm) onConfirm();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
  });
}

export function useConfirm() {
  return confirmDialog;
}
