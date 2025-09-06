import * as React from 'react';

type Status = 'allow' | 'review' | 'deny';

export function EligibilityBadge({ status }: { status: Status }) {
  const styles = {
    allow: 'bg-green-100 text-green-800',
    review: 'bg-yellow-100 text-yellow-800',
    deny: 'bg-red-100 text-red-800'
  }[status];
  const label = { allow: 'Allowed', review: 'Review', deny: 'Denied' }[status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-medium ${styles}`}>{label}</span>;
}
