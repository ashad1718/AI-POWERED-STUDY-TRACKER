import React from 'react';
import { Check, Circle } from 'lucide-react';
import {
  PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
  getPasswordStrength,
} from '../utils/passwordUtils';

const PasswordStrengthMeter = ({ password }) => {
  const checks = checkPasswordRequirements(password);
  const strength = getPasswordStrength(password);

  const strengthTextColor =
    strength.label === 'Strong'
      ? 'text-green-400'
      : strength.label === 'Medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#94A3B8] font-medium">Password strength</span>
          <span className={`font-semibold ${strengthTextColor}`}>{strength.label}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: strength.width }}
          />
        </div>
      </div>

      <ul className="space-y-1.5">
        {PASSWORD_REQUIREMENTS.map(({ key, label }) => {
          const met = checks[key];
          return (
            <li
              key={key}
              className={`flex items-center gap-2 text-[11px] transition-colors ${
                met ? 'text-green-400' : 'text-[#94A3B8]/70'
              }`}
            >
              {met ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-[#94A3B8]/60 leading-relaxed">
        Use a combination of letters, numbers, and special characters.
      </p>
    </div>
  );
};

export default PasswordStrengthMeter;
