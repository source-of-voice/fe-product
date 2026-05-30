import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/sourceOfVoiceApi';
import { Field } from '../components/ui';
import type { Notice } from '../types/ui';
import { getUserFriendlyErrorMessage } from '../utils/errors';

export function ProfilePage({ setNotice }: { setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });

  const run = async (callback: () => Promise<string>) => {
    try {
      await callback();
      setNotice({ kind: 'success', message: t('success') });
    } catch (error) {
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    }
  };

  return (
    <div className="settings-grid">
      <section className="glass-card panel-section settings-card">
        <h2>{t('changeEmail')}</h2>
        <div className="form-stack">
          <Field label={t('email')}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changeEmail(email))}>{t('save')}</button>
        </div>
      </section>
      <section className="glass-card panel-section settings-card">
        <h2>{t('changeUsername')}</h2>
        <div className="form-stack">
          <Field label={t('username')}><input value={username} onChange={(event) => setUsername(event.target.value)} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changeUsername(username))}>{t('save')}</button>
        </div>
      </section>
      <section className="glass-card panel-section settings-card">
        <h2>{t('changePassword')}</h2>
        <div className="form-stack">
          <Field label={t('oldPassword')}><input type="password" value={passwords.oldPassword} onChange={(event) => setPasswords({ ...passwords, oldPassword: event.target.value })} /></Field>
          <Field label={t('newPassword')}><input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changePassword(passwords.oldPassword, passwords.newPassword))}>{t('save')}</button>
        </div>
      </section>
    </div>
  );
}
