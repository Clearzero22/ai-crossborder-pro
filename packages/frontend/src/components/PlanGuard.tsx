// src/components/PlanGuard.tsx
import { ReactNode } from 'react';
import { usePlanContext } from '../context/PlanContext';

interface PlanGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  onBlocked?: (reason: string) => void;
}

export default function PlanGuard({ feature, children, fallback }: PlanGuardProps) {
  const { checkLimit } = usePlanContext();

  const result = checkLimit(feature);

  if (!result.allowed && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 用法示例：
 * <PlanGuard
 *   feature="workflow-execution"
 *   onBlocked={(reason) => toast.error(reason)}
 * >
 *   <button onClick={runWorkflow}>运行</button>
 * </PlanGuard>
 */
