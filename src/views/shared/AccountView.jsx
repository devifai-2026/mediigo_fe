import { useApi } from '../../hooks/useApi.js';
import { AccountSummary } from '../../components/desk/AccountSummary.jsx';
import { ChangePasswordCard } from '../../components/desk/ChangePasswordCard.jsx';
import { PageHeader } from '../../components/desk/ui.jsx';

/**
 * The signed-in person's own profile, for roles whose portal has no profile
 * tab of its own: pharmacy, field agents, district and super admins. Opened
 * from the profile icon in the header.
 */
export default function AccountView() {
  const { data: me, refetch } = useApi('/api/auth/me');
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader icon="fa-id-badge" title="My profile" subtitle="Your details and sign-in" />
      <AccountSummary me={me} />
      <ChangePasswordCard me={me} onChanged={refetch} />
    </div>
  );
}
