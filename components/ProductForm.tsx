
import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Loader2, Save, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Category, UNITS, Unit, Product } from '../types';
import { suggestCategory } from '../services/geminiService';

interface ProductFormProps {
  initialData?: Product | null;
  categories: Category[];
  onSave: (product: Omit<Product, 'id' | 'lastUpdated'>) => void;
  onCancel?: () => void;
  allProducts: Product[];
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData, categories, onSave, onCancel, allProducts }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [category, setCategory] = useState<Category>('Outros');
  const [unit, setUnit] = useState<Unit>('un');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Equipment Specific
  const [tag, setTag] = useState('');
  const [empresaLocadora, setEmpresaLocadora] = useState('');
  const [valorLocacao, setValorLocacao] = useState<number>(0);
  const [tagConflict, setTagConflict] = useState<{name: string, sku: string} | null>(null);

  const [isSuggesting, setIsSuggesting] = useState(false);

  // Função para gerar SKU sequencial
  const generateNextSku = () => {
    let maxNum = 0;
    allProducts.forEach(p => {
      // Extrai apenas os números do SKU existente (ex: "FER-0050" vira 50)
      const matches = p.sku?.match(/\d+/);
      if (matches) {
        const num = parseInt(matches[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    // Próximo número + formatação com 5 dígitos (ex: 00051)
    return (maxNum + 1).toString().padStart(5, '0');
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSku(initialData.sku || '');
      setQuantity(initialData.quantity);
      setMinStock(initialData.minStock);
      setCategory(initialData.category);
      setUnit(initialData.unit || 'un');
      setLocation(initialData.location || '');
      setDescription(initialData.description || '');
      setTag(initialData.tag || '');
      setEmpresaLocadora(initialData.empresa_locadora || '');
      setValorLocacao(initialData.valor_locacao || 0);
    } else {
      // Se for novo produto, gera SKU automaticamente
      setSku(generateNextSku());
    }
  }, [initialData]); // Removido allProducts das dependências para evitar regenarção constante se a lista mudar externamente enquanto edita

  const handleTagBlur = () => {
    if (!tag.trim() || category !== 'Equipamentos') return;
    const conflict = allProducts.find(p => p.tag?.toUpperCase() === tag.trim().toUpperCase() && p.id !== initialData?.id);
    if (conflict) {
      setTagConflict({ name: conflict.name, sku: conflict.sku });
    } else {
      setTagConflict(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (category === 'Equipamentos') {
      if (!tag.trim()) {
        alert('TAG é obrigatório para equipamentos.');
        return;
      }
      if (!empresaLocadora.trim()) {
        alert('Empresa Locadora é obrigatória para equipamentos.');
        return;
      }
      if (tagConflict && !confirm(`⚠️ O TAG "${tag}" já está em uso pelo produto "${tagConflict.name}". Deseja continuar mesmo assim?`)) {
        return;
      }
    }
    
    onSave({
      name,
      sku,
      quantity,
      minStock,
      category,
      unit,
      location,
      description,
      tag: category === 'Equipamentos' ? tag.toUpperCase().trim() : undefined,
      empresa_locadora: category === 'Equipamentos' ? empresaLocadora.trim() : undefined,
      valor_locacao: category === 'Equipamentos' ? valorLocacao : undefined,
      data_locacao: category === 'Equipamentos' ? (initialData?.data_locacao || new Date().toISOString()) : undefined
    });
  };

  const handleBlurName = async () => {
    if (!name.trim() || initialData) return;
    setIsSuggesting(true);
    const suggested = await suggestCategory(name);
    if (suggested && categories.includes(suggested)) {
      setCategory(suggested);
    }
    setIsSuggesting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {initialData ? <Save className="w-5 h-5 text-primary-600" /> : <Plus className="w-5 h-5 text-primary-600" />}
          {initialData ? 'Editar Produto' : 'Novo Produto'}
        </h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Produto *</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleBlurName}
              placeholder="Ex: Gerador de Energia 5KVA"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              required
            />
            {isSuggesting && <div className="absolute right-3 top-2.5"><Loader2 className="w-4 h-4 text-primary-500 animate-spin" /></div>}
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código / SKU</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono"
              placeholder="Auto-gerado"
            />
            <button 
              type="button" 
              onClick={() => setSku(generateNextSku())}
              className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              title="Gerar próximo SKU sequencial"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'Equipamentos' ? 'Equipamentos (Locação)' : cat}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidade</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-700 dark:text-white">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estoque Inicial</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            min="0"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estoque Mínimo</label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            min="0"
          />
        </div>

        {/* Campos Específicos para Equipamentos */}
        {category === 'Equipamentos' && (
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 animate-in fade-in">
            <div className="md:col-span-1 relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">TAG do Equipamento *</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                onBlur={handleTagBlur}
                placeholder="Ex: EQ-001"
                className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white outline-none font-mono ${tagConflict ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-primary-500'}`}
              />
              {tagConflict && (
                <div className="absolute top-full left-0 mt-1 w-full bg-red-50 text-red-600 text-xs p-2 rounded border border-red-100 z-10 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Em uso por: <b>{tagConflict.name}</b> ({tagConflict.sku})</span>
                </div>
              )}
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa Locadora *</label>
              <input
                type="text"
                value={empresaLocadora}
                onChange={(e) => setEmpresaLocadora(e.target.value)}
                placeholder="Ex: Locadora XYZ"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Locação (Mensal)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={valorLocacao}
                  onChange={(e) => setValorLocacao(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="md:col-span-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Localização</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="Ex: Prateleira B3"
          />
        </div>

        <div className="md:col-span-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="Detalhes adicionais..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {initialData ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
