import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';

export interface User {
  id: string | number;
  name: string;
  photoUrl?: string | null;
  email?: string;
  role?: string;
}

export interface UserSelectProps {
  users: User[];
  value?: string | number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  filterRole?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserSelect: React.FC<UserSelectProps> = ({
  users,
  value,
  onValueChange,
  placeholder = 'Select user...',
  className,
  disabled = false,
  required = false,
  allowEmpty = true,
  emptyLabel = 'Unassigned',
  filterRole,
  size = 'md',
}) => {
  // Filter users by role if specified
  const filteredUsers = filterRole 
    ? users.filter(user => user.role === filterRole)
    : users;

  // Find selected user for display
  const selectedUser = filteredUsers.find(user => String(user.id) === String(value));

  const heightClasses = {
    sm: 'h-9',
    md: 'h-10 sm:h-11',
    lg: 'h-11 sm:h-12',
  };

  const handleValueChange = (newValue: string) => {
    if (newValue === "__empty__") {
      onValueChange("");
    } else {
      onValueChange(newValue);
    }
  };

  return (
    <Select value={value ? String(value) : "__empty__"} onValueChange={handleValueChange} disabled={disabled} required={required}>
      <SelectTrigger className={cn(heightClasses[size], className)}>
        <SelectValue placeholder={placeholder}>
          {selectedUser ? (
            <UserAvatar
              user={selectedUser}
              size="xs"
              showName={true}
              showEmail={false}
              className="py-0"
            />
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
        {allowEmpty && (
          <SelectItem value="__empty__" className="hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-gray-500 dark:text-gray-400 italic">{emptyLabel}</span>
          </SelectItem>
        )}
        {filteredUsers.map(user => (
          <SelectItem key={user.id} value={String(user.id)} className="hover:bg-gray-100 dark:hover:bg-gray-700">
            <UserAvatar
              user={user}
              size="sm"
              showName={true}
              showEmail={false}
              className="py-1"
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Specialized components for common use cases
export const TailorSelect: React.FC<Omit<UserSelectProps, 'filterRole'>> = (props) => (
  <UserSelect
    {...props}
    filterRole="tailor"
    placeholder={props.placeholder || 'Select tailor...'}
    emptyLabel={props.emptyLabel || 'No tailor assigned'}
  />
);

export const SalesStaffSelect: React.FC<Omit<UserSelectProps, 'filterRole'>> = (props) => (
  <UserSelect
    {...props}
    filterRole="sales"
    placeholder={props.placeholder || 'Select sales staff...'}
    emptyLabel={props.emptyLabel || 'No sales staff assigned'}
  />
);

export const AdminSelect: React.FC<Omit<UserSelectProps, 'filterRole'>> = (props) => (
  <UserSelect
    {...props}
    filterRole="admin"
    placeholder={props.placeholder || 'Select admin...'}
    emptyLabel={props.emptyLabel || 'No admin assigned'}
  />
);

// Generic staff select (all roles)
export const StaffSelect: React.FC<UserSelectProps> = (props) => (
  <UserSelect
    {...props}
    placeholder={props.placeholder || 'Select staff member...'}
    emptyLabel={props.emptyLabel || 'No staff assigned'}
  />
);
