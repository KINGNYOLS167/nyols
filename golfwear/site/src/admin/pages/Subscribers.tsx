import { useState } from 'react';
import { api, get, int } from '../api';
import { Btn, btnCls, Confirm, Empty, ErrorNote, Loading, PageHead, Table, useAsync, useToast } from '../ui';

interface Subscriber { id: number; email: string; lang: string; createdAt: string }

export function Subscribers() {
  const toast = useToast();
  const { data: list, error, loading, reload } = useAsync(() => get<Subscriber[]>('/subscribers'), []);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const remove = async () => {
    if (!deleting) return;
    try {
      await api('DELETE', `/subscribers/${deleting.id}`);
      toast(`${deleting.email} removed`);
      setDeleting(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove.', 'error');
    }
  };
  return (
    <>
      <PageHead title="Newsletter" sub={list ? `${int(list.length)} people signed up on the store.` : 'People who signed up on the store.'}
        actions={<a href="/api/admin/export/subscribers.csv" download className={btnCls('secondary')}>Export CSV</a>} />
      <p className="mb-4 max-w-[70ch] text-[0.9rem] text-stone">Emails are not sent from here. Export the list into your email tool. When someone asks to unsubscribe, remove them here and in that tool.</p>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !list ? <Loading /> : list && list.length === 0 ? (
        <Empty title="No sign-ups yet" body="The sign-up form sits above the footer on every store page." />
      ) : list && (
        <Table label="Newsletter sign-ups">
          <thead><tr><th>Email</th><th>Language</th><th>Signed up</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{s.lang === 'en' ? 'English' : 'Indonesian'}</td>
                <td className="tnum">{new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="text-right"><Btn size="sm" variant="ghost" className="!text-danger" onClick={() => setDeleting(s)} aria-label={`Remove ${s.email}`}>Remove</Btn></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Confirm open={!!deleting} title="Remove this subscriber?" action="Remove" onClose={() => setDeleting(null)} onConfirm={remove} body={<p>{deleting?.email} will be taken off the list.</p>} />
    </>
  );
}
