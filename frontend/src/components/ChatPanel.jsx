import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function ChatPanel({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hi! I\'m your CarbonLens AI assistant. Ask me anything about your emissions data, reduction strategies, or carbon footprint.' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setMessages(prev => [...prev, { role: 'user', text }]);
        setInput('');
        setLoading(true);

        try {
            const json = await api.post('/chat', { message: text });
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: json.data.answer,
                source: json.data.source,
                sql: json.data.sql || null,
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: 'Sorry, I encountered an error. Please try again.',
                error: true,
            }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickQuestions = [
        'What are my total emissions?',
        'Which category is the highest?',
        'How can I reduce emissions?',
        'Compare my scope breakdown',
    ];

    if (!isOpen) return null;

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        AI
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>CarbonLens AI</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ask about your carbon data</div>
                    </div>
                </div>
                <button className="btn-ghost" onClick={onClose} style={{ fontSize: '18px', padding: '4px 8px' }}>✕</button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                        <div className={`chat-bubble ${msg.role} ${msg.error ? 'error' : ''}`}>
                            {msg.text}
                            {msg.sql && (
                                <details style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                                    <summary style={{ cursor: 'pointer', color: 'var(--accent-indigo)', fontWeight: 600 }}>SQL Query</summary>
                                    <pre style={{ margin: '6px 0 0', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.65rem', lineHeight: 1.4 }}>
                                        {msg.sql}
                                    </pre>
                                </details>
                            )}
                            {msg.source === 'gemini' && (
                                <span className="chat-source">Gemini AI</span>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="chat-message assistant">
                        <div className="chat-bubble assistant">
                            <div className="chat-typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && (
                <div className="chat-quick-actions">
                    {quickQuestions.map((q, i) => (
                        <button key={i} className="chat-quick-btn" onClick={() => { setInput(q); setTimeout(sendMessage, 50); }}>
                            {q}
                        </button>
                    ))}
                </div>
            )}

            <div className="chat-input-area">
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your emissions..."
                    disabled={loading}
                />
                <button className="chat-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
