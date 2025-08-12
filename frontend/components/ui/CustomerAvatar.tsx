import React from 'react';
import { User } from 'lucide-react';

type CustomerAvatarProps = {
  name?: string;
  phone?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const COLORS = [
  ['#EEF2FF', '#C7D2FE', '#6366F1'], // indigo
  ['#ECFEFF', '#A5F3FC', '#06B6D4'], // cyan
  ['#ECFDF5', '#A7F3D0', '#10B981'], // emerald
  ['#FFF7ED', '#FED7AA', '#F97316'], // orange
  ['#FEF2F2', '#FECACA', '#EF4444'], // red
  ['#F5F3FF', '#DDD6FE', '#8B5CF6'], // violet
  ['#F0F9FF', '#BAE6FD', '#0EA5E9'], // sky
  ['#FDF4FF', '#F5D0FE', '#D946EF'], // fuchsia
];

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({ name = '', phone = '', email = '', size = 'md', className = '' }) => {
  const key = `${name}|${phone}|${email}` || 'customer';
  const h = hashString(key);
  const palette = COLORS[h % COLORS.length];
  const [bgSoft, bgMid, fg] = palette;

  const sizePx = size === 'lg' ? 48 : size === 'md' ? 32 : 24;
  const iconSize = size === 'lg' ? 24 : size === 'md' ? 18 : 14;

  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-inner ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        background: `radial-gradient(88% 88% at 30% 30%, ${bgMid} 0%, ${bgSoft} 60%)`,
        border: `1px solid ${bgMid}`,
      }}
      aria-label="Customer avatar"
    >
      <User size={iconSize} color={fg} />
    </div>
  );
};

export default CustomerAvatar;


