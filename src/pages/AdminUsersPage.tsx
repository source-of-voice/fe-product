import { useEffect, useState } from 'react';
import { ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminAuthApi } from '../api/sourceOfVoiceApi';
import { EmptyState, Pagination } from '../components/ui';
import type { ListUserResponse, PageResponse, Role } from '../types/domain';
import type { Notice } from '../types/ui';
import { emptyPage } from '../utils/paging';
import { getUserFriendlyErrorMessage } from '../utils/errors';

const AVAILABLE_ROLES: Role[] = ['USER', 'REVIEWER', 'ADMIN'];

export function AdminUsersPage({ setNotice }: { setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<PageResponse<ListUserResponse>>(emptyPage());
  const [userPage, setUserPage] = useState(0);
  const [roleByUser, setRoleByUser] = useState<Record<number, Role>>({});
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const loadUsers = async (page = userPage) => {
    const userData = await adminAuthApi.users(page, 10, 'email,asc');
    setUsers(userData);
    setUserPage(userData.number ?? page);
  };

  const run = async (userId: number, callback: () => Promise<unknown>) => {
    setBusyUserId(userId);
    try {
      await callback();
      setNotice({ kind: 'success', message: t('success') });
      await loadUsers(userPage);
    } catch (error) {
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    } finally {
      setBusyUserId(null);
    }
  };

  useEffect(() => {
    loadUsers(0).catch((error) => setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoleFor = (user: ListUserResponse): Role => roleByUser[user.id] ?? AVAILABLE_ROLES.find((role) => !user.roles.includes(role)) ?? 'USER';

  const setSelectedRoleFor = (userId: number, role: Role) => {
    setRoleByUser((current) => ({ ...current, [userId]: role }));
  };

  return (
    <section className="glass-card panel-section admin-users-page">
      <div className="section-heading roomy">
        <div>
          <p className="eyebrow-soft">{t('admin')}</p>
          <h2>{t('adminUsers')}</h2>
          <p className="section-help">{t('adminUsersHelp')}</p>
        </div>
      </div>

      <div className="admin-users-list">
        {users.content.map((user) => {
          const selectedRole = selectedRoleFor(user);
          const hasSelectedRole = user.roles.includes(selectedRole);
          const isBaseUserRole = selectedRole === 'USER';
          const canRevokeSelectedRole = hasSelectedRole && !isBaseUserRole;
          const busy = busyUserId === user.id;

          return (
            <article key={user.id} className="admin-user-card">
              <div className="admin-user-main">
                <div className="user-avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</div>
                <div className="admin-user-copy">
                  <strong>{user.email}</strong>
                  <p>{t('currentRoles')}</p>
                  <div className="role-pill-list" aria-label={t('currentRoles')}>
                    {user.roles.length
                      ? user.roles.map((role) => <span key={role} className="role-pill"><ShieldCheck size={13} />{role}</span>)
                      : <span className="role-pill role-pill-muted">{t('noData')}</span>}
                  </div>
                </div>
              </div>

              <div className="admin-role-panel">
                <label className="field-block compact-field">
                  <span>{t('chooseRole')}</span>
                  <select value={selectedRole} onChange={(event) => setSelectedRoleFor(user.id, event.target.value as Role)}>
                    {AVAILABLE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  {isBaseUserRole && <small>{t('cannotRemoveUserRole')}</small>}
                </label>
                <div className="button-row wrap admin-role-actions">
                  <button className="secondary-button small-button" disabled={busy || hasSelectedRole} onClick={() => run(user.id, () => adminAuthApi.assignRole({ userId: user.id, roleName: selectedRole }))}>
                    <UserPlus size={16} />
                    <span>{t('giveRole')}</span>
                  </button>
                  <button className="secondary-button small-button" disabled={busy || !canRevokeSelectedRole} title={isBaseUserRole ? t('cannotRemoveUserRole') : undefined} onClick={() => run(user.id, () => adminAuthApi.revokeRole({ userId: user.id, roleName: selectedRole }))}>
                    <UserMinus size={16} />
                    <span>{t('takeRole')}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!users.content.length && <EmptyState label={t('noData')} />}
      </div>

      <div className="users-page-footer">
        <div className="users-count-pill"><Users size={16} /> {users.totalElements} {t('users')}</div>
        <Pagination page={userPage} last={users.last} onPrevious={() => loadUsers(Math.max(0, userPage - 1))} onNext={() => loadUsers(userPage + 1)} />
      </div>
    </section>
  );
}
