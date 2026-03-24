'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { authClient } from '@/lib/auth-client';

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // Get employee data by email using Convex
  const employeeData = useQuery(
    api.public.entities.getEntityIdByEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );

  // Get employee details using Convex
  const employee = useQuery(
    api.public.entities.getEmployee,
    employeeData?.entityId && employeeData?.employeeId
      ? { entityId: employeeData.entityId, employeeId: employeeData.employeeId }
      : "skip"
  );

  // Get entity details to check createdBy
  const entity = useQuery(
    api.public.entities.getEntity,
    employeeData?.entityId ? { entityId: employeeData.entityId } : "skip"
  );

  useEffect(() => {
    if (!currentEmail) {
      setIsLoading(false);
      setIsAdmin(false);
      return;
    }

    // Wait for data to load
    if (employeeData === undefined || (employeeData && (employee === undefined || entity === undefined))) {
      setIsLoading(true);
      return;
    }

    // Check if user is admin
    if (employee && entity) {
      const hasAdminRole = employee.roles?.includes('ADMIN') || false;
      const isCreator = entity.createdBy === employee.employeeId;
      setIsAdmin(hasAdminRole || isCreator);
    } else {
      setIsAdmin(false);
    }

    setIsLoading(false);
  }, [currentEmail, employeeData, employee, entity]);

  return { isAdmin, isLoading, entityId: employeeData?.entityId };
};
