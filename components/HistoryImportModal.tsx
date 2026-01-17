import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2, Download, Database } from 'lucide-react';
import { Product, Collaborator, Transaction } from '../types';

interface HistoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  collaborators: Collaborator[];
  existingHistory: Transaction[];
  onImportComplete: (data: ImportResult) => void;
}

export interface ImportResult {
  newTransactions: Transaction[];
  newProducts: Product[];
  newCollaborators: Collaborator[];
  stockAdjustments: Map<string, number>; // ProductID -> Delta Quantity
}

type ImportStep = 'upload' | 'preview' | 'conflict' | 'processing' | 'summary';

const EXPECTED_HEADERS = [
  'data', 'codigo_movimentacao', 'tipo_movimentacao', 
  'sku_material', 'nome_material', 'tipo', 'empresa', 
  'quantidade', 'id_colaborador', 'nome_colab', 'funcao', 'contrato'
];

const HistoryImportModal: React.FC<HistoryImportModalProps> = ({ 
  isOpen, onClose, products, collaborators, existingHistory, onImportComplete 
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    newProducts: 0,
    newCollaborators: 0,
    entries: 0,
    exits: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- 1. DOWNLOAD TEMPLATE ---
  const handleDownloadTemplate = () => {
    const headerRow = EXPECTED_HEADERS.join(',');
    const example1 = `01/10/2023,MOV-1001,Entrada,FER-001,Martelo,Ferramentas,Ferragens Silva,10,,,,,`;
    const example2 = `05/10/2023,MOV-1002,Saída,FER-001,Martelo,Ferramentas,,1,1020,Maria Silva,Almoxarife,CLT`;
    const content = `${headerRow}\n${example1}\n${example2}`;
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_movimentacoes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 2. FILE PARSING ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setLogs([]);

    const text = await selectedFile.text();
    // Split by newline, handle CR LF
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    
    if (lines.length < 2) {
      setError('Arquivo vazio ou sem dados.');
      return;
    }

    // Header Validation
    const headerLine = lines[0].toLowerCase().split(',').map(h => h.trim());
    const missingHeaders = EXPECTED_HEADERS.filter(h => !headerLine.includes(h.toLowerCase()));
    
    if (missingHeaders.length > 0) {
      setError(`CSV inválido. Colunas faltando: ${missingHeaders.join(', ')}`);
      return;
    }

    // Parse Data
    const parsedData = lines.slice(1).map(line => {
      // Basic comma split, considering simple logic (improve regex if needed for quoted commas)
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });

    setHeaders(headerLine);
    setCsvData(parsedData);
    setStep('preview');
  };

  // --- 3. CONFLICT CHECK ---
  const checkConflicts = () => {
    // Check for duplicate transaction codes
    const newCodes = new Set(csvData.map(row => row[1])); // Index 1 is codigo_movimentacao
    const existingCodes = new Set(existingHistory.map(h => h.originalTransactionCode).filter(Boolean));
    
    let hasConflict = false;
    newCodes.forEach(code => {
      if (existingCodes.has(code)) hasConflict = true;
    });

    if (hasConflict) {
      setStep('conflict');
    } else {
      processImport('overwrite');
    }
  };

  // --- 4. PROCESSING LOGIC ---
  const processImport = async (duplicateAction: 'skip' | 'overwrite') => {
    setStep('processing');
    setProgress(0);
    setLogs([]);

    const result: ImportResult = {
      newTransactions: [],
      newProducts: [],
      newCollaborators: [],
      stockAdjustments: new Map()
    };

    const tempStats = {
      totalRows: csvData.length,
      successCount: 0,
      errorCount: 0,
      newProducts: 0,
      newCollaborators: 0,
      entries: 0,
      exits: 0
    };

    // Index Maps for quick lookup
    const existingCodes = new Set(existingHistory.map(h => h.originalTransactionCode));
    const productSkuMap = new Map<string, string>(); // SKU -> ID
    products.forEach(p => { if(p.sku) productSkuMap.set(p.sku.toLowerCase(), p.id); });
    
    // Also map products created in this session
    const sessionProductMap = new Map<string, string>();

    const collabIdMap = new Set<string>();
    collaborators.forEach(c => collabIdMap.add(c.id_fun.toLowerCase()));
    const sessionCollabMap = new Set<string>();

    const total = csvData.length;

    for (let i = 0; i < total; i++) {
      const row = csvData[i];
      // Update progress
      if (i % 10 === 0) setProgress(Math.round((i / total) * 100));
      await new Promise(r => setTimeout(r, 0)); // Yield to UI

      // Mapping based on expected index (robustness depends on header order matching expected)
      // data, codigo, tipo_mov, sku, nome_mat, tipo, empresa, qtd, id_colab, nome_colab, funcao, contrato
      const [
        dateStr, code, typeStr, sku, prodName, prodCat, company, 
        qtyStr, colabId, colabName, colabRole, colabContract
      ] = row;

      // 1. Basic Validation
      if (!code || !sku || !qtyStr) {
        setLogs(prev => [...prev, `Linha ${i+2}: Ignorada (Dados incompletos)`]);
        tempStats.errorCount++;
        continue;
      }

      // 2. Duplicate Check
      if (existingCodes.has(code)) {
        if (duplicateAction === 'skip') {
          setLogs(prev => [...prev, `Linha ${i+2}: Pulada (Código duplicado: ${code})`]);
          continue;
        }
        // If overwrite/import anyway, we just proceed (system allows multiple same codes if forced, or app logic handles it)
      }

      // 3. Date Parsing
      let timestamp = Date.now();
      try {
        if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          timestamp = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        } else if (dateStr.includes('-')) {
          timestamp = new Date(dateStr).getTime();
        }
        if (isNaN(timestamp)) throw new Error("Invalid date");
        if (timestamp > Date.now()) {
          setLogs(prev => [...prev, `Linha ${i+2}: Aviso - Data futura detectada`]);
        }
      } catch (e) {
        setLogs(prev => [...prev, `Linha ${i+2}: Erro - Data inválida (${dateStr})`]);
        tempStats.errorCount++;
        continue;
      }

      // 4. Type & Quantity
      const type = typeStr.toLowerCase() === 'entrada' ? 'entrada' : 'saida';
      const qty = parseFloat(qtyStr);
      if (isNaN(qty) || qty <= 0) {
        setLogs(prev => [...prev, `Linha ${i+2}: Erro - Quantidade inválida`]);
        tempStats.errorCount++;
        continue;
      }

      // 5. Product Logic
      let productId = productSkuMap.get(sku.toLowerCase()) || sessionProductMap.get(sku.toLowerCase());
      
      if (!productId) {
        // Create New Product
        productId = crypto.randomUUID();
        const newProd: Product = {
          id: productId,
          sku: sku,
          name: prodName || `Produto ${sku}`,
          category: prodCat || 'Outros',
          quantity: 0, // Will be adjusted by transaction
          minStock: 0,
          unit: 'un', // Default
          location: '',
          description: 'Importado automaticamente',
          lastUpdated: timestamp,
          isAutoMinStock: true // Set auto to recalculate later
        };
        result.newProducts.push(newProd);
        sessionProductMap.set(sku.toLowerCase(), productId);
        tempStats.newProducts++;
      }

      // 6. Collaborator Logic (Only for Exit)
      if (type === 'saida' && colabId) {
        if (!collabIdMap.has(colabId.toLowerCase()) && !sessionCollabMap.has(colabId.toLowerCase())) {
          const newCollab: Collaborator = {
            id_fun: colabId,
            name: colabName || 'Desconhecido',
            role: colabRole || 'Indefinido',
            contract: colabContract || 'Indefinido'
          };
          result.newCollaborators.push(newCollab);
          sessionCollabMap.add(colabId.toLowerCase());
          tempStats.newCollaborators++;
        }
      } else if (type === 'saida' && !colabId) {
        setLogs(prev => [...prev, `Linha ${i+2}: Aviso - Saída sem ID de colaborador`]);
      }

      // 7. Create Transaction
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        productId: productId,
        productName: prodName || 'Produto Importado',
        type: type as 'entrada' | 'saida',
        quantity: qty,
        timestamp: timestamp,
        userName: 'Importação',
        originalTransactionCode: code,
        
        // Entry specific
        supplier: type === 'entrada' ? company : undefined,
        
        // Exit specific
        requester: type === 'saida' ? colabName : undefined,
        department: type === 'saida' ? colabRole : undefined,
        
        // Linked Collab
        collaboratorId: colabId,
        collaboratorRole: colabRole,
        collaboratorContract: colabContract
      };

      result.newTransactions.push(transaction);

      // 8. Stock Adjustment Tally
      const currentDelta = result.stockAdjustments.get(productId) || 0;
      const adjustment = type === 'entrada' ? qty : -qty;
      result.stockAdjustments.set(productId, currentDelta + adjustment);

      // Stats
      tempStats.successCount++;
      if (type === 'entrada') tempStats.entries++;
      else tempStats.exits++;
    }

    setStats(tempStats);
    setProgress(100);
    
    // Slight delay to show 100%
    setTimeout(() => {
      onImportComplete(result);
      setStep('summary');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            Importar Histórico em Lote
          </h3>
          <button onClick={onClose} disabled={step === 'processing'} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-slate-800 dark:text-white">Selecione o arquivo CSV</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  O arquivo deve conter 12 colunas padronizadas.
                </p>
              </div>

              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                >
                  Escolher Arquivo
                </button>
                <button 
                  onClick={handleDownloadTemplate}
                  className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar Template CSV
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                 <FileText className="w-5 h-5 text-slate-500" />
                 <h4 className="font-bold text-slate-800 dark:text-white">Pré-visualização (Primeiras 5 linhas)</h4>
               </div>
               <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                 <table className="w-full text-xs text-left whitespace-nowrap">
                   <thead className="bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">
                     <tr>
                       {headers.map((h, i) => <th key={i} className="px-3 py-2 border-r border-slate-200 dark:border-slate-600 last:border-0">{h}</th>)}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {csvData.slice(0, 5).map((row, i) => (
                       <tr key={i}>
                         {row.map((cell, j) => <td key={j} className="px-3 py-2 border-r border-slate-100 dark:border-slate-700 last:border-0 text-slate-700 dark:text-slate-300">{cell}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <p className="text-sm text-slate-500 text-center">Total de linhas detectadas: {csvData.length}</p>
               
               <div className="flex justify-end gap-3 pt-4">
                 <button onClick={() => setStep('upload')} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Voltar</button>
                 <button onClick={checkConflicts} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Continuar</button>
               </div>
            </div>
          )}

          {/* STEP 3: CONFLICT */}
          {step === 'conflict' && (
            <div className="text-center py-8 space-y-6">
              <div className="mx-auto w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Códigos Duplicados Detectados</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Algumas movimentações no arquivo possuem códigos que já existem no histórico. Como deseja prosseguir?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 max-w-xs mx-auto">
                <button onClick={() => processImport('skip')} className="py-3 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium">
                  Pular duplicados
                </button>
                <button onClick={() => processImport('overwrite')} className="py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                  Importar mesmo assim (Permitir duplicatas)
                </button>
                <button onClick={onClose} className="text-slate-500 text-sm mt-2 hover:underline">
                  Cancelar Importação
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PROCESSING */}
          {step === 'processing' && (
            <div className="text-center py-12 space-y-6">
               <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
               <div>
                 <h4 className="text-lg font-bold text-slate-800 dark:text-white">Processando Arquivo...</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Isso pode levar alguns instantes.</p>
               </div>
               
               <div className="max-w-md mx-auto">
                 <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                 </div>
                 <p className="text-right text-xs text-slate-500 mt-1">{progress}%</p>
               </div>

               <div className="max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs text-left font-mono text-slate-500">
                 {logs.map((log, i) => <div key={i}>{log}</div>)}
               </div>
            </div>
          )}

          {/* STEP 5: SUMMARY */}
          {step === 'summary' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white">Importação Concluída!</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                   <p className="text-xs text-slate-500 dark:text-slate-400">Total Processado</p>
                   <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.totalRows}</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                   <p className="text-xs text-green-600">Sucesso</p>
                   <p className="text-lg font-bold text-green-700">{stats.successCount}</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                   <p className="text-xs text-blue-600">Novos Produtos</p>
                   <p className="text-lg font-bold text-blue-700">{stats.newProducts}</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                   <p className="text-xs text-purple-600">Novos Colaboradores</p>
                   <p className="text-lg font-bold text-purple-700">{stats.newCollaborators}</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border-l-4 border-emerald-500">
                   <p className="text-xs text-emerald-600">Entradas</p>
                   <p className="text-lg font-bold text-slate-700 dark:text-white">+{stats.entries}</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border-l-4 border-red-500">
                   <p className="text-xs text-red-600">Saídas</p>
                   <p className="text-lg font-bold text-slate-700 dark:text-white">-{stats.exits}</p>
                 </div>
              </div>

              {stats.errorCount > 0 && (
                 <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {stats.errorCount} Erros encontrados
                    </p>
                    <div className="max-h-24 overflow-y-auto text-xs text-red-600 dark:text-red-300 font-mono">
                      {logs.filter(l => l.includes('Erro')).map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                 </div>
              )}

              <div className="pt-4 flex justify-center">
                <button onClick={onClose} className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-900 dark:hover:bg-slate-600">
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HistoryImportModal;