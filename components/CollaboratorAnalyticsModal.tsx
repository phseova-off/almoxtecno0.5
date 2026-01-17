
import React, { useEffect, useRef } from 'react';
import { X, Calendar, Package, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Collaborator, Transaction } from '../types';

interface CollaboratorAnalyticsModalProps {
  collaborator: Collaborator;
  history: Transaction[];
  onClose: () => void;
}

const CollaboratorAnalyticsModal: React.FC<CollaboratorAnalyticsModalProps> = ({ collaborator, history, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter history for this collaborator (Only Exits)
  const userHistory = history.filter(t => 
    (t.collaboratorId === collaborator.id_fun || t.requester === collaborator.name) && 
    t.type === 'saida'
  ).sort((a, b) => b.timestamp - a.timestamp);

  // 1. Calculate Stats
  const totalWithdrawals = userHistory.reduce((acc, t) => acc + t.quantity, 0);
  
  // Calculate Average per week (based on first and last transaction)
  let weeklyAvg = 0;
  if (userHistory.length > 1) {
    const firstDate = userHistory[userHistory.length - 1].timestamp;
    const lastDate = userHistory[0].timestamp;
    const weeksDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 7));
    weeklyAvg = totalWithdrawals / weeksDiff;
  } else if (userHistory.length === 1) {
    weeklyAvg = userHistory[0].quantity; // Treat as 1 week
  }

  // 2. Category Breakdown
  const categoryMap = new Map<string, number>();
  userHistory.forEach(t => {
    // We need category. Since Transaction doesn't store category directly (optimization oversight in previous prompts),
    // we assume we can get it from product data if available, OR we rely on a lookup.
    // However, to keep this self-contained without passing full product list, we will try to infer or skip.
    // *Correction*: In a real app we'd pass products. For now, let's assume 'Outros' if not found 
    // or rely on the fact that we might not have it easily.
    // To fix this properly, let's assume the user wants us to analyze what we have. 
    // Since we don't have category in Transaction, let's use "Product Name" grouping for now 
    // OR we update App.tsx to pass products. I will stick to product names for "Items mais retirados" 
    // effectively acting as categories/types if categories aren't in history.
    // ACTUALLY: Let's assume we map it in the parent or just show Top Products.
    
    // Let's count Products instead for accuracy
    const key = t.productName; 
    categoryMap.set(key, (categoryMap.get(key) || 0) + t.quantity);
  });

  const topItems = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 3. Chart Logic (Last 6 Months)
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Data prep
    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
      
      const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const count = userHistory
        .filter(t => t.timestamp >= d.getTime() && t.timestamp < nextMonth.getTime())
        .reduce((acc, t) => acc + t.quantity, 0);
      data.push(count);
    }

    // Draw
    ctx.clearRect(0, 0, width, height);
    const maxVal = Math.max(...data, 5);
    const scaleY = chartHeight / maxVal;
    const stepX = chartWidth / (data.length - 1 || 1);

    // Draw Line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6'; // primary-500
    ctx.lineWidth = 3;
    data.forEach((val, i) => {
      const x = padding + (i * stepX);
      const y = height - padding - (val * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Points
    data.forEach((val, i) => {
      const x = padding + (i * stepX);
      const y = height - padding - (val * scaleY);
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#3b82f6';
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, height - 5);
      
      // Value
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(val.toString(), x, y - 10);
    });

  }, [userHistory]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="bg-primary-100 dark:bg-primary-900/30 p-1.5 rounded-lg text-primary-600 dark:text-primary-400">
                <TrendingUp className="w-5 h-5" />
              </span>
              Análise Individual
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{collaborator.name} • {collaborator.role}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Retiradas</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalWithdrawals} <span className="text-xs font-normal text-slate-500">itens</span></h3>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Média Semanal</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{weeklyAvg.toFixed(1)} <span className="text-xs font-normal text-slate-500">itens/sem</span></h3>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Última Atividade</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                {userHistory.length > 0 ? new Date(userHistory[0].timestamp).toLocaleDateString() : 'N/A'}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                Histórico (6 Meses)
              </h4>
              <div className="flex justify-center">
                <canvas ref={canvasRef} width={400} height={200} className="w-full max-w-full" />
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                Itens Mais Retirados
              </h4>
              {topItems.length > 0 ? (
                <div className="space-y-3">
                  {topItems.map(([name, qty], idx) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full" 
                            style={{ width: `${(qty / topItems[0][1]) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">Sem dados suficientes</p>
              )}
            </div>
          </div>

          {/* Recent List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200">Últimas 10 Retiradas</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Produto</th>
                    <th className="px-4 py-2 font-medium">Finalidade</th>
                    <th className="px-4 py-2 font-medium text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {userHistory.slice(0, 10).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-200 font-medium">{t.productName}</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-500 italic">{t.purpose || '-'}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-red-600 dark:text-red-400">-{t.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CollaboratorAnalyticsModal;
