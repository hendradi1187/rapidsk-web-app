import type { Participant } from "@/api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParticipantDeleteGuard } from "@/api/hooks/useParticipantDeleteGuard";

interface ParticipantDeleteDialogProps {
  participant: Participant | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  serverConflict?: string | null;
}

export const ParticipantDeleteDialog = ({
  participant,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
  serverConflict = null,
}: ParticipantDeleteDialogProps) => {
  const { dependencies, dependencyLines, hasDependencies, isChecking } = useParticipantDeleteGuard(participant);
  const isBlockedByBackend = !!serverConflict;
  const isBlocked = hasDependencies || isBlockedByBackend;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Participant?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasDependencies
              ? `Participant "${participant?.organization_name}" belum bisa dihapus langsung karena masih dipakai relasi lain. Hapus dependency dulu baru delete participant.`
              : `This action cannot be undone. This will permanently delete the participant "${participant?.organization_name}".`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          {isChecking ? (
            <p className="text-muted-foreground">Checking participant dependencies...</p>
          ) : isBlockedByBackend ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="font-medium text-red-700">Delete blocked by backend</p>
              <p className="mt-2 text-xs text-muted-foreground">{serverConflict}</p>
            </div>
          ) : hasDependencies ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="font-medium text-amber-700">Dependency detected</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                {dependencyLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {dependencies.some((dependency) => dependency.confidence === "possible") && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Linked login account dihitung sebagai kemungkinan match berdasarkan email contact participant, karena response user backend belum expose <code className="rounded bg-muted px-1">participant_id</code>.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              FE tidak mendeteksi dependency yang terlihat. Kalau backend tetap menolak delete, detail conflict akan ditampilkan.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting || isChecking || isBlocked}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : isBlocked ? "Delete Blocked" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
