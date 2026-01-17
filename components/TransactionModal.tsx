

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Check, Search, User, ShieldCheck } from 'lucide-react';
import { Product, Collaborator } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'entrada' | 'saida';
  product: Product;
  collaborators: Collaborator[];
  onConfirm: (data: TransactionData) => void;
}

export interface TransactionData {
  quantity: number;
  date: string;
  time: string;
  unitPrice?: number;
  // Entry fields
  supplier?: string;
  invoiceNumber?: string;
  notes?: string;
  // Exit fields
  requester?: string;
  department?: string;
  purpose?: string;
  // Linked Collaborator (Receiver)
  collaboratorId?: string;
  collaboratorRole?: string;
  collaboratorContract?: string;
  // Attendant (Warehouse Staff)
  attendantId?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, type, product, collaborators, onConfirm }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [unitPrice, setUnitPrice] = useState<number>(product.price || 0);

  // Entry Fields
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Exit Fields (Collaborator Search)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Manual fallback fields (if needed, but mainly populated by collab)
  const [department, setDepartment] = useState(''); // Used for Role/Dept
  const [purpose, setPurpose] = useState('');

  // Attendant Fields
  const [attendantSearch, setAttendantSearch] = useState('');
  const [selectedAttendant, setSelectedAttendant] = useState<Collaborator | null>(null);
  const [showAttendantSuggestions, setShowAttendantSuggestions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const attendantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnitPrice(product.price || 0);
    }
  }, [isOpen, product]);

  useEffect(() => {
    // Close suggestions on click outside
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside collaborator search
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      // Check if click is outside attendant search
      if (attendantRef.current && !attendantRef.current.contains(event.target as Node)) {
        setShowAttendantSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isEntry = type === 'entrada';
  const title = isEntry ? 'Registrar Entrada' : 'Registrar Saída';
  const themeColor = isEntry ? 'text-emerald-600' : 'text-red-600';
  const buttonColor = isEntry ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700';

  // Filter collaborators based on search
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
  };

  const handleSelectAttendant = (collab: Collaborator) => {
    setSelectedAttendant(collab);
    setAttendantSearch(`${collab.id_fun} - ${collab.name}`);
    setShowAttendantSuggestions(false);
  };

  const clearCollaborator = () => {
    setSelectedCollaborator(null);
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEntry && (!selectedCollaborator || !selectedAttendant)) {
      // Basic validation for exit (Receiver and Attendant mandatory)
      alert("Por favor, selecione quem está retirando e quem está atendendo.");
      return;
    }

    onConfirm({
      quantity,
      date,
      time,
      unitPrice: isEntry ? unitPrice : undefined,
      supplier,
      invoiceNumber,
      notes,
      // Map collaborator fields
      requester: selectedCollaborator ? selectedCollaborator.name : '',
      department: selectedCollaborator ? selectedCollaborator.role : '', // Using Role as Dept equivalent here
      purpose,
      collaboratorId: selectedCollaborator?.id || selectedCollaborator?.id_fun,
      collaboratorRole: selectedCollaborator?.role,
      collaboratorContract: selectedCollaborator?.contract,
      attendantId: selectedAttendant?.id_fun
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h3 className={`text-xl font-bold flex items-center gap-2 ${themeColor}`}>
            {isEntry ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Produto Selecionado</span>
            <div className="flex justify-between items-end">
              <p className="font-semibold text-slate-800 dark:text-white">{product.name}</p>
              <div className="text-right">
                <p className="text-sm text-slate-600 dark:text-slate-300">Estoque atual: <span className="font-mono font-bold">{product.quantity}</span> {product.unit}</p>
                {product.price !== undefined && <p className="text-xs text-slate-500 dark:text-slate-400">Preço atual: R$ {product.price.toFixed(2)}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                max={!isEntry ? product.quantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-slate-400 outline-none"
                required
              />
              {!isEntry && quantity > product.quantity && (
                <p className="text-xs text-red-500 mt-1">Insuficiente no estoque</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data/Hora *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-slate-400 outline-none"
                  required
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-slate-400 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {isEntry ? (
            /* --- ENTRY FORM --- */
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nº Nota Fiscal</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: NF-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </>
          ) : (
            /* --- EXIT FORM WITH COLLABORATOR SEARCH --- */
            <>
              {/* Mandatory Warehouse Attendant Selection */}
              <div className="relative mb-2" ref={attendantRef}>
                <label className="block text-sm font-bold text-tecnomonte-blue dark:text-tecnomonte-gold mb-1">Responsável pelo Atendimento (Almoxarifado) *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={attendantSearch}
                    onChange={(e) => {
                      setAttendantSearch(e.target.value);
                      setShowAttendantSuggestions(true);
                      if (selectedAttendant) setSelectedAttendant(null);
                    }}
                    onFocus={() => setShowAttendantSuggestions(true)}
                    className={`w-full pl-9 pr-8 py-2 border ${!selectedAttendant && attendantSearch ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-300 dark:border-slate-600 focus:ring-tecnomonte-blue'} rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2`}
                    placeholder="Quem está entregando o material?"
                    required
                  />
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  {selectedAttendant && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                </div>

                {showAttendantSuggestions && attendantSearch && !selectedAttendant && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredAttendants.length > 0 ? (
                      filteredAttendants.map(c => (
                        <div
                          key={`att-${c.id_fun}`}
                          onClick={() => handleSelectAttendant(c)}
                          className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800 dark:text-white text-sm">{c.name}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-600 px-1.5 rounded text-slate-600 dark:text-slate-300 font-mono">{c.id_fun}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-500 text-center">Nenhum funcionário encontrado.</div>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-slate-100 dark:border-slate-700 my-4" />
              <div className="relative" ref={searchRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar Colaborador (ID ou Nome) *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      if (selectedCollaborator) setSelectedCollaborator(null); // Reset selection on edit
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className={`w-full pl-9 pr-8 py-2 border ${!selectedCollaborator && searchTerm ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-300 dark:border-slate-600 focus:ring-red-500'} rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2`}
                    placeholder="Digite ID ou nome..."
                    required
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  {selectedCollaborator && (
                    <button
                      type="button"
                      onClick={clearCollaborator}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && searchTerm && !selectedCollaborator && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCollaborators.length > 0 ? (
                      filteredCollaborators.map(c => (
                        <div
                          key={c.id_fun}
                          onClick={() => handleSelectCollaborator(c)}
                          className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800 dark:text-white">{c.name}</span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">{c.id_fun}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{c.role} • {c.contract}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                        Nenhum colaborador encontrado.
                      </div>
                    )}
                  </div>
                )}

                {/* Error message if trying to submit without selection */}
                {!selectedCollaborator && searchTerm.length > 0 && !showSuggestions && (
                  <p className="text-xs text-red-500 mt-1">Selecione um colaborador da lista.</p>
                )}
              </div>

              {/* Auto-filled Read-Only Fields */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Colaborador</label>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                    <User className="w-4 h-4 text-slate-400" />
                    {selectedCollaborator ? selectedCollaborator.name : <span className="text-slate-400 italic font-normal">--</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Função</label>
                  <input
                    disabled
                    value={selectedCollaborator ? selectedCollaborator.role : ''}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-1 text-sm text-slate-700 dark:text-slate-300 outline-none"
                    placeholder="--"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contrato</label>
                  <input
                    disabled
                    value={selectedCollaborator ? selectedCollaborator.contract : ''}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-1 text-sm text-slate-700 dark:text-slate-300 outline-none"
                    placeholder="--"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Finalidade</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ex: Uso na obra, Reparo..."
                />
              </div>
            </>
          )}

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isEntry && (!selectedCollaborator || !selectedAttendant || quantity > product.quantity)}
              className={`${buttonColor} text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
