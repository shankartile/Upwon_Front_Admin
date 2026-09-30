import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

/**
 * Signing out, behind a confirmation.
 *
 * A hook rather than a copy in each caller: logging out is offered in two
 * places - the foot of the sidebar and the avatar menu in the topbar - and
 * two copies of the dialog would be two things to keep in step.
 *
 * Returns the trigger and the dialog to render. The caller decides where the
 * button lives; this decides what pressing it does.
 *
 * @example
 *   const { requestSignOut, dialog } = useSignOut();
 *   return <><button onClick={requestSignOut}>Log out</button>{dialog}</>;
 */
export function useSignOut(options?: { onRequest?: () => void }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return {
    /** Opens the confirmation. `onRequest` lets a caller close its own menu. */
    requestSignOut: () => {
      options?.onRequest?.();
      setOpen(true);
    },
    dialog: (
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={signOut}
        title="Log out?"
        description="Are you sure you want to log out? You will need to sign in again to get back to the panel."
        confirmLabel="Log out"
        variant="danger"
      />
    ),
  };
}
