import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, AlertCircle, Loader2 } from 'lucide-react';
import type { Patient } from '../types/prenatal';
import { type ChatMessage, sendPrenatalChatMessage } from '../services/chatService';

interface PrenatalChatTabProps {
  currentPatient: Patient;
  gestationalWeeks: number;
}

export const PrenatalChatTab: React.FC<PrenatalChatTabProps> = ({
  currentPatient,
  gestationalWeeks
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `🌸 Olá, ${currentPatient.nome}! Eu sou sua assistente virtual de pré-natal. Você está com **${gestationalWeeks} semanas** de gestação do ${currentPatient.nomeBebe || 'bebê'}. Como posso te ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const botResponse = await sendPrenatalChatMessage(
      text,
      currentPatient,
      gestationalWeeks,
      messages
    );

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: botResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const sugestoesPerguntas = [
    `O que esperar na ${gestationalWeeks}ª semana?`,
    'Quais alimentos devo evitar?',
    'É normal sentir cólicas leves agora?',
    'Dicas para melhorar o sono na gravidez'
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col h-[600px] overflow-hidden print:hidden">
      
      {/* Header do Chat */}
      <div className="bg-[var(--brand-primary)] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <Bot className="w-5 h-5 text-pink-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--brand-on-primary)] flex items-center gap-1.5">
              Assistente Pré-Natal IA <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h3>
            <p className="text-[10px] text-[var(--brand-on-primary-muted)]">
              Tira-dúvidas inteligente • {gestationalWeeks}ª Semana
            </p>
          </div>
        </div>
        <div className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30">
          Online
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAF6]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'bot' && (
              <div className="w-7 h-7 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                👶
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-[var(--brand-primary)] text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none whitespace-pre-line'
              }`}
            >
              <div>{msg.text}</div>
              <div
                className={`text-[9px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-white/60' : 'text-gray-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white p-3 rounded-2xl border border-gray-100 max-w-[50%]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
            <span>Assistente digitando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas */}
      <div className="p-2.5 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto">
        {sugestoesPerguntas.map((perg, idx) => (
          <button
            key={idx}
            onClick={() => setInputMessage(perg)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] rounded-full whitespace-nowrap shrink-0 transition-colors"
          >
            {perg}
          </button>
        ))}
      </div>

      {/* Input de Envio */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          placeholder="Digite sua dúvida sobre a gestação..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 text-xs p-3 border rounded-2xl focus:outline-none focus:border-[var(--brand-primary)] bg-gray-50"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 bg-[var(--brand-primary)] hover:bg-[#243921] disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Aviso de Segurança */}
      <div className="bg-amber-50 px-4 py-1.5 border-t border-amber-200 flex items-center justify-center gap-1.5 text-[10px] text-amber-900">
        <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
        <span>Em caso de sintomas de alarme ou dúvidas urgentes, contate diretamente a médica.</span>
      </div>
    </div>
  );
};
