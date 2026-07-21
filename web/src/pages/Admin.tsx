import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, formatPrice } from '../api';
import { useLang } from '../i18n';
import { useSEO } from '../seo';
import { editListingPath } from '../routes';

const ROLES = ['buyer', 'renter', 'investor', 'seller', 'landlord', 'agent', 'broker', 'lawyer', 'notary', 'admin'] as const;

type AdminUser = {
  id: number; email: string; firstName: string; lastName: string; role: string;
  phone: string | null; locale: string; createdAt: string;
};
type AdminUsersResponse = { total: number; page: number; perPage: number; results: AdminUser[] };

type AdminProperty = {
  id: number; title: string; status: string; priceCents: number; currency: string;
  city: string; listingType: string; createdAt: string; coverUrl: string | null;
  owner: { id: number; firstName: string; lastName: string; email: string };
};
type AdminPropertiesResponse = { total: number; page: number; perPage: number; results: AdminProperty[] };

interface AdminCopy {
  title: string; tabUsers: string; tabListings: string;
  searchPlaceholder: string; anyRole: string;
  addUser: string; close: string;
  fName: string; lName: string; email: string; role: string;
  phone: string; password: string;
  create: string; creating: string;
  createdOk: string; tempPassLabel: string;
  colName: string; colEmail: string; colRole: string; colJoined: string; saved: string;
  listSearchPlaceholder: string; anyStatus: string;
  colListing: string; colOwner: string; colPrice: string; colStatus: string; colCreated: string; edit: string;
  empty: string; loading: string; error: string;
  selfDemote: string;
}

const COPY: Record<'en' | 'es', AdminCopy> = {
  en: {
    title: 'Admin', tabUsers: 'Users', tabListings: 'Listings',
    searchPlaceholder: 'Search name or email…', anyRole: 'Any role',
    addUser: '+ Add user', close: 'Close',
    fName: 'First name', lName: 'Last name', email: 'Email', role: 'Role',
    phone: 'Phone (optional)', password: 'Password (optional — auto-generated if blank)',
    create: 'Create account', creating: 'Creating…',
    createdOk: 'Account created.', tempPassLabel: 'Temporary password (shown once — share it with them securely):',
    colName: 'Name', colEmail: 'Email', colRole: 'Role', colJoined: 'Joined', saved: 'Saved',
    listSearchPlaceholder: 'Search title or city…', anyStatus: 'Any status',
    colListing: 'Listing', colOwner: 'Owner', colPrice: 'Price', colStatus: 'Status', colCreated: 'Created', edit: 'Edit',
    empty: 'Nothing here yet.', loading: 'Loading…', error: 'Something went wrong — please try again.',
    selfDemote: 'You cannot remove your own admin access here — ask another admin to do it.',
  },
  es: {
    title: 'Administración', tabUsers: 'Usuarios', tabListings: 'Propiedades',
    searchPlaceholder: 'Buscar nombre o correo…', anyRole: 'Cualquier rol',
    addUser: '+ Agregar usuario', close: 'Cerrar',
    fName: 'Nombre', lName: 'Apellido', email: 'Correo', role: 'Rol',
    phone: 'Teléfono (opcional)', password: 'Contraseña (opcional — se genera automáticamente si se deja en blanco)',
    create: 'Crear cuenta', creating: 'Creando…',
    createdOk: 'Cuenta creada.', tempPassLabel: 'Contraseña temporal (se muestra una sola vez — compártela de forma segura):',
    colName: 'Nombre', colEmail: 'Correo', colRole: 'Rol', colJoined: 'Registrado', saved: 'Guardado',
    listSearchPlaceholder: 'Buscar título o ciudad…', anyStatus: 'Cualquier estado',
    colListing: 'Propiedad', colOwner: 'Propietario', colPrice: 'Precio', colStatus: 'Estado', colCreated: 'Creado', edit: 'Editar',
    empty: 'Nada por aquí todavía.', loading: 'Cargando…', error: 'Algo salió mal — intenta de nuevo.',
    selfDemote: 'No puedes quitarte tu propio acceso de administrador aquí — pide a otro administrador que lo haga.',
  },
};

