import { PageHeader } from '../../components/layout/PageHeader';
import { ChangePasswordCard } from './ChangePasswordCard';

/**
 * Change password, at /account/password.
 *
 * The form itself is ChangePasswordCard, which the Profile screen also draws -
 * one implementation, so the two cannot drift. This page is the header around
 * it, kept because the sidebar links here.
 *
 * Both replaced a copy that validated and then only toasted "Password
 * updated" without calling the API, so nothing was ever changed.
 */
export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        title="Change password"
        description="Use a strong password you don’t use elsewhere."
      />
      <div className="max-w-2xl">
        <ChangePasswordCard />
      </div>
    </>
  );
}
