
import React, { useState } from 'react';
import { Sparkles, BrainCircuit, X, AlertTriangle, Package } from 'lucide-react';
import { Product, AIAnalysisResult } from '../types';
import { analyzeInventory } from '../services/geminiService';

interface InventoryStatsProps {
  products: Product[];
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ products }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setShowModal(true);
    try {
      const result = await analyzeInventory(products);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleAnalyze}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap"
      >
        <Sparkles className="w-4 h-4 text-yellow-300" />
        Analisar com IA
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-primary-600" />
                Análise de Inteligência Artificial
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-slate-500 animate-pulse">A Gemini está analisando seu almoxarifado...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Resumo Geral</h4>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                      {analysis.summary}
                    </p>
                  </div>

                  {analysis.lowStockAlerts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Alertas Críticos
                      </h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysis.lowStockAlerts.map((alert, idx) => (
                          <li key={idx} className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm border border-red-100">
                            {alert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.restockSuggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-primary-700 mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Sugestões de Compra
                      </h4>
                      <ul className="space-y-2">
                        {analysis.restockSuggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0"></span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">Não foi possível gerar a análise. Tente novamente.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryStats;
