import { CheckCircle2, Clock, AlertCircle, Flame } from 'lucide-react';

function LifecycleNode({ stage, isActive, isResolved, isPending, isReopened, label }) {
  let bgColor = 'bg-slate-100';
  let borderColor = 'border-slate-300';
  let textColor = 'text-slate-600';
  let pulseColor = '';

  if (isReopened) {
    bgColor = 'bg-[var(--pahadi-crimson)]';
    borderColor = 'border-[var(--pahadi-crimson)]';
    textColor = 'text-white';
  } else if (isResolved) {
    bgColor = 'bg-emerald-500';
    borderColor = 'border-emerald-400';
    textColor = 'text-white';
  } else if (isActive) {
    bgColor = 'bg-[var(--kinnaur-marigold)]';
    borderColor = 'border-[var(--kinnaur-marigold)]';
    textColor = 'text-slate-900';
    pulseColor = 'animate-pulse';
  } else if (isPending) {
    bgColor = 'bg-amber-500';
    borderColor = 'border-amber-400';
    textColor = 'text-white';
  }

  const Icon = 
    isResolved ? CheckCircle2 : 
    isActive ? Flame : 
    isReopened ? AlertCircle :
    isPending ? AlertCircle :
    Clock;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`h-10 w-10 rounded-full border-2 ${bgColor} ${borderColor} ${textColor} flex items-center justify-center shadow-sm ${pulseColor}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center max-w-[70px]">
        {label}
      </span>
    </div>
  );
}

function TimelineConnector({ isComplete }) {
  return (
    <div className="flex-1 h-1 mx-1 bg-slate-200 relative">
      {isComplete && (
        <div className="h-full bg-emerald-500" />
      )}
    </div>
  );
}

export default function LifecycleTimeline({ status }) {
  const stages = [
    { key: 'pending', label: 'Pending' },
    { key: 'verification', label: 'Verification' },
    { key: 'assigned', label: 'Department Assigned' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Citizen Closed' },
  ];

  const statusMap = {
    'Pending': 'pending',
    'Under Verification': 'verification',
    'Department Assigned': 'assigned',
    'Verified Resolved': 'resolved',
    'Reopened via Citizen Veto': 'reopened',
  };

  const currentStage = statusMap[status] || 'pending';
  const isReopened = status === 'Reopened via Citizen Veto';

  const getStageState = (stageKey) => {
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    const currentIndex = stages.findIndex(s => s.key === currentStage);

    return {
      isActive: !isReopened && stageKey === currentStage,
      isResolved: !isReopened && stageIndex < currentIndex,
      isPending: stageKey === 'pending' && (currentStage === 'pending' || currentStage === 'reopened'),
      isReopened: isReopened && stageKey === 'resolved',
    };
  };

  return (
    <div className="rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] p-6">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
          Lifecycle Progress
        </p>
        <h3 className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--devdar-forest)]">
          Incident Resolution Timeline
        </h3>
      </div>

      <div className="flex items-end justify-between gap-1">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="flex items-end gap-1 flex-1">
            <LifecycleNode
              stage={stage.key}
              {...getStageState(stage.key)}
              label={stage.label}
            />
            {idx < stages.length - 1 && (
              <TimelineConnector isComplete={getStageState(stage.key).isResolved} />
            )}
          </div>
        ))}
      </div>

      {isReopened && (
        <div className="mt-4 flex items-start gap-2.5 rounded-sm border border-[var(--pahadi-crimson)]/20 bg-rose-50 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--pahadi-crimson)] mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-[var(--pahadi-crimson)] font-semibold">
            Citizen veto filed — returned to pending verification
          </p>
        </div>
      )}
    </div>
  );
}
