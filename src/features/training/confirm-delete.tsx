import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ErrorNotice } from './shared';
export function ConfirmDelete({ label, description, onConfirm }: { label: string; description: string; onConfirm: () => Promise<void> }) {
  const [error,setError] = useState<unknown>(); const [busy,setBusy] = useState(false);
  return <><AlertDialog><AlertDialogTrigger render={<Button variant="ghost" disabled={busy} />}>{label}</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{label}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={async () => { setBusy(true); try { await onConfirm(); } catch(e) { setError(e); } finally { setBusy(false); } }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><ErrorNotice error={error} /></>;
}
