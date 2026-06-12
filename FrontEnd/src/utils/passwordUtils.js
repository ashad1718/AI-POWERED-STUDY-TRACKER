const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

const PASSWORD_REQUIREMENTS = [
  { key: 'uppercase', label: 'Uppercase letter' },
  { key: 'lowercase', label: 'Lowercase letter' },
  { key: 'number', label: 'Number' },
  { key: 'special', label: 'Special character' },
  { key: 'minLength', label: 'Minimum 8 characters' },
];

const pickRandom = (chars) => chars[Math.floor(Math.random() * chars.length)];

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Generate a strong password between 12 and 16 characters.
 */
export const generateStrongPassword = () => {
  const length = 12 + Math.floor(Math.random() * 5);

  const required = [
    pickRandom(UPPERCASE),
    pickRandom(LOWERCASE),
    pickRandom(NUMBERS),
    pickRandom(SPECIAL),
  ];

  while (required.length < length) {
    required.push(pickRandom(ALL_CHARS));
  }

  return shuffle(required).join('');
};

export const checkPasswordRequirements = (password = '') => ({
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  minLength: password.length >= 8,
});

export const getPasswordStrength = (password = '') => {
  const checks = checkPasswordRequirements(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (!password) {
    return { label: 'Weak', color: 'bg-red-500', width: '0%', score: 0 };
  }

  if (score <= 2) {
    return { label: 'Weak', color: 'bg-red-500', width: '33%', score };
  }

  if (score <= 4) {
    return { label: 'Medium', color: 'bg-yellow-500', width: '66%', score };
  }

  return { label: 'Strong', color: 'bg-green-500', width: '100%', score };
};

export const isStrongPassword = (password = '') =>
  Object.values(checkPasswordRequirements(password)).every(Boolean);

export { PASSWORD_REQUIREMENTS };
