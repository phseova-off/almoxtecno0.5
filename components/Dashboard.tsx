
import React, { useState, useMemo } from 'react';
import { Product, Transaction, Collaborator } from '../types';
import {
  BarChart3, TrendingUp, TrendingDown, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, Zap, ArrowRight,
  Wrench, FileText, Sparkles, Box, Star, AlertCircle,
  Calendar, ShieldAlert, ShoppingCart, ChevronDown, ChevronUp,
  Filter, Calculator, Activity, Users, LayoutDashboard, Search, ListFilter,
  Clipboard
} from 'lucide-react';
import QuickExitModal from './QuickExitModal';
import { TransactionData } from './TransactionModal';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
// @ts-ignore
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  products: Product[];
  history: Transaction[];
  collaborators: Collaborator[];
  onNavigateToInventory: () => void;
  quickLaunchCount: number;
  onQuickExit: (product: Product, data: TransactionData) => void;
}

type Period = 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({
  products,
  history,
  collaborators,
  onNavigateToInventory,
  quickLaunchCount,
  onQuickExit
}) => {
  const [selectedQuickProduct, setSelectedQuickProduct] = useState<Product | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<'zero' | 'low' | 'overdue' | 'requests' | null>(null);

  // Performance Filters State
  const [performanceFilter, setPerformanceFilter] = useState({
    period: 'last_month' as Period,
    monthA: new Date().toISOString().substring(0, 7), // YYYY-MM
    monthB: new Date(new Date().getFullYear(), new Date().getMonth() - 1).toISOString().substring(0, 7),
    category: 'Todas',
    materialId: 'Todos',
    type: 'Ambas' as 'Ambas' | 'Entradas' | 'Saídas'
  });

  // --- 1. DATA PROCESSING HELPERS ---

  const overdueItems = useMemo(() => {
    // Items not returned within 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // We need to find current possession: total withdrawn - total returned for each product/collaborator pair
    // This is a simplified version based on history
    const possessionMap = new Map<string, { collab: string, name: string, quantity: number, firstTimestamp: number }>();

    // Process history to find who has what
    [...history].reverse().forEach(t => {
      if (!t.collaboratorId) return;
      const key = `${t.collaboratorId}-${t.productId}`;
      const current = possessionMap.get(key) || { collab: t.requester || '?', name: t.productName, quantity: 0, firstTimestamp: t.timestamp };

      if (t.type === 'saida') {
        current.quantity += t.quantity;
        current.firstTimestamp = Math.min(current.firstTimestamp, t.timestamp);
      } else if (t.type === 'entrada') {
        current.quantity -= t.quantity;
      }

      if (current.quantity > 0) possessionMap.set(key, current);
      else possessionMap.delete(key);
    });

    return Array.from(possessionMap.values()).filter(item => item.firstTimestamp < thirtyDaysAgo);
  }, [history]);

  const zeroStock = products.filter(p => p.quantity <= 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock);

  // Mock for Purchase Requests (Integration point)
  const pendingRequests = 0;

  // Reposition Forecast
  const forecastItems = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const items = products.map(p => {
      const exits = history
        .filter(t => t.productId === p.id && t.type === 'saida' && t.timestamp > thirtyDaysAgo)
        .reduce((sum, t) => sum + t.quantity, 0);

      const dailyAverage = exits / 30;
      const daysLeft = dailyAverage > 0 ? Math.floor(p.quantity / dailyAverage) : 999;

      return {
        ...p,
        daysLeft,
        repostDate: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
      };
    })
      .filter(p => p.daysLeft <= 15)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return items;
  }, [products, history]);

  // Expiry & Maintenance
  const expiryAlerts = products.filter(p => {
    if (!p.data_validade) return false;
    const expiry = new Date(p.data_validade).getTime();
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return expiry > Date.now() && expiry < thirtyDaysFromNow;
  });

  const maintenanceAlerts = products.filter(p => {
    if (!p.proxima_manutencao) return false;
    const maintenance = new Date(p.proxima_manutencao).getTime();
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return maintenance > Date.now() && maintenance < thirtyDaysFromNow;
  });

  // --- 2. PERFORMANCE MODULE LOGIC ---

  const performanceData = useMemo(() => {
    const getStats = (h: Transaction[]) => {
      const exits = h.filter(t => t.type === 'saida');
      const entries = h.filter(t => t.type === 'entrada');
      const totalExits = exits.reduce((sum, t) => sum + t.quantity, 0);
      const totalEntries = entries.reduce((sum, t) => sum + t.quantity, 0);

      // Top Products
      const productMap = new Map<string, { name: string, qty: number, cat: string }>();
      h.forEach(t => {
        const item = productMap.get(t.productId) || { name: t.productName, qty: 0, cat: products.find(p => p.id === t.productId)?.category || '' };
        item.qty += t.quantity;
        productMap.set(t.productId, item);
      });
      const topProducts = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 3);

      // Top Categories
      const catMap = new Map<string, number>();
      h.forEach(t => {
        const cat = products.find(p => p.id === t.productId)?.category || 'Outros';
        catMap.set(cat, (catMap.get(cat) || 0) + t.quantity);
      });
      const totalPeriodQty = Array.from(catMap.values()).reduce((a, b) => a + b, 0);
      const topCategories = Array.from(catMap.entries())
        .map(([name, qty]) => ({ name, qty, percent: totalPeriodQty > 0 ? (qty / totalPeriodQty) * 100 : 0 }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);

      // Top Collaborator
      const collabMap = new Map<string, { name: string, role: string, exits: number }>();
      exits.forEach(t => {
        if (!t.collaboratorId) return;
        const item = collabMap.get(t.collaboratorId) || { name: t.requester || '', role: t.collaboratorRole || '', exits: 0 };
        item.exits += 1;
        collabMap.set(t.collaboratorId, item);
      });
      const topCollab = Array.from(collabMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.exits - a.exits)[0];

      // Daily totals for chart
      const dailyMap = new Map<number, { entries: number, exits: number }>();
      h.forEach(t => {
        const date = new Date(t.timestamp);
        const day = date.getDate();
        const current = dailyMap.get(day) || { entries: 0, exits: 0 };
        if (t.type === 'entrada') current.entries += t.quantity;
        else if (t.type === 'saida') current.exits += t.quantity;
        dailyMap.set(day, current);
      });

      return { totalExits, totalEntries, topProducts, topCategories, topCollab, totalMov: h.length, dailyMap };
    };

    const filterHistoryByPeriod = (h: Transaction[], start: Date, end: Date) => {
      return h.filter(t => {
        const ts = t.timestamp;
        const matchesPeriod = ts >= start.getTime() && ts < end.getTime();
        const prod = products.find(p => p.id === t.productId);
        const matchesCategory = performanceFilter.category === 'Todas' || prod?.category === performanceFilter.category;
        const matchesMaterial = performanceFilter.materialId === 'Todos' || t.productId === performanceFilter.materialId;
        return matchesPeriod && matchesCategory && matchesMaterial;
      });
    };

    let historyA: Transaction[], historyB: Transaction[];
    let labelA: string, labelB: string;

    if (performanceFilter.period === 'custom') {
      const dateA = new Date(performanceFilter.monthA + '-01T00:00:00');
      const nextMonthA = new Date(dateA.getFullYear(), dateA.getMonth() + 1, 1);
      const dateB = new Date(performanceFilter.monthB + '-01T00:00:00');
      const nextMonthB = new Date(dateB.getFullYear(), dateB.getMonth() + 1, 1);

      historyA = filterHistoryByPeriod(history, dateA, nextMonthA);
      historyB = filterHistoryByPeriod(history, dateB, nextMonthB);
      labelA = dateA.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      labelB = dateB.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else {
      const now = new Date();
      let currentStart: Date, comparisonStart: Date;

      switch (performanceFilter.period) {
        case 'last_month':
          currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          comparisonStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          break;
        case 'last_3_months':
          currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          comparisonStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'last_6_months':
          currentStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          comparisonStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          break;
        case 'last_year':
          currentStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          comparisonStart = new Date(now.getFullYear() - 2, now.getMonth(), 1);
          break;
        default:
          currentStart = new Date();
          comparisonStart = new Date();
      }

      historyA = filterHistoryByPeriod(history, currentStart, now);
      historyB = filterHistoryByPeriod(history, comparisonStart, currentStart);
      labelA = 'Período Atual';
      labelB = 'Período Anterior';
    }

    const statsA = getStats(historyA);
    const statsB = getStats(historyB);

    const calcVar = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      current: statsA,
      previous: statsB,
      labelA,
      labelB,
      variance: {
        mov: calcVar(statsA.totalMov, statsB.totalMov),
        entries: calcVar(statsA.totalEntries, statsB.totalEntries),
        exits: calcVar(statsA.totalExits, statsB.totalExits)
      }
    };
  }, [history, products, performanceFilter]);

  // Chart Configuration
  const chartData = {
    labels: Array.from({ length: 31 }, (_, i) => i + 1),
    datasets: [
      {
        label: `${performanceData.labelA} (Entradas)`,
        data: Array.from({ length: 31 }, (_, i) => performanceData.current.dailyMap.get(i + 1)?.entries || 0),
        borderColor: '#10b981',
        backgroundColor: '#10b98122',
        fill: true,
        tension: 0.4,
        hidden: performanceFilter.type === 'Saídas'
      },
      {
        label: `${performanceData.labelA} (Saídas)`,
        data: Array.from({ length: 31 }, (_, i) => performanceData.current.dailyMap.get(i + 1)?.exits || 0),
        borderColor: '#ef4444',
        backgroundColor: '#ef444422',
        fill: true,
        tension: 0.4,
        hidden: performanceFilter.type === 'Entradas'
      },
      {
        label: `${performanceData.labelB} (Entradas)`,
        data: Array.from({ length: 31 }, (_, i) => performanceData.previous.dailyMap.get(i + 1)?.entries || 0),
        borderColor: '#10b981',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        hidden: performanceFilter.type === 'Saídas' || performanceFilter.period !== 'custom'
      },
      {
        label: `${performanceData.labelB} (Saídas)`,
        data: Array.from({ length: 31 }, (_, i) => performanceData.previous.dailyMap.get(i + 1)?.exits || 0),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        hidden: performanceFilter.type === 'Entradas' || performanceFilter.period !== 'custom'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 10 } } },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: { title: { display: true, text: 'Dia do Mês', font: { size: 10 } }, grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
    }
  };

  // --- RENDERING HELPERS ---

  const getCategoryIcon = (cat: string) => {
    const iconClass = "w-4 h-4";
    if (cat === 'Ferramentas') return <Wrench className={`${iconClass} text-orange-500`} />;
    if (cat === 'Material de Escritório') return <FileText className={`${iconClass} text-blue-500`} />;
    if (cat === 'Limpeza') return <Sparkles className={`${iconClass} text-emerald-500`} />;
    if (cat === 'Equipamentos') return <Box className={`${iconClass} text-indigo-500`} />;
    if (cat === 'EPI') return <ShieldAlert className={`${iconClass} text-red-500`} />;
    return <Box className={`${iconClass} text-slate-500`} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">

      {/* 0. QUICK LAUNCH (Maintained as requested) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-tecnomonte-gold p-2 shadow-md">
            <Zap className="w-5 h-5 text-tecnomonte-blue fill-tecnomonte-blue" />
          </div>
          <h2 className="text-lg font-black text-tecnomonte-blue dark:text-white uppercase tracking-tighter">Lançamento Rápido</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.slice(0, quickLaunchCount).map(product => (
            <div key={product.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-lg group-hover:bg-orange-50 transition-colors">
                  {getCategoryIcon(product.category)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{product.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{product.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuickProduct(product)}
                className="bg-slate-50 dark:bg-slate-700 hover:bg-orange-600 text-slate-600 dark:text-slate-300 hover:text-white p-2 rounded-lg transition-all"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MODULE 1: PAINEL DE ALERTAS E AÇÕES PRIORITÁRIAS ===== */}
      <section className="bg-white dark:bg-slate-800 border-r-8 border-tecnomonte-gold shadow-md overflow-hidden">
        <div className="p-4 border-b-2 border-slate-100 dark:border-slate-700 bg-tecnomonte-blue flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-white" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Painel de Alertas e Ações Prioritárias</h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Zerado */}
            <button
              onClick={() => setExpandedAlert(expandedAlert === 'zero' ? null : 'zero')}
              className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${zeroStock.length > 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <div className="text-2xl mb-1">🔴</div>
              <span className="text-2xl font-black text-red-600">{zeroStock.length}</span>
              <span className="text-[10px] font-bold uppercase text-red-700 dark:text-red-400">Estoque Zerado</span>
            </button>

            {/* 2. Baixo */}
            <button
              onClick={() => setExpandedAlert(expandedAlert === 'low' ? null : 'low')}
              className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${lowStock.length > 0 ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <div className="text-2xl mb-1">🟡</div>
              <span className="text-2xl font-black text-amber-600">{lowStock.length}</span>
              <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Abaixo do Mínimo</span>
            </button>

            {/* 3. Overdue */}
            <button
              onClick={() => setExpandedAlert(expandedAlert === 'overdue' ? null : 'overdue')}
              className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${overdueItems.length > 0 ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <div className="text-2xl mb-1">🟠</div>
              <span className="text-2xl font-black text-orange-600">{overdueItems.length}</span>
              <span className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-400">Não Devolvidos 30+ dias</span>
            </button>

            {/* 4. Requests */}
            <button
              onClick={() => setExpandedAlert(expandedAlert === 'requests' ? null : 'requests')}
              className="p-4 rounded-xl border bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 flex flex-col items-center text-center transition-all"
            >
              <div className="text-2xl mb-1"><Clipboard className="w-5 h-5 text-blue-600 inline" /></div>
              <span className="text-2xl font-black text-blue-600">{pendingRequests}</span>
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Solicitações Pendentes</span>
            </button>
          </div>

          {/* Expanded Tables */}
          {expandedAlert && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase text-slate-500">
                  {expandedAlert === 'zero' ? 'Produtos sem estoque' :
                    expandedAlert === 'low' ? 'Produtos em nível crítico' :
                      expandedAlert === 'overdue' ? 'Itens em posse prolongada' : 'Solicitações aguardando'}
                </h4>
                <button
                  onClick={onNavigateToInventory}
                  className="text-[10px] font-bold text-primary-600 uppercase hover:underline"
                >
                  Ver Todos no Inventário →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase font-black text-[9px]">
                      <th className="py-2">{expandedAlert === 'overdue' ? 'Colaborador' : 'Produto'}</th>
                      <th className="py-2">{expandedAlert === 'overdue' ? 'Equipamento' : 'SKU'}</th>
                      <th className="py-2 text-right">{expandedAlert === 'overdue' ? 'Dias em Posse' : 'Qtd Atual'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expandedAlert === 'zero' && zeroStock.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0"><td className="py-2 font-bold">{p.name}</td><td className="py-2 font-mono">{p.sku}</td><td className="py-2 text-right font-black text-red-600">0 {p.unit}</td></tr>
                    ))}
                    {expandedAlert === 'low' && lowStock.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0"><td className="py-2 font-bold">{p.name}</td><td className="py-2 font-mono">{p.sku}</td><td className="py-2 text-right font-black text-amber-600">{p.quantity} {p.unit}</td></tr>
                    ))}
                    {expandedAlert === 'overdue' && overdueItems.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0"><td className="py-2 font-bold">{item.collab}</td><td className="py-2">{item.name}</td><td className="py-2 text-right font-black text-orange-600">{Math.floor((Date.now() - item.firstTimestamp) / (1000 * 60 * 60 * 24))} dias</td></tr>
                    ))}
                    {expandedAlert === 'requests' && <tr><td colSpan={3} className="py-4 text-center text-slate-400 italic">Nenhuma solicitação pendente no momento.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== MODULE 2: PRÓXIMAS AÇÕES NECESSÁRIAS ===== */}
      <section className="bg-white dark:bg-slate-800 border-r-8 border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-tecnomonte-blue" />
          <h3 className="text-sm font-black text-slate-700 dark:text-white uppercase tracking-widest">Próximas Ações Necessárias</h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* A. Previsão de Reposição */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3" /> Previsão de Reposição
            </h4>
            <div className="space-y-3">
              {forecastItems.length > 0 ? forecastItems.slice(0, 4).map(p => {
                const badgeColor = p.daysLeft <= 3 ? 'bg-red-100 text-red-700' : p.daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
                return (
                  <div key={p.id} className="flex justify-between items-start group">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                      <p className="text-[9px] text-slate-400 uppercase">Repor até {p.repostDate.toLocaleDateString()}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${badgeColor}`}>
                      {p.daysLeft === 0 ? 'Hoje' : `${p.daysLeft} dias`}
                    </span>
                  </div>
                );
              }) : <p className="text-xs text-slate-400 italic">Estoque estável para os próximos 15 dias.</p>}
            </div>
          </div>

          {/* B. Vencimentos e Validades */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-500" /> Vencimentos e Validades
            </h4>
            <div className="space-y-3">
              {expiryAlerts.length > 0 ? expiryAlerts.slice(0, 4).map(p => (
                <div key={p.id} className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                    <p className="text-[9px] text-red-500 font-bold uppercase">{p.data_validade}</p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
              )) : <p className="text-xs text-slate-400 italic">Nenhum produto vencendo nos próximos 30 dias.</p>}
            </div>
          </div>

          {/* C. Manutenções */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-3 h-3 text-indigo-500" /> Manutenções Programadas
            </h4>
            <div className="space-y-3">
              {maintenanceAlerts.length > 0 ? maintenanceAlerts.slice(0, 4).map(p => (
                <div key={p.id} className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name} {p.tag && `(${p.tag})`}</p>
                    <p className="text-[9px] text-indigo-600 font-bold uppercase">Revisão em {p.proxima_manutencao}</p>
                  </div>
                  <Wrench className="w-4 h-4 text-indigo-400" />
                </div>
              )) : <p className="text-xs text-slate-400 italic">Nenhuma manutenção pendente (30 dias).</p>}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODULE 3: COMPARATIVO DE PERFORMANCE ===== */}
      <section className="bg-white dark:bg-slate-800 border-r-8 border-tecnomonte-blue shadow-md overflow-hidden">
        {/* FILTROS NO TOPO */}
        <div className="p-4 border-b-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 md:flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <BarChart3 className="w-5 h-5 text-tecnomonte-blue" />
            <h3 className="text-sm font-black text-tecnomonte-blue dark:text-white uppercase tracking-widest">Análise Comparativa de Movimentações</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={performanceFilter.period}
              onChange={(e) => setPerformanceFilter({ ...performanceFilter, period: e.target.value as Period })}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
            >
              <option value="last_month">Último Mês</option>
              <option value="last_3_months">Últimos 3 Meses</option>
              <option value="last_6_months">Últimos 6 Meses</option>
              <option value="last_year">Último Ano</option>
              <option value="custom">Comparar Meses</option>
            </select>

            {performanceFilter.period === 'custom' && (
              <>
                <input
                  type="month"
                  value={performanceFilter.monthA}
                  onChange={(e) => setPerformanceFilter({ ...performanceFilter, monthA: e.target.value })}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400">VS</span>
                <input
                  type="month"
                  value={performanceFilter.monthB}
                  onChange={(e) => setPerformanceFilter({ ...performanceFilter, monthB: e.target.value })}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
                />
              </>
            )}

            <select
              value={performanceFilter.category}
              onChange={(e) => setPerformanceFilter({ ...performanceFilter, category: e.target.value })}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
            >
              <option value="Todas">Todas Categorias</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              value={performanceFilter.materialId}
              onChange={(e) => setPerformanceFilter({ ...performanceFilter, materialId: e.target.value })}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none max-w-[150px]"
            >
              <option value="Todos">Todos Materiais</option>
              {products
                .filter(p => performanceFilter.category === 'Todas' || p.category === performanceFilter.category)
                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              }
            </select>

            <select
              value={performanceFilter.type}
              onChange={(e) => setPerformanceFilter({ ...performanceFilter, type: e.target.value as any })}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
            >
              <option value="Ambas">Ambas</option>
              <option value="Entradas">Entradas</option>
              <option value="Saídas">Saídas</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            {/* Gráfico (60%) */}
            <div className="lg:col-span-6 h-[300px]">
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Cards de Métricas (40%) */}
            <div className="lg:col-span-4 grid grid-cols-1 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Total Movimentações</p>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">{performanceData.current.totalMov}</h4>
                  <p className="text-[10px] font-bold text-slate-500">vs {performanceData.previous.totalMov} ({performanceData.labelB})</p>
                </div>
                <div className={`text-sm font-black flex items-center gap-1 ${performanceData.variance.mov >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {performanceData.variance.mov >= 0 ? '↗️' : '↘️'} {Math.abs(performanceData.variance.mov).toFixed(0)}%
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase">Entradas</p>
                  <h4 className="text-xl font-black text-emerald-700 dark:text-white">{performanceData.current.totalEntries}</h4>
                </div>
                <div className={`text-sm font-black ${performanceData.variance.entries >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {performanceData.variance.entries.toFixed(0)}%
                </div>
              </div>

              <div className="p-4 bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-red-600 uppercase">Saídas</p>
                  <h4 className="text-xl font-black text-red-700 dark:text-white">{performanceData.current.totalExits}</h4>
                  <div className="w-12 h-4 bg-red-200 mt-1 rounded opacity-30 animate-pulse"></div> {/* Mini sparkline placeholder */}
                </div>
                <div className={`text-sm font-black ${performanceData.variance.exits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {performanceData.variance.exits.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Seção Inferior (Colunas) */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Coluna 1: Categorias */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">Categorias Mais Ativas</h5>
              <div className="space-y-4">
                {performanceData.current.topCategories.map((cat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-700 dark:text-slate-200">{cat.name}</span>
                      <span className="text-slate-500">{cat.qty} mov ({cat.percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${cat.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 2: Produtos */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-primary-500 pl-2">Produtos Mais Movimentados</h5>
              <div className="space-y-3">
                {performanceData.current.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md">
                      {getCategoryIcon(p.cat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.qty} unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 3: Colaborador */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Colaborador Mais Ativo</h5>
              {performanceData.current.topCollab ? (
                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                        {performanceData.current.topCollab.name.charAt(0)}
                      </div>
                      <div>
                        <h6 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{performanceData.current.topCollab.name}</h6>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase">{performanceData.current.topCollab.role}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Retiradas no período</span>
                        <span className="text-indigo-600">{performanceData.current.topCollab.exits}</span>
                      </div>
                      {/* Check if this specific collab has overdue items */}
                      {overdueItems.filter(oi => oi.collab === performanceData.current.topCollab?.name).length > 0 && (
                        <div className="mt-2 inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">Itens Atrasados!</div>
                      )}
                    </div>
                  </div>
                  <Users className="absolute -right-2 -bottom-2 w-16 h-16 text-indigo-600/5 group-hover:text-indigo-600/10 transition-colors" />
                </div>
              ) : <p className="text-xs text-slate-400 italic">Nenhuma retirada no período.</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Exit Modal */}
      {selectedQuickProduct && (
        <QuickExitModal
          product={selectedQuickProduct}
          collaborators={collaborators}
          onClose={() => setSelectedQuickProduct(null)}
          onConfirm={(data) => {
            onQuickExit(selectedQuickProduct, data);
            setSelectedQuickProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
