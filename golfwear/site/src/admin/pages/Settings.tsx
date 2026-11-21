import { useEffect, useState, type FormEvent } from 'react';
import type { Announcement, StoreSettings } from '../../../shared/domain';
import { api, ApiError, get } from '../api';
import { Btn, Card, ErrorNote, Field, inputCls, Loading, PageHead, useAsync, useToast } from '../ui';

type Settings = { announcements: Announcement[]; store: StoreSettings };

export function Settings() {
  const toast = useToast();
  const { data, error, reload } = useAsync(() => get<Settings>('/settings'), []);
  const [ann, setAnn] = useState<Announcement[]>([]);
  const [store, setStore] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    setAnn(data.announcements);
    const s = data.store;
    setStore({ whatsapp: s.whatsapp, instagram: s.instagram, tiktok: s.tiktok, email: s.email, rating: s.rating?.toString() ?? '', reviews: s.reviews?.toString() ?? '', sold: s.sold?.toString() ?? '', statsDate: s.statsDate });
  }, [data]);
  if (error) return <ErrorNote message={error} retry={reload} />;
  if (!data) return <Loading />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api('PUT', '/settings', { announcements: ann.filter((a) => a.id.trim() || a.en.trim()), store });
      toast('Settings saved. The store shows them within a minute.');
      reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? { [err.field ?? 'form']: err.message } : { form: 'Could not save the settings.' });
    } finally {
      setBusy(false);
    }
  };
  const s = (k: string) => store[k] ?? '';
  const setS = (k: string, v: string) => setStore((x) => ({ ...x, [k]: v }));

  return (
    <form onSubmit={save}>
      <PageHead title="Settings" sub="What the store shows in the announcement bar, footer and hero." actions={<Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Btn>} />
      {errors.form && <div className="mb-4"><ErrorNote message={errors.form} /></div>}
      <div className="space-y-6">
        <Card title="Announcement bar" actions={<Btn size="sm" variant="secondary" onClick={() => setAnn([...ann, { id: '', en: '' }])} disabled={ann.length >= 6}>Add a message</Btn>}>
          <p className="mb-4 text-[0.88rem] text-stone">Messages rotate at the top of every page, in the shopper's language. Up to six. Keep each under 140 characters.</p>
          {ann.length === 0 && <p className="text-stone">No messages: the bar is hidden.</p>}
          <div className="space-y-4">
            {ann.map((a, i) => (
              <fieldset key={i} className="grid gap-3 border-b border-line pb-4 sm:grid-cols-[1fr_1fr_220px_auto]">
                <legend className="sr-only">Message {i + 1}</legend>
                <Field label="Bahasa Indonesia">{(id) => <input id={id} maxLength={140} value={a.id} onChange={(e) => setAnn(ann.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))} className={inputCls} />}</Field>
                <Field label="English">{(id) => <input id={id} maxLength={140} value={a.en} onChange={(e) => setAnn(ann.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))} className={inputCls} />}</Field>
                <Field label="Link (optional)">{(id) => <input id={id} value={a.href ?? ''} onChange={(e) => setAnn(ann.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} className={inputCls} placeholder="/collections/new-arrivals" />}</Field>
                <Btn variant="ghost" className="self-end !text-danger" onClick={() => setAnn(ann.filter((_, j) => j !== i))} aria-label={`Remove message ${i + 1}`}>Remove</Btn>
              </fieldset>
            ))}
          </div>
          {errors[Object.keys(errors).find((k) => k.startsWith('announcements')) ?? ''] && <p className="mt-3 text-[0.85rem] text-danger">{errors[Object.keys(errors).find((k) => k.startsWith('announcements'))!]}</p>}
        </Card>
        <Card title="Contact and social links">
          <p className="mb-4 text-[0.88rem] text-stone">Filled-in links appear in the footer. A WhatsApp number also adds an "Ask on WhatsApp" button to product pages.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp number" hint="International format without +, e.g. 6281234567890." error={errors.whatsapp}>{(id, db) => <input id={id} inputMode="numeric" value={s('whatsapp')} onChange={(e) => setS('whatsapp', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
            <Field label="Email" error={errors.email}>{(id, db) => <input id={id} type="email" value={s('email')} onChange={(e) => setS('email', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
            <Field label="Instagram handle" hint="Without @.">{(id, db) => <input id={id} value={s('instagram')} onChange={(e) => setS('instagram', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
            <Field label="TikTok handle" hint="Without @.">{(id, db) => <input id={id} value={s('tiktok')} onChange={(e) => setS('tiktok', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
          </div>
        </Card>
        <Card title="Tokopedia store figures">
          <p className="mb-4 text-[0.88rem] text-stone">Copy these from your Tokopedia store page now and then; the hero shows them with the date. Clear the rating to hide them.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Store rating (out of 5)" error={errors.rating}>{(id, db) => <input id={id} inputMode="decimal" value={s('rating')} onChange={(e) => setS('rating', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>
            <Field label="Reviews" error={errors.reviews}>{(id, db) => <input id={id} inputMode="numeric" value={s('reviews')} onChange={(e) => setS('reviews', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>
            <Field label="Items sold" error={errors.sold}>{(id, db) => <input id={id} inputMode="numeric" value={s('sold')} onChange={(e) => setS('sold', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>
            <Field label="As of" error={errors.statsDate}>{(id, db) => <input id={id} type="date" value={s('statsDate')} onChange={(e) => setS('statsDate', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
