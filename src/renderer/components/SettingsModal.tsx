import React from 'react';
import { SettingsView } from './settings/SettingsView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'general' }) => {
  if (!isOpen) return null;
  return <SettingsView initialSection={initialTab} onClose={onClose} />;
};
