
import React, { useState } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { AdvancedFilter, Category } from '../types';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: AdvancedFilter) => void;
  currentFilters: AdvancedFilter;
  categories: Category[];
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ isOpen, onClose, onSearch, currentFilters, categories }) => {
  const [filters, setFilters] = useState<AdvancedFilter>(currentFilters);

  if (!isOpen) return null;

  const handleReset = () => {
    const reset: AdvancedFilter = {
      nameContains: '',
      skuContains: '',
      category: 'Todas',
      locationContains: '',
      minQuantity: undefined,
      maxQuantity: undefined,
      onlyLowStock: false
    };
    setFilters(reset);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-600" />
            Busca Avançada
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome contém</label>
              <input
                type="text"
                value={filters.nameContains}
                onChange={(e) => setFilters(prev => ({ ...prev, nameContains: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Parafuso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU contém</label>
              <input
                type="text"
                value={filters.skuContains}
                onChange={(e) => setFilters(prev => ({ ...prev, skuContains: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: 001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as Category | 'Todas' }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="Todas">Todas</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Localização contém</label>
              <input
                type="text"
                value={filters.locationContains}
                onChange={(e) => setFilters(prev => ({ ...prev, locationContains: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Prateleira A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qtd Mínima</label>
              <input
                type="number"
                value={filters.minQuantity || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, minQuantity: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qtd Máxima</label>
              <input
                type="number"
                value={filters.maxQuantity || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, maxQuantity: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            
            <div className="col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyLowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, onlyLowStock: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Apenas produtos com estoque baixo</span>
              </label>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              Limpar Filtros
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;
