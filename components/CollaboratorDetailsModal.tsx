
import React, { useState, useMemo } from 'react';
import { X, Package, RotateCcw, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Collaborator, Transaction, Product } from '../types';

interface CollaboratorDetailsModalProps {
  collaborator: Collaborator;
  history: Transaction[];
  products: Product[];
  onClose: () => void;
  onReturnItem: (productId: string, quantity: number, notes?: string) => void;
  onWriteOffItem: (productId: string, quantity: number, notes?: string) => void;
}

const CollaboratorDetailsModal: React.FC<CollaboratorDetailsModalProps> = ({ 
  collaborator, 
  history, 
  products, 
  onClose,
  onReturnItem,
  onWriteOffItem
}) => {
  const [actionItem, setActionItem] = useState<{id: string, name: string, maxQty: number, type: 'return' | 'writeoff'} | null>(null);
  const [actionQty, setActionQty] = useState(1);
  const [actionNotes, setActionNotes] = useState('');

  // Calculate Items in Possession
  const possessionItems = useMemo(() => {
    const itemMap = new Map<string, { product: Product | undefined; name: string; quantity: number; firstWithdrawal: number }>();
    
    // Filter history for this collaborator
    const userHistory = history
      .filter(t => t.collaboratorId === collaborator.id_fun)
      .sort((a, b) => a.timestamp - b.timestamp);

    userHistory.forEach(t => {
      // Get product details (might be deleted, so we use transaction name as fallback)
      const prod = products.find(p => p.id === t.productId);
      const prodName = prod?.name || t.productName;

      const current = itemMap.get(t.productId) || { 
        product: prod, 
        name: prodName, 
        quantity: 0, 
        firstWithdrawal: t.timestamp 
      };

      if (t.type === 'saida') {
        current.quantity += t.quantity;
      } else if (t.type === 'entrada' || t.type === 'baixa') {
        current.quantity -= t.quantity;
      }

      if (current.quantity > 0) {
        itemMap.set(t.productId, current);
      } else {
        itemMap.delete(t.productId);
      }
    });

    return Array.from(itemMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [history, collaborator.id_fun, products]);

  const handleActionClick = (item: typeof possessionItems[0], type: 'return' | 'writeoff') => {
    setActionItem({
      id: item.id,
      name: item.name,
      maxQty: item.quantity,
      type
    });
    setActionQty(1);
    setActionNotes('');
  };

  const confirmAction = () => {
    if (!actionItem) return;
    
    if (actionItem.type === 'return') {
      onReturnItem(actionItem.id, actionQty, actionNotes);
    } else {
      onWriteOffItem(actionItem.id, actionQty, actionNotes);
    }
    setActionItem(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" />
              Gestão de Posse
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {collaborator.name} <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">{collaborator.id_fun}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {possessionItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Nada consta</h3>
              <p className="text-slate-500 dark:text-slate-400">Este colaborador não possui itens pendentes de devolução.</p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                 <div>
                   <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Gerenciamento de Itens</h4>
                   <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                     Utilize <b>Devolução</b> para retornar o item ao estoque (disponível para outros).<br/>
                     Utilize <b>Baixa</b> para descartar o item (quebrado, perdido, consumido) sem retornar ao estoque.
                   </p>
                 </div>
               </div>

               <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                     <tr>
                       <th className="px-4 py-3">Item</th>
                       <th className="px-4 py-3">Data Retirada</th>
                       <th className="px-4 py-3 text-center">Qtd em Posse</th>
                       <th className="px-4 py-3 text-right">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {possessionItems.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <td className="px-4 py-3">
                           <p className="font-bold text-slate-800 dark:text-white">{item.name}</p>
                           {item.product?.tag && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">TAG: {item.product.tag}</span>}
                           {item.product?.sku && <span className="text-[10px] text-slate-400 ml-2">SKU: {item.product.sku}</span>}
                         </td>
                         <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                           {new Date(item.firstWithdrawal).toLocaleDateString()}
                         </td>
                         <td className="px-4 py-3 text-center">
                           <span className="font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                             {item.quantity} {item.product?.unit || 'un'}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => handleActionClick(item, 'return')}
                               className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-bold transition-colors"
                               title="Devolver ao Estoque"
                             >
                               <RotateCcw className="w-3.5 h-3.5" /> Devolver
                             </button>
                             <button 
                               onClick={() => handleActionClick(item, 'writeoff')}
                               className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition-colors"
                               title="Dar Baixa (Descarte)"
                             >
                               <Trash2 className="w-3.5 h-3.5" /> Baixa
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Confirmation Modal Overlay */}
      {actionItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm animate-in zoom-in-95">
            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${actionItem.type === 'return' ? 'text-emerald-600' : 'text-red-600'}`}>
              {actionItem.type === 'return' ? <RotateCcw className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              {actionItem.type === 'return' ? 'Devolução ao Estoque' : 'Baixa de Material'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {actionItem.type === 'return' 
                ? `O item "${actionItem.name}" voltará a ser contado no estoque disponível.` 
                : `O item "${actionItem.name}" será removido da posse do colaborador e NÃO voltará ao estoque (Descarte/Consumo).`
              }
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                <input 
                  type="number" 
                  min="1" 
                  max={actionItem.maxQty}
                  value={actionQty}
                  onChange={(e) => setActionQty(Math.min(actionItem.maxQty, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-mono font-bold"
                />
                <p className="text-xs text-slate-400 mt-1">Máximo: {actionItem.maxQty}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo / Observação</label>
                <input 
                  type="text" 
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionItem.type === 'return' ? "Ex: Devolução de rotina" : "Ex: Quebrado, Consumido na obra"}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setActionItem(null)}
                className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAction}
                className={`flex-1 py-2 text-white rounded-lg font-bold shadow-sm ${actionItem.type === 'return' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorDetailsModal;
