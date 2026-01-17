
import { Product, Transaction, Collaborator, SyncItem, User } from '../types';

const LS_KEYS = {
  API_URL: 'config_api_url',
  PENDING: 'operacoes_pendentes',
  PRODUCTS: 'almoxarifado_inventory',
  HISTORY: 'almoxarifado_history',
  COLLABORATORS: 'almoxarifado_collaborators',
  CATEGORIES: 'almoxarifado_categories',
  USERS: 'almoxarifado_users'
};

// Credenciais de Emergência
const MASTER_USER = {
  usuario: 'admin',
  senha: 'admin123',
  nome: 'Administrador (Mestre)',
  nivel: 'admin' as const
};

type SheetTab = 'produtos' | 'movimentacoes' | 'colaboradores' | 'categorias' | 'notas_fiscais' | 'usuarios';

class GoogleSheetsService {
  private apiUrl: string;
  private isOffline: boolean = false;

  constructor() {
    this.apiUrl = localStorage.getItem(LS_KEYS.API_URL) || '';
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
    localStorage.setItem(LS_KEYS.API_URL, url);
  }

  getApiUrl() {
    return this.apiUrl;
  }

  isConfigured() {
    return !!this.apiUrl;
  }

  getOfflineStatus() {
    return this.isOffline;
  }

  // --- AUTH ---
  async login(user: string, pass: string): Promise<User | null> {
    // 1. Verificar usuário mestre de emergência
    if (user === MASTER_USER.usuario && pass === MASTER_USER.senha) {
      return {
        id: 'master-001',
        usuario: MASTER_USER.usuario,
        nome: MASTER_USER.nome,
        nivel: MASTER_USER.nivel
      };
    }

    // 2. Buscar na lista de usuários (Planilha/Cache)
    try {
      const users = await this.list<User>('usuarios');
      const found = users.find(u => u.usuario === user && u.senha === pass);
      if (found) {
        const { senha, ...userSafe } = found;
        return userSafe as User;
      }
    } catch (e) {
      console.error("Erro ao validar login na base de dados", e);
    }

    return null;
  }

  // --- API OPERATIONS ---

  async list<T>(tab: SheetTab): Promise<T[]> {
    if (!this.apiUrl) return this.loadFromLS(tab);

    try {
      const response = await fetch(`${this.apiUrl}?acao=listar&aba=${tab}`);
      const result = await response.json();

      if (result.status === 'success') {
        this.isOffline = false;
        localStorage.setItem(this.getLsKey(tab), JSON.stringify(result.data));
        return result.data;
      } else {
        throw new Error(result.mensagem);
      }
    } catch (error) {
      console.error(`Erro ao listar ${tab}:`, error);
      this.isOffline = true;
      return this.loadFromLS(tab);
    }
  }

