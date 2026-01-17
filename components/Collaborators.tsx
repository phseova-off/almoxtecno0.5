
import React, { useState, useRef } from 'react';
import { Collaborator, Transaction, Product, User } from '../types';
import { Search, Plus, Upload, Download, Trash2, Users, Save, X, AlertCircle, CheckCircle2, ChevronRight, PackageOpen } from 'lucide-react';
import CollaboratorDetailsModal from './CollaboratorDetailsModal';

interface CollaboratorsProps {
  collaborators: Collaborator[];
  history: Transaction[];     // New prop
  products: Product[];        // New prop
  onAdd: (collaborator: Collaborator) => void;
  onDelete: (id: string) => void;
  onImport: (collaborators: Collaborator[]) => void;
  onReturnItem: (productId: string, quantity: number, notes?: string, collaboratorId?: string) => void;
  onWriteOffItem: (productId: string, quantity: number, notes?: string, collaboratorId?: string) => void;
  currentUser: User | null;
}

const Collaborators: React.FC<CollaboratorsProps> = ({
  collaborators,
  history,
  products,
  onAdd,
  onDelete,
  onImport,
  onReturnItem,
  onWriteOffItem,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [importPreview, setImportPreview] = useState<Collaborator[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Form State
  const [newCollab, setNewCollab] = useState<Collaborator>({
    id_fun: '',
    name: '',
    role: '',
    contract: '',
    isAlmoxarife: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Search Logic ---
  const filteredCollaborators = collaborators.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id_fun.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Manual Add Logic ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollab.id_fun || !newCollab.name) return;

    if (collaborators.some(c => c.id_fun === newCollab.id_fun)) {
      alert('Erro: Já existe um colaborador com este ID_fun.');
      return;
    }

    onAdd(newCollab);
    setNewCollab({ id_fun: '', name: '', role: '', contract: '', isAlmoxarife: false });
    setShowAddForm(false);
  };

  // --- CSV Export Logic ---
  const handleExport = () => {
    const headers = ['ID_fun,Colaborador,Funcao,Contrato'];
    const rows = collaborators.map(c =>
      `${c.id_fun},"${c.name}","${c.role}","${c.contract}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV Import Logic ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());

      // Validate Headers
      const headerLine = lines[0].toLowerCase();
      if (!headerLine.includes('id_fun') || !headerLine.includes('colaborador')) {
        setImportError('CSV inválido. As colunas devem ser: ID_fun, Colaborador, Funcao, Contrato');
        setImportPreview(null);
        return;
      }

      const parsed: Collaborator[] = [];
      // Simple CSV parser (assuming comma separator)
      for (let i = 1; i < lines.length; i++) {
        // Handle quotes naively
        const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        if (row.length < 2) continue;

        parsed.push({
          id_fun: row[0] || '',
          name: row[1] || '',
          role: row[2] || '',
          contract: row[3] || ''
        });
      }

      if (parsed.length === 0) {
        setImportError('Nenhum dado encontrado no arquivo.');
        setImportPreview(null);
      } else {
        setImportPreview(parsed);
      }
    } catch (err) {
      setImportError('Erro ao ler o arquivo.');
    }

    // Reset input
    if (e.target) e.target.value = '';
  };

  const confirmImport = () => {
    if (importPreview) {
      onImport(importPreview);
      setImportPreview(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            Colaboradores
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerenciar equipe e acessos ({collaborators.length} total)</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-primary-200 dark:border-primary-900 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">Cadastrar Colaborador</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ID_fun *</label>
              <input
                required
                value={newCollab.id_fun}
                onChange={(e) => setNewCollab({ ...newCollab, id_fun: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: 1020"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo *</label>
              <input
                required
                value={newCollab.name}
                onChange={(e) => setNewCollab({ ...newCollab, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Maria Oliveira"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Função</label>
              <input
                value={newCollab.role}
                onChange={(e) => setNewCollab({ ...newCollab, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Almoxarife"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contrato</label>
              <input
                value={newCollab.contract}
                onChange={(e) => setNewCollab({ ...newCollab, contract: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: CLT"
              />
            </div>

            {currentUser?.nivel === 'admin' && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isAlmoxarife"
                  checked={newCollab.isAlmoxarife}
                  onChange={(e) => setNewCollab({ ...newCollab, isAlmoxarife: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <label htmlFor="isAlmoxarife" className="text-sm font-bold text-tecnomonte-blue dark:text-tecnomonte-gold uppercase">É Almoxarife?</label>
              </div>
            )}
            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white">Pré-visualização da Importação</h3>
              <button onClick={() => setImportPreview(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Foram encontrados <b>{importPreview.length}</b> colaboradores. Confirma a importação?
                <br />
                <span className="text-xs text-orange-500">Nota: IDs duplicados serão ignorados/atualizados conforme a lógica.</span>
              </p>
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <th className="p-2 border border-slate-200 dark:border-slate-600">ID</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-600">Nome</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-600">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 10).map((c, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="p-2 dark:text-slate-300">{c.id_fun}</td>
                      <td className="p-2 dark:text-slate-300">{c.name}</td>
                      <td className="p-2 dark:text-slate-300">{c.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 10 && <p className="text-center text-xs text-slate-400 mt-2">... e mais {importPreview.length - 10}</p>}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {importError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {importError}
          <button onClick={() => setImportError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">ID Funcional</th>
                <th className="px-6 py-4 font-semibold">Colaborador</th>
                <th className="px-6 py-4 font-semibold">Função</th>
                <th className="px-6 py-4 font-semibold">Contrato</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredCollaborators.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">Nenhum colaborador encontrado.</td></tr>
              ) : (
                filteredCollaborators.map((c) => (
                  <tr
                    key={c.id_fun}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCollaborator(c)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{c.id_fun}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-white group-hover:text-primary-600 transition-colors">{c.name}</span>
                        <PackageOpen className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{c.role}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{c.contract}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id_fun);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 text-center">
          Mostrando {filteredCollaborators.length} registros
        </div>
      </div>

      {selectedCollaborator && (
        <CollaboratorDetailsModal
          collaborator={selectedCollaborator}
          history={history}
          products={products}
          onClose={() => setSelectedCollaborator(null)}
          onReturnItem={(pId, qty, notes) => onReturnItem(pId, qty, notes, selectedCollaborator.id_fun)}
          onWriteOffItem={(pId, qty, notes) => onWriteOffItem(pId, qty, notes, selectedCollaborator.id_fun)}
        />
      )}
    </div>
  );
};

export default Collaborators;
