
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { X, Printer, Search, CheckSquare, Square, Tag, ListFilter, GripVertical } from 'lucide-react';

interface LabelPrinterProps {
  products: Product[];
  onClose: () => void;
}

const LabelPrinter: React.FC<LabelPrinterProps> = ({ products, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(400); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        // Enforce min and max widths
        const newWidth = Math.max(250, Math.min(800, mouseMoveEvent.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 overflow-hidden flex flex-col">
      {/* Screen Header (Hidden on Print) */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-tecnomonte-blue no-print shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-tecnomonte-gold p-1.5 rounded-sm">
            <Tag className="w-5 h-5 text-tecnomonte-blue" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Gerador de Etiquetas</h2>
            <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Utilitário Industrial v2.0</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-sm font-black uppercase text-xs tracking-widest transition-all ${selectedIds.size > 0
              ? 'bg-tecnomonte-gold text-tecnomonte-blue hover:scale-105 shadow-lg'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              }`}
          >
            <Printer className="w-4 h-4" /> Imprimir ({selectedIds.size})
          </button>
          <button onClick={onClose} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-sm font-black uppercase text-xs tracking-widest border border-white/10 transition-colors">
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Selection (Hidden on Print) */}
        <div
          className="flex flex-col border-r border-slate-700 bg-slate-800 no-print transition-[width] duration-75 ease-out relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="p-4 space-y-4 border-b border-slate-700 bg-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="BUSCAR POR NOME, SKU OU TIPO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-sm text-xs font-bold text-white uppercase tracking-widest outline-none focus:border-tecnomonte-gold transition-colors placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                {filteredProducts.length} Materiais Disponíveis
              </span>
              <button
                onClick={selectAll}
                className="text-[10px] font-black text-tecnomonte-gold uppercase hover:underline flex items-center gap-1.5"
              >
                <ListFilter className="w-3 h-3" />
                {selectedIds.size === filteredProducts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-900/50 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  <th className="p-4 w-12 text-center">Sel.</th>
                  <th className="p-4">Código / Material</th>
                  <th className="p-4">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => toggleSelection(p.id)}
                    className={`cursor-pointer transition-colors group ${selectedIds.has(p.id) ? 'bg-tecnomonte-gold/10' : 'hover:bg-slate-800'}`}
                  >
                    <td className="p-4 text-center">
                      {selectedIds.has(p.id) ? (
                        <CheckSquare className="w-5 h-5 text-tecnomonte-gold mx-auto" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-700 group-hover:text-slate-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-black text-white uppercase tracking-wider">{p.name}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">{p.sku || '-'}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded-sm">
                        {p.category}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-600 uppercase text-[10px] font-black tracking-widest">Nenhum material encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resizer Handle */}
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-20 group no-print select-none ${isResizing ? 'bg-tecnomonte-gold' : ''}`}
          >
            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-tecnomonte-gold" />
            </div>
          </div>
        </div>

        {/* Right Panel: Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-8 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
          <div className="max-w-[800px] mx-auto print:max-w-none">
            <div className="mb-8 no-print border-b border-slate-300 dark:border-slate-800 pb-4 flex justify-between items-end">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Pré-visualização de Impressão</h3>
                <p className="text-xs text-slate-500">As etiquetas abaixo serão renderizadas na folha de impressão</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                A4 (2 colunas)
              </span>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 rounded-xl border-4 border-dashed border-slate-200 dark:border-slate-800">
                <Tag className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-2">Nenhuma Etiqueta Selecionada</p>
                <p className="text-[10px] font-medium max-w-[200px] text-center">Marque os materiais na lista à esquerda para visualizar as etiquetas aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-10 print:grid-cols-2 print:gap-4">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-5 pb-6 flex flex-col break-inside-avoid h-[220px] print:h-[180px] relative shadow-sm transition-all overflow-hidden border-l-8 border-l-tecnomonte-blue print:border-l-[10px]">

                    {/* Header: Branding & Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-tecnomonte-blue tracking-[0.2em] leading-tight uppercase">Tecnomonte Industrial</span>
                        <div className="w-12 h-1 bg-tecnomonte-blue mt-0.5" />
                      </div>
                      <div className="bg-slate-100 px-2 py-0.5 rounded-full">
                        <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase">{product.category}</span>
                      </div>
                    </div>

                    {/* Middle: Product Info */}
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 tracking-tight">
                        {product.name}
                      </h3>

                      <div className="flex items-center gap-4 border-t border-slate-100 pt-3 mt-1">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Código</span>
                          <span className="text-lg font-bold text-slate-700 font-mono leading-none">{product.sku || '000000'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Wide 1D Barcode */}
                    <div className="mt-auto flex flex-col items-center">
                      <div className="w-full h-14 flex items-center justify-center">
                        <img
                          src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(product.sku || product.id)}&scale=3&rotate=N&includetext=false&width=50&height=10`}
                          alt="Barcode"
                          className="h-full w-full object-contain grayscale contrast-200"
                        />
                      </div>
                    </div>

                    {/* Subtle category indicator */}
                    <div className="absolute -right-8 top-12 rotate-90 opacity-[0.03] pointer-events-none select-none">
                      <span className="text-4xl font-black uppercase tracking-[1em]">{product.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-12 text-center text-slate-400 text-[9px] uppercase tracking-widest no-print">
              Fim da Pré-visualização
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .fixed { position: relative !important; inset: auto !important; height: auto !important; width: 100% !important; overflow: visible !important; }
          .overflow-hidden { overflow: visible !important; }
          .flex-1 { flex: none !important; display: block !important; width: 100% !important; }
          .flex { display: block !important; }
          .print\\:p-0 { padding: 0 !important; }
          .max-w-5xl, .max-w-[800px] { max-width: none !important; width: 100% !important; }
          @page { margin: 1cm; size: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default LabelPrinter;
