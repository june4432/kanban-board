import React from 'react';
import { useToast } from '@/contexts/ToastContext';
import ToastContainerComponent from '@/components/Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <ToastContainerComponent toasts={toasts} onRemove={removeToast} />
  );
};

export default ToastContainer;