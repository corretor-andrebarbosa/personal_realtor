
import React, { useState, useEffect, useRef } from 'react';
import { Send, Upload, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useProperties } from '../contexts/PropertyContext';
import { systemConfig } from '../system-config';
import { useSiteSettings } from '../hooks/useSiteSettings';

const LLMAssistant = () => {
    const { properties } = useProperties();
    const { settings: siteSettings, loading: settingsLoading } = useSiteSettings();
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'kaleb',
            text: 'Olá André! Já estudei sua carteira de imóveis e estou pronto. Pode me perguntar sobre preços, localizações ou detalhes dos seus ' + properties.length + ' imóveis cadastrados.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const callGemini = async (prompt, apiKey) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(`Gemini: ${data.error.message}`);
        return data.candidates[0].content.parts[0].text;
    };

    const callGroq = async (prompt, apiKey) => {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(`Groq: ${data.error.message}`);
        return data.choices[0].message.content;
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = {
            id: messages.length + 1,
            sender: 'user',
            text: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        const userInput = input;
        setInput('');
        setIsTyping(true);

        // Lê as chaves do hook (Supabase) com fallback para localStorage
        const systemPrompt = siteSettings?.system_prompt
            || localStorage.getItem('ab-system-prompt')
            || `Você é Kaleb, assistente do corretor ${systemConfig.brokerName}.`;
        const geminiKey = siteSettings?.gemini_key || localStorage.getItem('ab-gemini-key') || '';
        const groqKey = siteSettings?.groq_key || localStorage.getItem('ab-groq-key') || '';
        const lastProvider = localStorage.getItem('ab-last-llm-provider') || 'gemini';

        // Summary of properties for context
        const propertySummary = properties.map(p =>
            `- ${p.title}: ${p.type} em ${p.address}. Preço: R$ ${p.price || p.salePrice || 0}. Aluguel: R$ ${p.rentalPrice || 0}. ${p.rooms} quartos.`
        ).join('\n');

        const fullPrompt = `${systemPrompt}\n\nCONTEXTO DOS IMÓVEIS ATUAIS:\n${propertySummary}\n\nPERGUNTA DO USUÁRIO: ${userInput}\n\nResponda de forma curta e objetiva.`;

        let responseText = '';
        let success = false;
        const errors = [];

        // Round-robin & Fallback Logic
        const providers = lastProvider === 'gemini' ? ['groq', 'gemini'] : ['gemini', 'groq'];

        for (const provider of providers) {
            try {
                if (provider === 'gemini' && geminiKey) {
                    responseText = await callGemini(fullPrompt, geminiKey);
                    localStorage.setItem('ab-last-llm-provider', 'gemini');
                    success = true;
                    break;
                } else if (provider === 'groq' && groqKey) {
                    responseText = await callGroq(fullPrompt, groqKey);
                    localStorage.setItem('ab-last-llm-provider', 'groq');
                    success = true;
                    break;
                }
            } catch (error) {
                errors.push(`${provider}: ${error.message}`);
                continue;
            }
        }

        if (!success) {
            const noKeys = !geminiKey && !groqKey;
            if (noKeys) {
                responseText = "Chaves de API não encontradas. Vá em Configurações → Treinar Kaleb e salve suas chaves do Gemini e/ou Groq.";
            } else {
                responseText = `Não consegui responder agora. Erros:\n${errors.join('\n')}\n\nVerifique se o Brave Shield está bloqueando (ícone 🦁 na barra de endereço) ou tente novamente.`;
            }
        }

        setMessages(prev => [...prev, {
            id: prev.length + 1,
            sender: 'kaleb',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
    };

    const hasKeys = !settingsLoading && (
        (siteSettings?.gemini_key || localStorage.getItem('ab-gemini-key')) ||
        (siteSettings?.groq_key || localStorage.getItem('ab-groq-key'))
    );

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f8fafc]">
            <div className="bg-white p-4 shadow-sm flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-lg">
                        K
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">Kaleb</h1>
                        <p className="text-xs flex items-center gap-1">
                            {settingsLoading
                                ? <><Loader2 size={12} className="animate-spin text-slate-400" /><span className="text-slate-400">Carregando configurações...</span></>
                                : hasKeys
                                    ? <><Sparkles size={12} className="text-blue-500" /><span className="text-slate-500">LLM Conectado</span></>
                                    : <><AlertCircle size={12} className="text-amber-500" /><span className="text-amber-500">Chaves de API não configuradas</span></>
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${msg.sender === 'user'
                                ? 'bg-[var(--primary-color)] text-white rounded-br-none'
                                : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <span className={`text-[10px] block mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                {msg.timestamp}
                            </span>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white text-slate-400 rounded-2xl rounded-bl-none p-3 border border-slate-100 shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-xs font-medium">Kaleb está pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 mb-16">
                <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-full border border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Upload size={20} />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte ao Kaleb..."
                        className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isTyping}
                        className={`p-2 rounded-full transition-colors shadow-sm ${isTyping ? 'bg-slate-300' : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-dark)]'}`}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    {settingsLoading ? 'Carregando chaves...' : hasKeys ? 'Kaleb alterna entre Gemini e Groq para maior eficiência.' : 'Configure as chaves em Configurações → Treinar Kaleb'}
                </p>
            </div>
        </div>
    );
};

export default LLMAssistant;