export default function Admin() {
  const { lang } = useLang();
  const c = COPY[lang];
  const [tab, setTab] = useState<'users' | 'listings'>('users');

  useSEO({
    title: { en: 'Admin — Meridian', es: 'Administración — Meridian' },
    description: { en: 'Meridian admin console.', es: 'Consola de administración de Meridian.' },
  });

  return (
    <main className="section">
      <div className="container">
        <div className="row-between" style={{ marginBottom: 24 }}>
          <h1>{c.title}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn small ${tab === 'users' ? 'gold' : 'outline'}`} onClick={() => setTab('users')}>{c.tabUsers}</button>
            <button className={`btn small ${tab === 'listings' ? 'gold' : 'outline'}`} onClick={() => setTab('listings')}>{c.tabListings}</button>
          </div>
        </div>
        {tab === 'users' ? <UsersPanel c={c} /> : <ListingsPanel c={c} lang={lang} />}
      </div>
    </main>
  );
}

function UsersPanel({ c }: { c: AdminCopy }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (role) params.set('role', role);
    api.get<AdminUsersResponse>(`/api/admin/users?${params.toString()}`)
      .then((d) => { setUsers(d.results); setTotal(d.total); })
      .catch(() => setError(true));
  }, [q, role]);

  useEffect(() => { load(); }, [load]);

  async function changeRole(id: number, newRole: string) {
    setSavingId(id);
    try {
      await api.patch(`/api/admin/users/${id}`, { role: newRole });
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : c.error);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={c.searchPlaceholder}
          style={{ flex: '1 1 260px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
        >
          <option value="">{c.anyRole}</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn gold" onClick={() => setShowForm((v) => !v)}>{showForm ? c.close : c.addUser}</button>
      </div>

      {showForm && <AddUserForm c={c} onCreated={() => { setShowForm(false); load(); }} />}

      {error && <div className="alert error" style={{ marginBottom: 20 }}>{c.error}</div>}
      {users === null && !error && <p className="empty">{c.loading}</p>}
      {users !== null && users.length === 0 && <p className="empty">{c.empty}</p>}

      {users !== null && users.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{c.colName}</th>
                <th>{c.colEmail}</th>
                <th>{c.colRole}</th>
                <th>{c.colJoined}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="meta">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: 12 }}>{total}</p>
        </div>
      )}
    </>
  );
}

function AddUserForm({ c, onCreated }: { c: AdminCopy; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'buyer', phone: '', password: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ email: string; tempPassword?: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState('loading');
    setError('');
    try {
      const res = await api.post<{ user: AdminUser; temporaryPassword?: string }>('/api/admin/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      setResult({ email: res.user.email, tempPassword: res.temporaryPassword });
      setForm({ firstName: '', lastName: '', email: '', role: 'buyer', phone: '', password: '' });
      setState('idle');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : c.error);
      setState('error');
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
      />
    </label>
  );

  return (
    <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24, maxWidth: 480 }}>
      {result && (
        <div className="alert ok" style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px' }}>{c.createdOk} ({result.email})</p>
          {result.tempPassword && (
            <p style={{ margin: 0, fontFamily: 'monospace' }}>{c.tempPassLabel} <strong>{result.tempPassword}</strong></p>
          )}
        </div>
      )}
      <form onSubmit={onSubmit}>
        {field('firstName', c.fName)}
        {field('lastName', c.lName)}
        {field('email', c.email, 'email')}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>{c.role}</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {field('phone', c.phone, 'tel')}
        {field('password', c.password, 'text')}
        {error && <p style={{ color: '#e88', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}
        <button className="btn gold" type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? c.creating : c.create}
        </button>
      </form>
    </div>
  );
}

function ListingsPanel({ c, lang }: { c: AdminCopy; lang: 'en' | 'es' }) {
  const [items, setItems] = useState<AdminProperty[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    api.get<AdminPropertiesResponse>(`/api/admin/properties?${params.toString()}`)
      .then((d) => { setItems(d.results); setTotal(d.total); })
      .catch(() => setError(true));
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: number) {
    const ok = window.confirm(lang === 'es' ? '¿Eliminar esta publicación de forma permanente?' : 'Permanently delete this listing?');
    if (!ok) return;
    try { await api.delete(`/api/properties/${id}`); load(); }
    catch { setError(true); }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={c.listSearchPlaceholder}
          style={{ flex: '1 1 260px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
        >
          <option value="">{c.anyStatus}</option>
          {['draft', 'active', 'pending', 'sold', 'rented', 'inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 20 }}>{c.error}</div>}
      {items === null && !error && <p className="empty">{c.loading}</p>}
      {items !== null && items.length === 0 && <p className="empty">{c.empty}</p>}

      {items !== null && items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{c.colListing}</th>
                <th>{c.colOwner}</th>
                <th>{c.colPrice}</th>
                <th>{c.colStatus}</th>
                <th>{c.colCreated}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/property/${p.id}`}>{p.title}</Link>
                    <div className="meta">{p.city}</div>
                  </td>
                  <td>
                    {p.owner.firstName} {p.owner.lastName}
                    <div className="meta">{p.owner.email}</div>
                  </td>
                  <td>{formatPrice(p.priceCents, p.currency, p.listingType, lang === 'es' ? '/mes' : '/mo')}</td>
                  <td><span className="status-pill">{p.status}</span></td>
                  <td className="meta">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link className="btn small outline" to={editListingPath(p.id)}>{c.edit}</Link>{' '}
                    <button className="btn small danger" onClick={() => remove(p.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: 12 }}>{total}</p>
        </div>
      )}
    </>
  );
}
