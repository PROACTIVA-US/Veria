import * as React from 'react';
import { Button } from './button';

export function DecisionTraceModal({ data }: { data: any }) {
  const ref = React.useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant="ghost" onClick={() => ref.current?.showModal()}>View Trace</Button>
      <dialog ref={ref} className="rounded-2xl p-0 w-[600px] max-w-[90vw] border">
        <div className="p-4 border-b font-semibold">Decision Trace</div>
        <pre className="p-4 text-xs overflow-auto max-h-[60vh]">{JSON.stringify(data, null, 2)}</pre>
        <div className="p-3 border-t text-right">
          <Button onClick={() => ref.current?.close()}>Close</Button>
        </div>
      </dialog>
    </>
  );
}
