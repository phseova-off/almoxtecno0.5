
export type Category = string;
export type Unit = 'un' | 'kg' | 'cx' | 'lt' | 'pç';

export const DEFAULT_CATEGORIES: string[] = [
  'Ferramentas',
  'EPI',
  'Material de Escritório',
  'Limpeza',
  'Equipamentos',
  'Outros'
];

export const UNITS: Unit[] = ['un', 'kg', 'cx', 'lt', 'pç'];

export interface User {
  id: string;
  usuario: string;
  senha?: string;
  nome: string;
  nivel: 'admin' | 'operador';
  data_cadastro?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minStock: number;
  category: Category;
  unit: Unit;
  location: string;
  description: string;
  lastUpdated: number;
  isAutoMinStock?: boolean;
  price?: number;
  tag?: string;
  barcode?: string;
  empresa_locadora?: string;
  valor_locacao?: number;
  data_locacao?: string;
  data_validade?: string;
  proxima_manutencao?: string;
}

export interface Collaborator {
  id?: string; // Internal UUID from Supabase
  id_fun: string;
  name: string;
  role: string;
  contract: string;
  isAlmoxarife?: boolean;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida' | 'baixa' | 'devolucao_fornecedor';
  quantity: number;
  timestamp: number;
  userName: string;
  supplier?: string;
  invoiceNumber?: string;
  notes?: string;
  requester?: string;
  department?: string;
  purpose?: string;
  collaboratorId?: string;
  collaboratorRole?: string;
  collaboratorContract?: string;
  originalTransactionCode?: string;
  unitPrice?: number;
  totalValue?: number;
  tag?: string;
  empresa_locadora?: string;
  attendantId?: string;
  attendantName?: string;
}

export interface AIAnalysisResult {
  summary: string;
  lowStockAlerts: string[];
  restockSuggestions: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type SortKey = 'name' | 'category' | 'quantity' | 'lastUpdated';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export interface AdvancedFilter {
  nameContains: string;
  skuContains: string;
  category: Category | 'Todas';
  locationContains: string;
  minQuantity?: number;
  maxQuantity?: number;
  onlyLowStock: boolean;
}

export type ConnectionStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncItem {
  action: 'adicionar' | 'atualizar' | 'deletar';
  aba: string;
  dados: any;
  timestamp: number;
  id?: string;
  coluna?: string;
}
