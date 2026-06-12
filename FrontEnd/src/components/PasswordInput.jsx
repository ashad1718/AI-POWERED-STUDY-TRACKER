import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({
  id,
  name = 'password',
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'new-password',
  required = true,
  className = '',
  iconClassName = 'pl-10 pr-11',
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]/60">
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
        className={`glass-input w-full py-3 text-sm rounded-xl focus:outline-none ${iconClassName} ${className}`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8]/70 hover:text-white transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default PasswordInput;
