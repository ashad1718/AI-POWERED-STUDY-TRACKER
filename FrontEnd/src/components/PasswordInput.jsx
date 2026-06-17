import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PasswordInput = ({
  id,
  name = 'password',
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required = true,
  className = '',
  label = '',
  error = '',
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-text-secondary uppercase tracking-wider block"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
          <Lock className="w-4 h-4" />
        </div>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`glass-input w-full pl-10 pr-12 py-3 text-sm rounded-xl focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-[#00E5FF]/20 focus:border-[#00E5FF]/50 ${
            error ? 'border-red-500/50 focus:ring-red-500/20' : ''
          } ${className}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#00E5FF] hover:scale-110 active:scale-95 focus:outline-none focus:text-[#00E5FF] transition-all duration-200 cursor-pointer"
          aria-label={visible ? 'Hide Password' : 'Show Password'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={visible ? 'visible' : 'hidden'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              {visible ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>
      {error && (
        <span className="text-[11px] text-red-400 font-medium block mt-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default PasswordInput;
