
import React, { useState } from 'react';
import { X, Edit2, Trash2, Calendar, MapPin, Tag, Box, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { Product, Transaction } from '../types';

interface ProductDetailsModalProps {
  product: Product;
  history: Transaction[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, history, onClose, onEdit, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const productHistory = history.filter(t => t.productId === product.id);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{product.name}</h2>
            <p className="text-sm text-slate-500 font-mono">{product.sku || 'Sem SKU'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details' ? 'border-primary-600 text-primary-600 bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'history' ? 'border-primary-600 text-primary-600 bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Histórico ({productHistory.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Box className="w-4 h-4" /> <span className="text-sm font-medium">Estoque Atual</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{product.quantity} <span className="text-base font-normal text-slate-500">{product.unit}</span></p>
                  {product.quantity < product.minStock && (
                    <p className="text-red-500 text-xs font-medium mt-1">⚠️ Abaixo do mínimo ({product.minStock})</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Tag className="w-4 h-4" /> <span className="text-xs uppercase font-bold">Categoria</span>
                    </div>
                    <p className="text-slate-800">{product.category}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <MapPin className="w-4 h-4" /> <span className="text-xs uppercase font-bold">Localização</span>
                    </div>
                    <p className="text-slate-800">{product.location || 'Não definida'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <FileText className="w-4 h-4" /> <span className="text-sm font-bold">Descrição</span>
                </div>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {product.description || 'Nenhuma descrição informada.'}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={onEdit}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {productHistory.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhuma movimentação registrada.</p>
              ) : (
                productHistory.sort((a,b) => b.timestamp - a.timestamp).map((t) => (
                  <div key={t.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {t.type === 'entrada' 
                          ? <ArrowUp className="w-4 h-4 text-emerald-600" /> 
                          : <ArrowDown className="w-4 h-4 text-red-600" />
                        }
                        <span className="font-bold text-slate-700">
                          {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {new Date(t.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`font-mono font-bold ${t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'entrada' ? '+' : '-'}{t.quantity}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      {t.type === 'entrada' ? (
                        <>
                          <p><span className="font-semibold">Forn:</span> {t.supplier || '-'}</p>
                          <p><span className="font-semibold">NF:</span> {t.invoiceNumber || '-'}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-semibold">Solic:</span> {t.requester || '-'}</p>
                          <p><span className="font-semibold">Dest:</span> {t.department || '-'}</p>
                        </>
                      )}
                    </div>
                    {t.notes && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 italic">
                        "{t.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
