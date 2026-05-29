import type { Role } from '../types';

export type Permission =
  | 'dashboard.view'
  | 'content.read' | 'content.write' | 'content.publish'
  | 'leads.read' | 'leads.write'
  | 'settings.read' | 'settings.write'
  | 'users.read' | 'users.write';

const matrix: Record<Role, Permission[]> = {
  admin: [
    'dashboard.view',
    'content.read', 'content.write', 'content.publish',
    'leads.read', 'leads.write',
    'settings.read', 'settings.write',
    'users.read', 'users.write',
  ],
  editor: [
    'dashboard.view',
    'content.read', 'content.write', 'content.publish',
    'leads.read', 'leads.write',
    'settings.read',
  ],
  viewer: [
    'dashboard.view',
    'content.read',
    'leads.read',
    'settings.read',
  ],
};

export function roleCan(role: Role, perm: Permission): boolean {
  return matrix[role].includes(perm);
}
