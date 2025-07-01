import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Check, X, UserPlus } from 'lucide-react';

interface Permission {
  read: boolean;
  write: boolean;
  assign: boolean;
}

interface RolePermissions {
  [resource: string]: Permission;
}

const ROLE_PERMISSIONS: { [role: string]: RolePermissions } = {
  'sales': {
    appointments: { read: true, write: true, assign: false },
    sales: { read: true, write: true, assign: false },
    parties: { read: true, write: true, assign: false },
    customers: { read: true, write: true, assign: false },
    alterations: { read: true, write: false, assign: false },
    admin: { read: false, write: false, assign: false }
  },
  'tailor': {
    appointments: { read: false, write: false, assign: false },
    sales: { read: false, write: false, assign: false },
    parties: { read: false, write: false, assign: false },
    customers: { read: false, write: false, assign: false },
    alterations: { read: true, write: true, assign: false },
    admin: { read: false, write: false, assign: false }
  },
  'sales_support': {
    appointments: { read: true, write: false, assign: true },
    sales: { read: true, write: false, assign: false },
    parties: { read: true, write: false, assign: true },
    customers: { read: true, write: false, assign: false },
    alterations: { read: true, write: false, assign: true },
    admin: { read: false, write: false, assign: false }
  },
  'sales_management': {
    appointments: { read: true, write: true, assign: true },
    sales: { read: true, write: true, assign: false },
    parties: { read: true, write: true, assign: true },
    customers: { read: true, write: true, assign: false },
    alterations: { read: true, write: false, assign: true },
    admin: { read: false, write: false, assign: false }
  },
  'admin': {
    appointments: { read: true, write: false, assign: false },
    sales: { read: true, write: false, assign: false },
    parties: { read: true, write: false, assign: false },
    customers: { read: true, write: false, assign: false },
    alterations: { read: true, write: false, assign: false },
    admin: { read: true, write: true, assign: true }
  }
};

const ROLE_DESCRIPTIONS = {
  'sales': 'Can manage appointments, sales, parties, and customers. Can view alterations.',
  'tailor': 'Focused on alterations work only. Cannot access sales or appointment functions.',
  'sales_support': 'Can assign appointments, alterations, and parties. Cannot create or modify directly.',
  'sales_management': 'Full sales access plus ability to assign work to others.',
  'admin': 'System oversight and configuration. Not assigned to operational tasks.'
};

const RESOURCE_LABELS = {
  appointments: 'Appointments',
  sales: 'Sales',
  parties: 'Parties',
  customers: 'Customers',
  alterations: 'Alterations',
  admin: 'Admin Settings'
};

interface PermissionIconProps {
  hasPermission: boolean;
  type: 'read' | 'write' | 'assign';
}

const PermissionIcon: React.FC<PermissionIconProps> = ({ hasPermission, type }) => {
  if (!hasPermission) {
    return <X className="w-4 h-4 text-red-500" />;
  }
  
  if (type === 'assign') {
    return <UserPlus className="w-4 h-4 text-blue-500" />;
  }
  
  return <Check className="w-4 h-4 text-green-500" />;
};

interface RolePermissionsDisplayProps {
  selectedRole?: string;
}

export const RolePermissionsDisplay: React.FC<RolePermissionsDisplayProps> = ({ selectedRole }) => {
  const rolesToShow = selectedRole ? [selectedRole] : Object.keys(ROLE_PERMISSIONS);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        <p><strong>Permission Types:</strong></p>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span>Read/Write</span>
          </div>
          <div className="flex items-center gap-1">
            <UserPlus className="w-4 h-4 text-blue-500" />
            <span>Assign</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="w-4 h-4 text-red-500" />
            <span>No Access</span>
          </div>
        </div>
      </div>

      {rolesToShow.map(role => (
        <Card key={role} className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant={role === 'admin' ? 'destructive' : 'secondary'}>
                {role.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                {ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ROLE_PERMISSIONS[role]).map(([resource, permissions]) => (
                <div key={resource} className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">
                    {RESOURCE_LABELS[resource as keyof typeof RESOURCE_LABELS]}
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Read</span>
                      <PermissionIcon hasPermission={permissions.read} type="read" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Write</span>
                      <PermissionIcon hasPermission={permissions.write} type="write" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assign</span>
                      <PermissionIcon hasPermission={permissions.assign} type="assign" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RolePermissionsDisplay;
