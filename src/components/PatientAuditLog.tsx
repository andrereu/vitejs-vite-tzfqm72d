import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { History } from 'lucide-react';
import { db } from '../firebase';

interface AuditLogEntry {
  id: string;
  quando: Timestamp | null;
  quem: string;
  campos: string[];
}

interface PatientAuditLogProps {
  doctorId: string;
  patientId: string;
}

// Trilha de auditoria do prontuário: quem mexeu, quando e em qual seção.
// Só a equipe da médica vê isso (regra do Firestore já restringe a leitura),
// então o componente só é usado dentro das telas de médica/secretária.
export const PatientAuditLog: React.FC<PatientAuditLogProps> = ({ doctorId, patientId }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!doctorId || !patientId) return;
    const q = query(
      collection(db, 'doctors', doctorId, 'patients', patientId, 'logs'),
      orderBy('quando', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry))),
      (err) => console.warn('Erro ao carregar log de auditoria:', err)
    );
    return () => unsubscribe();
  }, [doctorId, patientId]);

  if (entries.length === 0) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-gray-500 font-bold uppercase text-[10px] cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Histórico de Alterações ({entries.length})
        </span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="p-2.5 bg-white rounded-xl border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">{entry.quem}</span>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {entry.quando?.toDate().toLocaleString('pt-BR') || '—'}
                </span>
              </div>
              <span className="text-gray-500">{(entry.campos || []).join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
