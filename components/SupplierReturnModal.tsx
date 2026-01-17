
import React, { useState } from 'react';
import { X, Truck, AlertTriangle, CheckCircle2, AlertOctagon, CalendarOff } from 'lucide-react';
import { Product } from '../types';

interface SupplierReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (data: { quantity: number; reason: 'fim_uso' | 'dano'; notes: string }) => void;
}

const SupplierReturnModal: React.FC<SupplierReturnModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<'fim_uso' | 'dano' | null>(null);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onConfirm({ quantity, reason, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white border-b border-slate-700">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            Devolução ao Fornecedor
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Info */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
            <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{product.name}</h4>
            <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{product.sku}</span>
                {product.empresa_locadora && (
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">{product.empresa_locadora}</span>
                )}
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Estoque atual: <b>{product.quantity}</b> {product.unit}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Motivo da Devolução *</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setReason('fim_uso')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        reason === 'fim_uso' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                        : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 text-slate-500 dark:text-slate-400'
                    }`}
                >
                    <CalendarOff className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase">Fim de Uso</span>
                </button>

                <button
                    type="button"
                    onClick={() => setReason('dano')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        reason === 'dano' 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                        : 'border-slate-200 dark:border-slate-600 hover:border-red-300 text-slate-500 dark:text-slate-400'
                    }`}
                >
                    <AlertOctagon className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase">Dano / Defeito</span>
                </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Quantidade a Devolver
            </label>
            <input
              type="number"
              min="1"
              max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 font-bold"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Observações (Opcional)
            </label>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Nº do chamado de recolhimento..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 text-sm resize-none h-20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason || quantity <= 0 || quantity > product.quantity}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirmar Devolução
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierReturnModal;
