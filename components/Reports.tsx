
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Download, Printer, BarChart3, Users, PieChart, Activity, TrendingUp, TrendingDown, Package, AlertTriangle, ChevronRight, Filter, Calendar, Clock, DollarSign, Warehouse } from 'lucide-react';
import { Product, Transaction, Collaborator } from '../types';

interface ReportsProps {
  products: Product[];
  history: Transaction[];
  collaborators: Collaborator[];
}

type ReportSubTab = 'geral' | 'equipe' | 'inventario';

const Reports: React.FC<ReportsProps> = ({ products, history, collaborators }) => {
  const [subTab, setSubTab] = useState<ReportSubTab>('geral');
  const [periodDays, setPeriodDays] = useState(30);
  
  // Refs para as instâncias dos gráficos Chart.js
  const trendChartRef = useRef<any>(null);
  const categoryChartRef = useRef<any>(null);
  const teamChartRef = useRef<any>(null);
  const statusChartRef = useRef<any>(null);

  // --- FILTRAGEM DE DADOS ---
  const filteredHistory = useMemo(() => {
    const cutoff = Date.now() - (periodDays * 24 * 60 * 60 * 1000);
    return history.filter(t => t.timestamp >= cutoff);
  }, [history, periodDays]);

  // --- CÁLCULO DE KPIs ---
  const kpis = useMemo(() => {
    const entries = filteredHistory.filter(t => t.type === 'entrada');
    const exits = filteredHistory.filter(t => t.type === 'saida');
    
    const totalStockValue = products.reduce((acc, p) => acc + (p.quantity * (p.price || 0)), 0);
    const lowStockCount = products.filter(p => p.quantity < p.minStock).length;
    const itemsInPossession = history.reduce((acc, t) => {
        return t.type === 'saida' ? acc + t.quantity : acc - t.quantity;
    }, 0);

    return {
      entriesCount: entries.reduce((acc, t) => acc + t.quantity, 0),
      exitsCount: exits.reduce((acc, t) => acc + t.quantity, 0),
      stockValue: totalStockValue,
      lowStock: lowStockCount,
      turnoverRate: products.length > 0 ? ((exits.length / products.length) * 100).toFixed(1) : '0',
      activeCollabs: new Set(exits.map(e => e.collaboratorId)).size,
      possession: itemsInPossession > 0 ? itemsInPossession : 0
    };
  }, [filteredHistory, products, history]);

  // --- RENDERIZAÇÃO DE GRÁFICOS ---
  useEffect(() => {
    const ChartClass = (window as any).Chart;
    if (!ChartClass) return;

    // 1. Gráfico de Tendência (Geral)
    const ctxTrend = document.getElementById('chart-trend') as HTMLCanvasElement;
    if (ctxTrend) {
      if (trendChartRef.current) trendChartRef.current.destroy();
      
      const labels = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      });

      const trendData = labels.map(label => {
         const dayTxs = history.filter(t => new Date(t.timestamp).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) === label);
         return {
           in: dayTxs.filter(t => t.type === 'entrada').reduce((a,b) => a + b.quantity, 0),
           out: dayTxs.filter(t => t.type === 'saida').reduce((a,b) => a + b.quantity, 0)
         };
      });

      trendChartRef.current = new ChartClass(ctxTrend, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Entradas', data: trendData.map(d => d.in), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
            { label: 'Saídas', data: trendData.map(d => d.out), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.4, fill: true }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
      });
    }

    // 2. Gráfico de Categorias
    const ctxCat = document.getElementById('chart-categories') as HTMLCanvasElement;
    if (ctxCat) {
      if (categoryChartRef.current) categoryChartRef.current.destroy();
      const cats: any = {};
      products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.quantity; });
      
      categoryChartRef.current = new ChartClass(ctxCat, {
        type: 'doughnut',
        data: {
          labels: Object.keys(cats),
          datasets: [{ data: Object.values(cats), backgroundColor: ['#004182', '#C5A059', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6'], borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
    }

    // 3. Gráfico de Equipe (Top 5)
    const ctxTeam = document.getElementById('chart-team') as HTMLCanvasElement;
    if (ctxTeam && subTab === 'equipe') {
       if (teamChartRef.current) teamChartRef.current.destroy();
       const teamStats: any = {};
       filteredHistory.filter(t => t.type === 'saida').forEach(t => {
         const name = t.requester || 'Desconhecido';
         teamStats[name] = (teamStats[name] || 0) + t.quantity;
       });
       const topTeam = Object.entries(teamStats).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5);

       teamChartRef.current = new ChartClass(ctxTeam, {
         type: 'bar',
         data: {
           labels: topTeam.map(t => t[0]),
           datasets: [{ label: 'Qtd Retirada', data: topTeam.map(t => t[1]), backgroundColor: '#004182', borderRadius: 4 }]
         },
         options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
       });
    }
  }, [subTab, periodDays, products, filteredHistory, history]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Menu Superior de Relatórios */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-sm border border-slate-200 shadow-sm print:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-sm border border-slate-200">
          <button onClick={() => setSubTab('geral')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${subTab === 'geral' ? 'bg-tecnomonte-blue text-white shadow-md' : 'text-slate-500 hover:text-tecnomonte-blue'}`}>
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Geral</div>
          </button>
          <button onClick={() => setSubTab('equipe')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${subTab === 'equipe' ? 'bg-tecnomonte-blue text-white shadow-md' : 'text-slate-500 hover:text-tecnomonte-blue'}`}>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Equipe</div>
          </button>
          <button onClick={() => setSubTab('inventario')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${subTab === 'inventario' ? 'bg-tecnomonte-blue text-white shadow-md' : 'text-slate-500 hover:text-tecnomonte-blue'}`}>
            <div className="flex items-center gap-2"><Warehouse className="w-4 h-4" /> Auditoria</div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={periodDays} 
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 p-2 rounded-sm outline-none"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
          <button onClick={() => window.print()} className="p-2 bg-slate-100 hover:bg-tecnomonte-gold hover:text-white rounded-sm transition-all text-slate-600">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {subTab === 'geral' && (
        <div className="space-y-6">
          {/* KPIs GERAIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-sm border-l-4 border-tecnomonte-blue shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor em Estoque</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">R$ {kpis.stockValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold mt-2"><Activity className="w-3 h-3" /> Ativos Financeiros</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-sm border-l-4 border-emerald-500 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas ({periodDays}d)</p>
              <h3 className="text-xl font-black text-emerald-600 mt-1">+{kpis.entriesCount} <span className="text-xs text-slate-400 font-normal">un</span></h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-2"><TrendingUp className="w-3 h-3" /> Reposição de Materiais</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-sm border-l-4 border-red-500 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saídas ({periodDays}d)</p>
              <h3 className="text-xl font-black text-red-600 mt-1">-{kpis.exitsCount} <span className="text-xs text-slate-400 font-normal">un</span></h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-2"><TrendingDown className="w-3 h-3" /> Consumo Operacional</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-sm border-l-4 border-tecnomonte-gold shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giro de Estoque</p>
              <h3 className="text-xl font-black text-tecnomonte-gold mt-1">{kpis.turnoverRate}%</h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-2"><Clock className="w-3 h-3" /> Eficiência de Fluxo</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 shadow-sm">
              <h4 className="text-sm font-black text-tecnomonte-blue uppercase mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-tecnomonte-gold" /> Tendência de Movimentações (7 Dias)
              </h4>
              <div className="h-[300px]">
                <canvas id="chart-trend"></canvas>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 shadow-sm">
              <h4 className="text-sm font-black text-tecnomonte-blue uppercase mb-6 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-tecnomonte-gold" /> Distribuição de Materiais
              </h4>
              <div className="h-[300px]">
                <canvas id="chart-categories"></canvas>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'equipe' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-tecnomonte-blue uppercase mb-6 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Top 5 Colaboradores (Maior Consumo)
                </h4>
                <div className="h-[350px]">
                  <canvas id="chart-team"></canvas>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-tecnomonte-blue uppercase mb-4">Métricas de Equipe</h4>
                <div className="space-y-4">
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-sm border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Colaboradores Ativos</p>
                      <p className="text-2xl font-black text-tecnomonte-blue">{kpis.activeCollabs}</p>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-sm border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Média de Retirada/Colab</p>
                      <p className="text-2xl font-black text-emerald-600">{kpis.activeCollabs > 0 ? (kpis.exitsCount / kpis.activeCollabs).toFixed(1) : 0}</p>
                   </div>
                   <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-sm border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">Itens Pendentes de Devolução</p>
                      <p className="text-2xl font-black text-amber-700">{kpis.possession}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {subTab === 'inventario' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 border-l-4 border-red-500 shadow-sm">
                <h4 className="text-sm font-black text-red-600 uppercase mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Estoque Crítico (Urgente)
                </h4>
                <div className="max-h-[400px] overflow-y-auto">
                   <table className="w-full text-left text-xs">
                     <thead className="sticky top-0 bg-white dark:bg-slate-800 font-black uppercase text-slate-400 border-b">
                       <tr><th className="py-2">Material</th><th className="py-2">Saldo</th><th className="py-2">Mínimo</th></tr>
                     </thead>
                     <tbody className="divide-y">
                       {products.filter(p => p.quantity < p.minStock).map(p => (
                         <tr key={p.id} className="hover:bg-red-50 transition-colors">
                           <td className="py-3 font-bold">{p.name}</td>
                           <td className="py-3 font-mono font-black text-red-600">{p.quantity}</td>
                           <td className="py-3 text-slate-400">{p.minStock}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-sm border border-slate-200 border-l-4 border-slate-400 shadow-sm">
                <h4 className="text-sm font-black text-slate-600 uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Itens sem Movimentação (30d+)
                </h4>
                <div className="max-h-[400px] overflow-y-auto">
                   <table className="w-full text-left text-xs">
                     <thead className="sticky top-0 bg-white dark:bg-slate-800 font-black uppercase text-slate-400 border-b">
                       <tr><th className="py-2">Material</th><th className="py-2">Última Mod.</th><th className="py-2">Saldo</th></tr>
                     </thead>
                     <tbody className="divide-y">
                       {products.filter(p => p.lastUpdated < (Date.now() - 30 * 24 * 60 * 60 * 1000)).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                           <td className="py-3 font-bold">{p.name}</td>
                           <td className="py-3 text-slate-400">{new Date(p.lastUpdated).toLocaleDateString()}</td>
                           <td className="py-3 font-mono">{p.quantity}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
