
import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, User, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Product, Collaborator } from '../types';
import { TransactionData } from './TransactionModal';

interface QuickExitModalProps {
  product: Product;
  collaborators: Collaborator[];
  onConfirm: (data: TransactionData) => void;
  onClose: () => void;
}

const QuickExitModal: React.FC<QuickExitModalProps> = ({ product, collaborators, onConfirm, onClose }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notes, setNotes] = useState('');
  const [attendantSearch, setAttendantSearch] = useState('');
  const [selectedAttendant, setSelectedAttendant] = useState<Collaborator | null>(null);
  const [showAttendantSuggestions, setShowAttendantSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const attendantRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search on mount
    if (inputRef.current) inputRef.current.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (attendantRef.current && !attendantRef.current.contains(event.target as Node)) {
        setShowAttendantSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCollaborators = collaborators.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id_fun.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendants = collaborators.filter(c =>
    c.isAlmoxarife && (
      c.name.toLowerCase().includes(attendantSearch.toLowerCase()) ||
      c.id_fun.toLowerCase().includes(attendantSearch.toLowerCase())
    )
  );

  const handleSelectCollaborator = (collab: Collaborator) => {
    setSelectedCollaborator(collab);
    setSearchTerm(`${collab.id_fun} - ${collab.name}`);
    setShowSuggestions(false);
    setError(null);
  };

  const handleSelectAttendant = (collab: Collaborator) => {
    setSelectedAttendant(collab);
    setAttendantSearch(`${collab.id_fun} - ${collab.name}`);
    setShowAttendantSuggestions(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    if (quantity > product.quantity) {
      setError('Estoque insuficiente.');
      return;
    }
    if (!selectedCollaborator) {
      setError('Selecione um colaborador válido.');
      return;
    }
    if (!selectedAttendant) {
      setError('Selecione um atendente responsável.');
      return;
    }

    onConfirm({
      quantity,
      date: new Date().toISOString().split('T')[0],
      requester: selectedCollaborator.name,
      department: selectedCollaborator.role, // Using Role as Dept equivalent
      purpose: 'Saída Rápida',
      notes,
      collaboratorId: selectedCollaborator.id_fun,
      collaboratorRole: selectedCollaborator.role,
      collaboratorContract: selectedCollaborator.contract,
      attendantId: selectedAttendant.id_fun
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 fill-white" />
            Saída Rápida
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Info */}
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg min-w-[3rem] flex items-center justify-center">
              <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{product.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Disponível: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{product.quantity} {product.unit}</span>
              </p>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Attendant Search */}
          <div className="relative" ref={attendantRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Responsável pelo Atendimento *
            </label>
            <div className="relative">
              <input
                type="text"
                value={attendantSearch}
                onChange={(e) => {
                  setAttendantSearch(e.target.value);
                  setSelectedAttendant(null);
                  setShowAttendantSuggestions(true);
                }}
                onFocus={() => setShowAttendantSuggestions(true)}
                className={`w-full pl-9 pr-4 py-2 border rounded-lg outline-none transition-all dark:bg-slate-700 dark:text-white ${!selectedAttendant && attendantSearch ? 'border-amber-400 focus:ring-2 focus:ring-amber-200' :
                  'border-slate-300 dark:border-slate-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                  }`}
                placeholder="Quem está atendendo?"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {selectedAttendant && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              )}
            </div>

            {showAttendantSuggestions && attendantSearch && !selectedAttendant && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {filteredAttendants.length > 0 ? (
                  filteredAttendants.map(c => (
                    <div
                      key={`att-q-${c.id_fun}`}
                      onClick={() => handleSelectAttendant(c)}
                      className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-800 dark:text-white">{c.name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-600 px-1.5 rounded text-slate-500 dark:text-slate-300">{c.id_fun}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-500 text-center">Nenhum funcionário encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Collaborator Search */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Colaborador (ID ou Nome) *
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedCollaborator(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className={`w-full pl-9 pr-4 py-2.5 border rounded-lg outline-none transition-all dark:bg-slate-700 dark:text-white ${!selectedCollaborator && searchTerm ? 'border-amber-400 focus:ring-2 focus:ring-amber-200' :
                  'border-slate-300 dark:border-slate-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                  }`}
                placeholder="Identifique quem está retirando..."
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {selectedCollaborator && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              )}
            </div>

            {/* Suggestions */}
            {showSuggestions && searchTerm && !selectedCollaborator && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {filteredCollaborators.length > 0 ? (
                  filteredCollaborators.map(c => (
                    <div
                      key={c.id_fun}
                      onClick={() => handleSelectCollaborator(c)}
                      className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-800 dark:text-white text-sm">{c.name}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-600 px-1.5 rounded text-slate-500 dark:text-slate-300">{c.id_fun}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{c.role}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-500 text-center">Nenhum colaborador encontrado</div>
                )}
              </div>
            )}

            {/* Auto-filled details as Disabled Inputs */}
            {selectedCollaborator && (
              <div className="grid grid-cols-2 gap-3 mt-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                  <input
                    disabled
                    value={selectedCollaborator.name}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Função</label>
                  <input
                    disabled
                    value={selectedCollaborator.role}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contrato</label>
                  <input
                    disabled
                    value={selectedCollaborator.contract}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Notes */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Qtd.
              </label>
              <input
                type="number"
                min="1"
                max={product.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-mono font-bold text-center"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Obs (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="Detalhes..."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedCollaborator || !selectedAttendant || quantity > product.quantity}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-bold shadow-md shadow-orange-200 dark:shadow-none transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
              Confirmar Saída
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickExitModal;
