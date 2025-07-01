import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  user: {
    id?: string | number;
    name: string;
    photoUrl?: string | null;
    email?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showEmail?: boolean;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  emailClassName?: string;
  layout?: 'horizontal' | 'vertical';
  clickable?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: {
    avatar: 'h-6 w-6',
    icon: 12,
    name: 'text-xs',
    email: 'text-xs',
  },
  sm: {
    avatar: 'h-8 w-8',
    icon: 16,
    name: 'text-sm',
    email: 'text-xs',
  },
  md: {
    avatar: 'h-10 w-10',
    icon: 20,
    name: 'text-sm',
    email: 'text-xs',
  },
  lg: {
    avatar: 'h-12 w-12',
    icon: 24,
    name: 'text-base',
    email: 'text-sm',
  },
  xl: {
    avatar: 'h-16 w-16',
    icon: 32,
    name: 'text-lg',
    email: 'text-sm',
  },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showName = true,
  showEmail = false,
  className = '',
  avatarClassName = '',
  nameClassName = '',
  emailClassName = '',
  layout = 'horizontal',
  clickable = false,
  onClick,
}) => {
  const sizeConfig = sizeClasses[size];
  
  const avatarElement = (
    <div className={cn(
      sizeConfig.avatar,
      'rounded-full flex-shrink-0 overflow-hidden',
      avatarClassName
    )}>
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={user.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none';
            const sibling = e.currentTarget.nextElementSibling as HTMLElement;
            if (sibling) sibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={cn(
          'h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
          user.photoUrl ? 'hidden' : 'flex'
        )}
        style={user.photoUrl ? { display: 'none' } : {}}
      >
        <User size={sizeConfig.icon} className="text-gray-400 dark:text-gray-500" />
      </div>
    </div>
  );

  const nameElement = showName && (
    <div className={cn(
      'min-w-0 flex-1',
      layout === 'vertical' ? 'text-center' : ''
    )}>
      <div className={cn(
        sizeConfig.name,
        'font-medium text-gray-900 dark:text-gray-100 truncate',
        nameClassName
      )}>
        {user.name}
      </div>
      {showEmail && user.email && (
        <div className={cn(
          sizeConfig.email,
          'text-gray-500 dark:text-gray-400 truncate',
          emailClassName
        )}>
          {user.email}
        </div>
      )}
    </div>
  );

  const content = layout === 'vertical' ? (
    <div className="flex flex-col items-center gap-2">
      {avatarElement}
      {nameElement}
    </div>
  ) : (
    <div className="flex items-center gap-3">
      {avatarElement}
      {nameElement}
    </div>
  );

  if (clickable || onClick) {
    return (
      <div
        className={cn(
          'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1',
          className
        )}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      {content}
    </div>
  );
};

// Specialized components for common use cases
export const UserAvatarSelect: React.FC<UserAvatarProps> = (props) => (
  <UserAvatar
    {...props}
    size={props.size || 'sm'}
    className={cn('p-2 hover:bg-gray-50 dark:hover:bg-gray-800', props.className)}
    clickable
  />
);

export const UserAvatarDropdown: React.FC<UserAvatarProps> = (props) => (
  <UserAvatar
    {...props}
    size={props.size || 'sm'}
    showEmail={props.showEmail ?? true}
    className={cn('p-3', props.className)}
  />
);

export const UserAvatarCard: React.FC<UserAvatarProps> = (props) => (
  <UserAvatar
    {...props}
    size={props.size || 'lg'}
    showEmail={props.showEmail ?? true}
    className={cn('p-4', props.className)}
  />
);
