

import React, { useMemo, useState } from 'react';
import { Collaborator, Transaction, Product } from '../types';
import { Users, TrendingDown, Award, Package, Calendar, Filter, ChevronRight, BarChart2 } from 'lucide-react';
import CollaboratorAnalyticsModal from './CollaboratorAnalyticsModal';

interface CollaboratorDashboardProps {
  collaborators: Collaborator[];
  history: Transaction[];
  products: Product[];
}

const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ collaborators, history, products }) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // 1. Filter Data by Range
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (dateRange === '7d') cutoff = now - (7 * 24 * 60 * 60 * 1000);
    if (dateRange === '30d') cutoff = now - (30 * 24 * 60 * 60 * 1000);
    if (dateRange === '90d') cutoff = now - (90 * 24 * 60 * 60 * 1000);

    return history.filter(t => t.type === 'saida' && t.timestamp >= cutoff);
  }, [history, dateRange]);

  // 2. Compute Metrics
  const metrics = useMemo(() => {
    // Group by Collaborator ID
    const colStats = new Map<string, { count: number; lastDate: number; items: Map<string, number>; name?: string }>();
    const roleStats = new Map<string, { users: Set<string>; total: number }>();
    const catStats = new Map<string, number>();

    // Helper to find category from product name (since history might not have cat directly if older)
    // We create a lookup map from products prop
    const productCatMap = new Map<string, string>();
    products.forEach(p => productCatMap.set(p.name, p.category));

    filteredHistory.forEach(t => {
      const colId = t.collaboratorId || 'unknown';
      const role = t.collaboratorRole || 'Indefinido';
      
      // Update Collab Stats
      if (!colStats.has(colId)) {
        colStats.set(colId, { count: 0, lastDate: 0, items: new Map(), name: t.requester });
      }
      const cs = colStats.get(colId)!;
      cs.count += t.quantity;
      cs.lastDate = Math.max(cs.lastDate, t.timestamp);
      if (!cs.name && t.requester) cs.name = t.requester;
      
      // Determine category
      const cat = productCatMap.get(t.productName) || 'Outros';
      cs.items.set(cat, (cs.items.get(cat) || 0) + t.quantity);
      
      // Update Global Category Stats
      catStats.set(cat, (catStats.get(cat) || 0) + t.quantity);

      // Update Role Stats
      if (!roleStats.has(role)) {
        roleStats.set(role, { users: new Set(), total: 0 });
      }
      const rs = roleStats.get(role)!;
      rs.total += t.quantity;
      if (colId !== 'unknown') rs.users.add(colId);
    });

    // Find Top Collab
    let topCollabId = '';
    let maxCount = 0;
    colStats.forEach((val, key) => {
      if (val.count > maxCount) {
        maxCount = val.count;
        topCollabId = key;
      }
    });
    const topCollab = collaborators.find(c => c.id_fun === topCollabId);

    // Find Top Category
    let topCategory = '';
    let maxCatCount = 0;
    catStats.forEach((val, key) => {
      if (val > maxCatCount) {
        maxCatCount = val;
        topCategory = key;
      }
    });

    // Ranking List
    const ranking = Array.from(colStats.entries())
      .map(([id, stats]) => {
        const collab = collaborators.find(c => c.id_fun === id);
        // Calculate percentages for categories
        const total = stats.count;
        const topCats = Array.from(stats.items.entries())
          .sort((a,b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, qty]) => `${cat} (${Math.round((qty/total)*100)}%)`)
          .join(', ');

        return {
          id,
          name: collab?.name || stats.name || 'Desconhecido',
          role: collab?.role || 'Indefinido',
          total: stats.count,
          lastDate: stats.lastDate,
          topCats,
          collabObj: collab
        };
      })
      .sort((a, b) => b.total - a.total);

    // Role List
    const roles = Array.from(roleStats.entries())
      .map(([name, stats]) => ({
        name,
        userCount: stats.users.size,
        total: stats.total
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalWithdrawals: filteredHistory.reduce((acc, t) => acc + t.quantity, 0),
      topCollab,
      topCollabCount: maxCount,
      topCategory,
      topCategoryCount: maxCatCount,
      ranking,
      roles
    };
  }, [filteredHistory, collaborators, products]);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary-600" />
            Dashboard Colaboradores
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análise de consumo e comportamento</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dateRange === range 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {range === 'all' ? 'Tudo' : `Últimos ${range.replace('d', ' dias')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Colaboradores</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{collaborators.length}</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Retiradas</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{metrics.totalWithdrawals}</h3>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Colaborador</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-1 truncate">
                {metrics.topCollab ? metrics.topCollab.name : '-'}
              </h3>
              <p className="text-xs text-slate-400">{metrics.topCollabCount} itens retirados</p>
            </div>
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Categoria Mais Retirada</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-1">{metrics.topCategory || '-'}</h3>
              <p className="text-xs text-slate-400">{metrics.topCategoryCount} itens</p>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Ranking Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Ranking de Retiradas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Perfil de Consumo</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {metrics.ranking.length > 0 ? (
                  metrics.ranking.slice(0, 10).map((r, idx) => (
                    <tr 
                      key={r.id} 
                      onClick={() => r.collabObj && setSelectedCollaborator(r.collabObj)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-white">{r.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.role}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {r.topCats ? (
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              {r.topCats}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                        {r.total}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.collabObj && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Nenhuma retirada no período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {metrics.ranking.length > 10 && (
            <div className="p-3 text-center border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
              <span className="text-xs text-slate-500">Exibindo top 10 de {metrics.ranking.length}</span>
            </div>
          )}
        </div>

        {/* Function Analysis Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Retiradas por Função
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Função</th>
                  <th className="px-4 py-3 font-semibold text-right">Colab.</th>
                  <th className="px-4 py-3 font-semibold text-right">Itens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {metrics.roles.map((role) => (
                  <tr key={role.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white truncate max-w-[120px]" title={role.name}>
                      {role.name}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                      {role.userCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {role.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedCollaborator && (
        <CollaboratorAnalyticsModal 
          collaborator={selectedCollaborator}
          history={history}
          onClose={() => setSelectedCollaborator(null)}
        />
      )}
    </div>
  );
};

export default CollaboratorDashboard;