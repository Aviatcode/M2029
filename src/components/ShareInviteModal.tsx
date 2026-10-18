import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Users,
  MessageCircle,
} from 'lucide-react';
import {
  getTwoLineInviteMessage,
  shareClassInvite,
  openWhatsAppInvite,
} from '../utils/classManager';

interface ShareInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classCode: string;
}

export const ShareInviteModal: React.FC<ShareInviteModalProps> = ({
  isOpen,
  onClose,
  className,
  classCode,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen) return null;

  const cleanCode = (classCode || 'BCA-2028').trim().toUpperCase();
  const inviteMessage = getTwoLineInviteMessage(className, cleanCode);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopiedCode(true);
      setToastMessage('✓ Class code copied!');
      setTimeout(() => {
        setCopiedCode(false);
        setToastMessage('');
      }, 2500);
    } catch {}
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedMessage(true);
      setToastMessage('✓ 2-liner invite message copied!');
      setTimeout(() => {
        setCopiedMessage(false);
        setToastMessage('');
      }, 2500);
    } catch {}
  };

  const handleNativeShare = async () => {
    const res = await shareClassInvite(className, cleanCode);
    if (res.method === 'clipboard') {
      setCopiedMessage(true);
      setToastMessage('✓ 2-liner invite copied to clipboard!');
      setTimeout(() => {
        setCopiedMessage(false);
        setToastMessage('');
      }, 2500);
    }
  };

  const handleWhatsApp = () => {
    openWhatsAppInvite(className, cleanCode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 shadow-2xl text-slate-100 animate-fade-in cursor-default space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-800 text-slate-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Invite Classmates</h3>
              <p className="text-xs text-neutral-400">Share this code with your class</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Prominent Class Code Card */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
              Class Code
            </span>
            <span className="text-2xl font-bold font-mono tracking-widest text-white block mt-0.5 select-all">
              {cleanCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* 2-Liner Message Preview Box */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-neutral-400 block">
            2-Liner Class Message
          </label>
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-line select-all">
            {inviteMessage}
          </div>
        </div>

        {/* Toast confirmation */}
        {toastMessage && (
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium">
            {toastMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleWhatsApp}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share to WhatsApp</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNativeShare}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to Any App</span>
            </button>

            <button
              onClick={handleCopyMessage}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Copied!' : 'Copy 2-Liner'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