  async add<T>(tab: SheetTab, data: T): Promise<T> {
    this.addToLS(tab, data);
    if (!this.apiUrl) return data;

    try {
      const response = await fetch(`${this.apiUrl}?acao=adicionar&aba=${tab}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (result.status === 'success') {
        this.isOffline = false;
        return result.data || data;
      }
      throw new Error(result.mensagem);
    } catch (error) {
      console.error(`Erro ao adicionar em ${tab}:`, error);
      this.isOffline = true;
      this.savePending('adicionar', tab, data);
      return data;
    }
  }

  async update<T>(tab: SheetTab, data: T): Promise<T> {
    this.updateInLS(tab, data);
    if (!this.apiUrl) return data;

    try {
      const response = await fetch(`${this.apiUrl}?acao=atualizar&aba=${tab}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (result.status === 'success') {
        this.isOffline = false;
        return result.data || data;
      }
      throw new Error(result.mensagem);
    } catch (error) {
      console.error(`Erro ao atualizar em ${tab}:`, error);
      this.isOffline = true;
      this.savePending('atualizar', tab, data);
      return data;
    }
  }

  async delete(tab: SheetTab, id: string, idColumn: string = 'id'): Promise<boolean> {
    this.removeFromLS(tab, id, idColumn);
    if (!this.apiUrl) return true;

    try {
      const response = await fetch(`${this.apiUrl}?acao=deletar&aba=${tab}`, {
        method: 'POST',
        body: JSON.stringify({ id, coluna: idColumn })
      });
      const result = await response.json();

      if (result.status === 'success') {
        this.isOffline = false;
        return true;
      }
      throw new Error(result.mensagem);
    } catch (error) {
      console.error(`Erro ao deletar de ${tab}:`, error);
      this.isOffline = true;
      this.savePending('deletar', tab, { id, coluna: idColumn });
      return true;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiUrl) return false;
    try {
      const response = await fetch(`${this.apiUrl}?acao=testar`);
      const result = await response.json();
      return result.status === 'success';
    } catch (e) {
      return false;
    }
  }

  // --- SYNC ---

  savePending(action: 'adicionar' | 'atualizar' | 'deletar', aba: string, dados: any) {
    const pendentes = this.getPendingQueue();
    pendentes.push({ action, aba, dados, timestamp: Date.now() });
    localStorage.setItem(LS_KEYS.PENDING, JSON.stringify(pendentes));
  }

  getPendingQueue(): SyncItem[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.PENDING) || '[]');
    } catch {
      return [];
    }
  }

  async syncPending(): Promise<number> {
    if (!this.apiUrl) return 0;
    const pendentes = this.getPendingQueue();
    if (pendentes.length === 0) return 0;

    let successCount = 0;
    const remaining: SyncItem[] = [];

    for (const item of pendentes) {
      try {
        let response;
        const options = { method: 'POST', body: JSON.stringify(item.dados) };
        if (item.action === 'adicionar') response = await fetch(`${this.apiUrl}?acao=adicionar&aba=${item.aba}`, options);
        else if (item.action === 'atualizar') response = await fetch(`${this.apiUrl}?acao=atualizar&aba=${item.aba}`, options);
        else if (item.action === 'deletar') response = await fetch(`${this.apiUrl}?acao=deletar&aba=${item.aba}`, options);

        if (response && response.ok) {
          const result = await response.json();
          if (result.status === 'success') successCount++;
          else remaining.push(item);
        } else remaining.push(item);
      } catch (e) {
        remaining.push(item);
      }
    }
    localStorage.setItem(LS_KEYS.PENDING, JSON.stringify(remaining));
    return successCount;
  }

  private getLsKey(tab: string) {
    switch (tab) {
      case 'produtos': return LS_KEYS.PRODUCTS;
      case 'movimentacoes': return LS_KEYS.HISTORY;
      case 'colaboradores': return LS_KEYS.COLLABORATORS;
      case 'categorias': return LS_KEYS.CATEGORIES;
      case 'usuarios': return LS_KEYS.USERS;
      default: return `almoxarifado_${tab}`;
    }
  }

  private loadFromLS<T>(tab: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(this.getLsKey(tab)) || '[]');
    } catch {
      return [];
    }
  }

  private addToLS(tab: string, item: any) {
    const key = this.getLsKey(tab);
    const list = this.loadFromLS<any[]>(tab);
    list.push(item);
    localStorage.setItem(key, JSON.stringify(list));
  }

  private updateInLS(tab: string, item: any) {
    const key = this.getLsKey(tab);
    let list = this.loadFromLS<any[]>(tab);
    const idKey = tab === 'colaboradores' ? 'id_fun' : 'id';
    list = list.map(i => i[idKey] === item[idKey] ? item : i);
    localStorage.setItem(key, JSON.stringify(list));
  }

  private removeFromLS(tab: string, id: string, idCol: string) {
    const key = this.getLsKey(tab);
    let list = this.loadFromLS<any[]>(tab);
    list = list.filter(i => i[idCol] !== id);
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export const googleSheetsService = new GoogleSheetsService();
