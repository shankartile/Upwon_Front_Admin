import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/http';

/**
 * The Delete button on a view screen, with the confirmation in front of it.
 *
 * The inbox detail cards this replaces had a Delete in their footer; the view
 * screens keep it, worded the same way. After a delete the record no longer
 * exists, so the screen goes back to its list rather than staying on a page
 * about nothing.
 */
export function DeleteRecordAction({
  title,
  description,
  remove,
  successTitle,
  successDetail,
  failureTitle,
  backTo,
}: {
  /** The confirmation's heading, e.g. 'Delete enquiry'. */
  title: string;
  description: ReactNode;
  remove: () => Promise<unknown>;
  successTitle: string;
  successDetail?: string;
  failureTitle: string;
  /** Where to go once the record is gone - its list. */
  backTo: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const run = async () => {
    setConfirming(false);
    setDeleting(true);
    try {
      await remove();
      toast.success(successTitle, successDetail);
      // Replaced, not pushed: the browser's Back must not land on the record
      // that was just deleted.
      navigate(backTo, { replace: true });
    } catch (error) {
      toast.error(failureTitle, errorMessage(error));
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="danger"
        loading={deleting}
        leftIcon={<Trash2 className="h-4 w-4" />}
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void run()}
        title={title}
        description={description}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
