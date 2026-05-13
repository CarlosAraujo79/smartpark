import { CheckCircle, XCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
};

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrapper">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {icons[t.type]}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
