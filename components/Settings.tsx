

import React, { useRef, useState } from 'react';
import { Moon, Sun, Download, Upload, Database, Tag, Save, FileSpreadsheet, List, Trash2, Edit2, Plus, Check, X, Zap, Link, RefreshCw, AlertCircle } from 'lucide-react';
import { Product, Category } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';

interface SettingsProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onImportCSV: (file: File) => void;
  onImportBackup: (file: File) => void;
  onExportBackup: () => void;
  onOpenLabelPrinter: () => void;
  productCount: number;
  // Category Management
  categories: Category[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  // Quick Launch
  quickLaunchCount: number;
  onUpdateQuickLaunchCount: (count: number) => void;
  // Stock Coverage
  stockCoverageDays: number;
  onUpdateStockCoverageDays: (days: number) => void;
}

const Settings: React.FC<SettingsProps> = ({
  darkMode,
  toggleDarkMode,
  onImportCSV,
  onImportBackup,
  onExportBackup,
  onOpenLabelPrinter,
  productCount,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  quickLaunchCount,
  onUpdateQuickLaunchCount,
  stockCoverageDays,
  onUpdateStockCoverageDays
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // API State
  const [apiUrl, setApiUrl] = useState(googleSheetsService.getApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCsvClick = () => csvInputRef.current?.click();
  const handleBackupClick = () => backupInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'backup') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'csv') onImportCSV(file);
      else onImportBackup(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleAddCategoryClick = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const startEditing = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
  };

  const saveEdit = () => {
    if (editingCategory && editValue.trim() && editValue !== editingCategory) {
      onEditCategory(editingCategory, editValue.trim());
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const handleSaveUrl = () => {
    googleSheetsService.setApiUrl(apiUrl);
    setConnectionStatus('idle');
    alert('URL salva com sucesso! Teste a conexão.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');
    const success = await googleSheetsService.testConnection();
    setConnectionStatus(success ? 'success' : 'error');
    setIsTesting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* API Configuration */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Link className="w-5 h-5 text-blue-600" />
          Conexão com Google Sheets
        </h3>
        
        <div className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL do Web App (Google Apps Script)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={apiUrl}
                 onChange={(e) => setApiUrl(e.target.value)}
                 className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                 placeholder="https://script.google.com/macros/s/..."
               />
               <button 
                 onClick={handleSaveUrl}
                 className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
               >
                 <Save className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleTestConnection}
              disabled={isTesting || !apiUrl}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              Testar Conexão
            </button>
            
            {connectionStatus === 'success' && (
              <span className="text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in">
                <Check className="w-4 h-4" /> Conectado com sucesso!
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4" /> Falha na conexão.
              </span>
            )}
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A URL deve apontar para um script publicado como Web App com permissão de acesso "Qualquer pessoa" (ou configurado corretamente).
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-600" />
          Preferências e Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Aparência</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Alternar entre modo claro e escuro</p>
            </div>
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                darkMode 
                  ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {darkMode ? 'Escuro' : 'Claro'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
             <div>
               <p className="font-medium text-slate-800 dark:text-white flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500"/> Itens Lançamento Rápido</p>
               <p className="text-sm text-slate-500 dark:text-slate-400">Quantidade de cards no Dashboard</p>
             </div>
             <input 
               type="number" 
               min="3" 
               max="12"
               value={quickLaunchCount}
               onChange={(e) => onUpdateQuickLaunchCount(Number(e.target.value))}
               className="w-20 px-3 py-2 text-center border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white font-bold"
             />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg md:col-span-2">
             <div>
               <p className="font-medium text-slate-800 dark:text-white">Período de Cobertura (Dias)</p>
               <p className="text-sm text-slate-500 dark:text-slate-400">Para cálculo de estoque mínimo automático</p>
             </div>
             <input 
               type="number" 
               min="7" 
               max="365"
               value={stockCoverageDays}
               onChange={(e) => onUpdateStockCoverageDays(Number(e.target.value))}
               className="w-24 px-3 py-2 text-center border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white font-bold"
             />
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <List className="w-5 h-5 text-orange-600" />
          Gerenciar Categorias
        </h3>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nova categoria..."
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleAddCategoryClick}
            disabled={!newCategoryName.trim()}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 font-semibold">Nome da Categoria</th>
                <th className="px-4 py-3 font-semibold text-right w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {categories.map(cat => (
                <tr key={cat} className="group hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                    {editingCategory === cat ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-slate-800 outline-none"
                      />
                    ) : (
                      cat
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {editingCategory === cat ? (
                        <>
                          <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingCategory(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Importação CSV
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Importe produtos em massa. O arquivo deve ter cabeçalhos: 
            <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-xs mx-1">name, sku, category, quantity, minStock</code>
          </p>
          
          <input 
            type="file" 
            ref={csvInputRef} 
            onChange={(e) => handleFileChange(e, 'csv')} 
            accept=".csv" 
            className="hidden" 
          />
          
          <button 
            onClick={handleCsvClick}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Selecionar Arquivo CSV
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            Backup e Restauração
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Salve todos os dados (produtos e histórico) em um arquivo JSON seguro ou restaure um backup.
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 rounded-lg font-medium transition-colors border border-slate-200 dark:border-slate-600"
            >
              <Download className="w-4 h-4" />
              Backup
            </button>
            
            <input 
              type="file" 
              ref={backupInputRef} 
              onChange={(e) => handleFileChange(e, 'backup')} 
              accept=".json" 
              className="hidden" 
            />
            
            <button 
              onClick={handleBackupClick}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Restaurar
            </button>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-600" />
          Ferramentas
        </h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-white">Gerador de Etiquetas</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerar PDF para impressão com QR Codes ({productCount} produtos)</p>
          </div>
          <button 
            onClick={onOpenLabelPrinter}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            Gerar Etiquetas
          </button>
        </div>
      </div>

    </div>
  );
};

export default Settings;
