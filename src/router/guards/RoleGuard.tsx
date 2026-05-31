import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES, ROLE_GUARDS } from '../routes';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  route: string;
  role: UserRole | null;
}

export function RoleGuard({ children, route, role }: RoleGuardProps) {
  const allowedRoles = ROLE_GUARDS[route];

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
