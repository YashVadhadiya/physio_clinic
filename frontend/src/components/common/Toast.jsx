import { useState, useEffect, useCallback } from 'react';
import { Icons } from './Icons';

let toastId = 0;
let addToastGlobal = null;

export function toast(message, type = 'info') {
  if (addToastGlobal) {
    addToastGlobal({ id: ++toastId, message, type });
  }
}

const iconMap = {
  success: Icons.Check,
  error: Icons.AlertTriangle,
  info: Icons.Info,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const IconComp = iconMap[t.type] || Icons.Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <IconComp />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
