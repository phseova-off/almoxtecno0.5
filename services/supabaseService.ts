import { supabase } from './supabaseClient';
import { Product, Transaction, Collaborator, User } from '../types';

class SupabaseService {
    // --- AUTH ---
    async login(email: string, pass: string): Promise<User | null> {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: pass,
            });

            if (authError || !authData.user) throw authError;

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) throw profileError;

            return {
                id: profile.id,
                usuario: profile.usuario,
                nome: profile.nome,
                nivel: profile.nivel as 'admin' | 'operador',
            };
        } catch (error) {
            console.error('Login error:', error);
            return null;
        }
    }

    // --- PRODUCTS ---
    async listProducts(): Promise<Product[]> {
        try {
            const { data, error } = await supabase
                .from('produtos_master')
                .select(`
                    *,
                    estoque:estoque_atual (
                        quantidade,
                        estoque_minimo,
                        localizacao_fisica
                    )
                `);

            if (error) throw error;

            return data.map((p: any) => ({
                id: p.id,
                sku: p.sku || '',
                name: p.nome || 'Sem nome',
                quantity: Number(p.estoque?.[0]?.quantidade || 0),
                minStock: Number(p.estoque?.[0]?.estoque_minimo || 0),
                category: p.categoria || 'Outros',
                unit: (p.unidade_medida as any) || 'un',
                location: p.estoque?.[0]?.localizacao_fisica || p.localizacao || '',
                description: p.descricao || '',
                lastUpdated: p.data_atualizacao ? new Date(p.data_atualizacao).getTime() : Date.now(),
                tag: p.tag || '',
                barcode: p.codigo_barras || '',
                empresa_locadora: p.empresa_locadora || '',
                valor_locacao: Number(p.valor_locacao || 0),
                price: Number(p.valor_unitario || 0)
            }));
        } catch (error) {
            console.error('Error listing products:', error);
            return [];
        }
    }

    // --- TRANSACTIONS ---
    async listTransactions(): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('movimentacoes')
                .select('*')
                .order('data_registro', { ascending: false });

            if (error) throw error;

            return data.map((m: any) => ({
                id: m.id,
                productId: m.id_produto,
                productName: m.nome_material,
                type: this.mapTransactionType(m.tipo_movimentacao),
                quantity: Number(m.quantidade),
                timestamp: new Date(m.data_registro).getTime(),
                userName: m.responsavel || 'Sistema',
                notes: m.observacoes || '',
                collaboratorId: m.id_colaborador,
                collaboratorName: m.nome_colaborador,
                unitPrice: Number(m.valor_unitario || 0),
                totalValue: Number(m.valor_total || 0),
                invoiceNumber: m.numero_nf
            }));
        } catch (error) {
            console.error('Error listing transactions:', error);
            return [];
        }
    }

    private mapTransactionType(type: string): Transaction['type'] {
        const t = (type || '').toLowerCase();
        if (t.includes('entrada')) return 'entrada';
        if (t.includes('saida') || t.includes('saída')) return 'saida';
        if (t.includes('baixa')) return 'baixa';
        if (t.includes('devolucao') || t.includes('devolução')) return 'devolucao_fornecedor';
        return 'entrada';
    }

    // --- COLLABORATORS ---
    async listCollaborators(): Promise<Collaborator[]> {
        try {
            const { data, error } = await supabase
                .from('colaboradores')
                .select('*')
                .eq('status', 'Ativo');

            if (error) throw error;

            return data.map((c: any) => ({
                id: c.id,
                id_fun: c.id_fun || c.id,
                name: c.nome,
                role: c.funcao,
                contract: c.contrato,
                isAlmoxarife: c.permissao_retirada
            }));
        } catch (error) {
            console.error('Error listing collaborators:', error);
            return [];
        }
    }

    // --- CATEGORIES ---
    async listCategories(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('categorias')
                .select('nome')
                .eq('ativo', true);

            if (error) throw error;
            return data.map((c: any) => c.nome);
        } catch {
            return [];
        }
    }

    // --- OPERATIONS ---
    async updateProductStock(productId: string, quantity: number, type: 'entrada' | 'saida' | 'baixa' | 'devolucao_fornecedor'): Promise<boolean> {
        try {
            const { data: stock, error: fetchError } = await supabase
                .from('estoque_atual')
                .select('quantidade')
                .eq('id_produto', productId)
                .single();

            if (fetchError) throw fetchError;

            let newQuantity = Number(stock.quantidade);
            if (type === 'entrada') newQuantity += quantity;
            else if (type === 'saida' || type === 'devolucao_fornecedor') newQuantity -= quantity;

            if (type === 'baixa') return true;

            const { error: updateError } = await supabase
                .from('estoque_atual')
                .update({ quantidade: newQuantity, data_atualizacao: new Date().toISOString() })
                .eq('id_produto', productId);

            if (updateError) throw updateError;
            return true;
        } catch (error) {
            console.error('Error updating stock:', error);
            return false;
        }
    }

    async saveProduct(product: Product): Promise<boolean> {
        try {
            const isNew = !product.id || !product.id.includes('-');

            const productData = {
                sku: product.sku,
                nome: product.name,
                categoria: product.category,
                unidade_medida: product.unit,
                descricao: product.description,
                valor_unitario: product.price,
                tag: product.tag,
                codigo_barras: product.barcode,
                empresa_locadora: product.empresa_locadora,
                valor_locacao: product.valor_locacao,
                app_origem: 'almoxarifado',
                data_atualizacao: new Date().toISOString()
            };

            if (isNew) {
                const { data: newMaster, error: masterError } = await supabase
                    .from('produtos_master')
                    .insert([productData])
                    .select()
                    .single();

                if (masterError) throw masterError;

                const { error: stockError } = await supabase
                    .from('estoque_atual')
                    .insert([{
                        id_produto: newMaster.id,
                        sku: product.sku,
                        quantidade: product.quantity,
                        estoque_minimo: product.minStock,
                        status_estoque: 'Disponível'
                    }]);

                if (stockError) throw stockError;
            } else {
                const { error: masterError } = await supabase
                    .from('produtos_master')
                    .update(productData)
                    .eq('id', product.id);

                if (masterError) throw masterError;

                const { error: stockError } = await supabase
                    .from('estoque_atual')
                    .update({
                        estoque_minimo: product.minStock,
                        data_atualizacao: new Date().toISOString()
                    })
                    .eq('id_produto', product.id);

                if (stockError) throw stockError;
            }

            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            return false;
        }
    }

    async addTransaction(transaction: Transaction): Promise<boolean> {
        try {
            const { error: moveError } = await supabase
                .from('movimentacoes')
                .insert([{
                    id_produto: transaction.productId,
                    nome_material: transaction.productName,
                    tipo_movimentacao: transaction.type.toUpperCase(),
                    quantidade: transaction.quantity,
                    responsavel: transaction.userName,
                    observacoes: transaction.notes,
                    id_colaborador: transaction.collaboratorId && transaction.collaboratorId.includes('-') ? transaction.collaboratorId : null,
                    sku_material: transaction.tag,
                    valor_unitario: transaction.unitPrice,
                    valor_total: transaction.totalValue,
                    numero_nf: transaction.invoiceNumber,
                    data_registro: new Date(transaction.timestamp).toISOString(),
                    app_origem: 'almoxarifado'
                }]);

            if (moveError) throw moveError;
            return await this.updateProductStock(transaction.productId, transaction.quantity, transaction.type);
        } catch (error) {
            console.error('Error adding transaction:', error);
            return false;
        }
    }

    async addCollaborator(c: Collaborator): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('colaboradores')
                .insert([{
                    id_fun: c.id_fun,
                    nome: c.name,
                    funcao: c.role,
                    contrato: c.contract,
                    permissao_retirada: c.isAlmoxarife,
                    status: 'Ativo',
                    app_origem: 'almoxarifado'
                }]);
            return !error;
        } catch { return false; }
    }

    async deleteCollaborator(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('colaboradores')
                .update({ status: 'Inativo' })
                .eq('id_fun', id);
            return !error;
        } catch { return false; }
    }
}

export const supabaseService = new SupabaseService();
