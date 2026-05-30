import { useEffect, useState } from 'react';
import { WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { walletApi } from '../api/sourceOfVoiceApi';
import { EmptyState, Pagination, StatCard } from '../components/ui';
import type { SliceResponse, WalletResponse, WalletTransactionResponse } from '../types/domain';
import { emptySlice } from '../utils/paging';
import { formatDate, formatMoney, formatTransactionDescription, formatTransactionTitle } from '../utils/format';

export function WalletPage() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<SliceResponse<WalletTransactionResponse>>(emptySlice());
  const [transactionPage, setTransactionPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    const walletData = await walletApi.me();
    setWallet(walletData);
  };

  const loadTransactions = async (page = transactionPage) => {
    const txData = await walletApi.transactions(page, 20);
    setTransactions(txData);
    setTransactionPage(txData.page ?? page);
  };

  const load = async (page = transactionPage) => {
    setLoading(true);
    try {
      await Promise.all([loadWallet(), loadTransactions(page)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wallet-grid">
      <StatCard icon={<WalletCards size={22} />} label={t('balance')} value={loading && !wallet ? t('loading') : formatMoney(wallet?.balance)} />
      <section className="glass-card panel-section wide-panel">
        <div className="section-heading roomy">
          <div>
            <p className="eyebrow-soft">{t('history')}</p>
            <h2>{t('transactions')}</h2>
          </div>
        </div>
        {!transactions.content.length && <EmptyState label={t('noData')} />}
        <div className="transaction-list">
          {transactions.content.map((transaction) => (
            <article key={transaction.id} className="compact-row">
              <div>
                <strong>{formatTransactionTitle(transaction.type, t)}</strong>
                <p>{formatTransactionDescription(transaction, t)}</p>
              </div>
              <div className="row-meta">
                <strong>{formatMoney(transaction.amount)}</strong>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={transactionPage} last={transactions.last} onPrevious={() => loadTransactions(Math.max(0, transactionPage - 1))} onNext={() => loadTransactions(transactionPage + 1)} />
      </section>
    </div>
  );
}
