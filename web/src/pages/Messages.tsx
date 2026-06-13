import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Conversation, type Message } from '../api';
import { useLang } from '../i18n';

export default function Messages() {
  const { t } = useLang();
  const { userId } = useParams();
  const navigate = useNavigate();
  const activeId = userId && /^\d+$/.test(userId) ? Number(userId) : null;

  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [thread, setThread] = useState<Message[] | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(() => {
    api.get<{ results: Conversation[] }>('/api/messages/conversations')
      .then((d) => setConvos(d.results))
      .catch(() => setError(true));
  }, []);

  const loadThread = useCallback((id: number) => {
    api.get<{ results: Message[] }>(`/api/messages/thread/${id}`)
      .then((d) => setThread(d.results))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  useEffect(() => {
    setThread(null);
    if (activeId !== null) loadThread(activeId);
  }, [activeId, loadThread]);

  // Light polling keeps the open thread fresh without websockets.
  useEffect(() => {
    if (activeId === null) return;
    const iv = window.setInterval(() => loadThread(activeId), 15000);
    return () => window.clearInterval(iv);
  }, [activeId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (activeId === null || !body.trim() || sending) return;
    setSending(true);
    try {
      const d = await api.post<{ message: Message }>('/api/messages', { recipientId: activeId, body: body.trim() });
      setThread((th) => th ? [...th, d.message] : [d.message]);
      setBody('');
      loadConvos();
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  const active = convos?.find((c) => c.userId === activeId) ?? null;

  return (
    <main className="section">
      <div className="container">
        <h1>{t('msg.title')}</h1>
        {error && <div className="alert error">{t('common.error')}</div>}
        {convos === null && !error && <p className="empty">{t('common.loading')}</p>}
        {convos !== null && convos.length === 0 && <p className="empty">{t('msg.none')}</p>}
        {convos !== null && convos.length > 0 && (
          <div className="msg-grid">
            <div className="conv-list">
              {convos.map((c) => (
                <button
                  key={c.userId}
                  className={`conv ${c.userId === activeId ? 'active' : ''}`}
                  onClick={() => navigate(`/messages/${c.userId}`)}
                >
                  <span className="who">{c.name}{c.unread > 0 && <span className="badge"> {c.unread}</span>}</span>
                  <span className="preview">{c.lastFromMe ? '↗ ' : ''}{c.lastBody}</span>
                </button>
              ))}
            </div>

            {activeId !== null && (
              <div className="thread">
                {active && <div className="conv active" aria-hidden="true"><span className="who">{active.name}</span></div>}
                <div className="bubbles">
                  {thread === null && <p className="meta">{t('common.loading')}</p>}
                  {thread?.map((m) => (
                    <div key={m.id} className={`bubble ${m.fromMe ? 'mine' : ''}`}>{m.body}</div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="composer" onSubmit={send}>
                  <input
                    value={body} onChange={(e) => setBody(e.target.value)}
                    placeholder={t('msg.placeholder')} aria-label={t('msg.placeholder')} maxLength={2000}
                  />
                  <button className="btn gold" disabled={sending || !body.trim()}>{t('msg.send')}</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
