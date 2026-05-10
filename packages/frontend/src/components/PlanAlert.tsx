// src/components/PlanAlert.tsx
import { usePlanContext } from '../context/PlanContext';

type AlertType = 'warning' | 'error' | 'info';

interface AlertConfig {
  type: AlertType;
  message: string;
  visible: boolean;
}

export default function PlanAlert() {
  const { state } = usePlanContext();

  const alertConfig = getAlertConfig(state);

  if (!alertConfig.visible) {
    return null;
  }

  const colors = {
    warning: 'bg-orange-50 border-orange-200 text-orange-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`border-t px-4 py-2 text-sm text-center ${colors[alertConfig.type]}`}>
      <span className="font-medium">{alertConfig.message}</span>
    </div>
  );
}

function getAlertConfig(state: ReturnType<typeof usePlanContext>['state']): AlertConfig {
  if (state.isExpired) {
    return {
      type: 'error',
      message: '套餐已过期，请续费以继续使用',
      visible: true,
    };
  }

  if (state.daysUntilExpiry <= 3) {
    return {
      type: 'error',
      message: `套餐将在 ${state.daysUntilExpiry} 天后到期，请及时续费`,
      visible: true,
    };
  }

  if (state.daysUntilExpiry <= 7) {
    return {
      type: 'warning',
      message: `套餐将在 ${state.daysUntilExpiry} 天后到期`,
      visible: true,
    };
  }

  if (state.isNearLimit) {
    return {
      type: 'warning',
      message: `执行次数即将用完 (${state.usagePercent}%)`,
      visible: true,
    };
  }

  return {
    type: 'info',
    message: '',
    visible: false,
  };
}
