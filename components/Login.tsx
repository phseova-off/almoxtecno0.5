
import React, { useState } from 'react';
import { ArrowRight, Lock, User as UserIcon, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Direct Supabase Authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : authError.message);
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Erro ao carregar perfil do usuário.');
          return;
        }

        onLogin({
          id: profile.id,
          usuario: profile.usuario,
          nome: profile.nome,
          nivel: profile.nivel as 'admin' | 'operador',
        });
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar ao sistema. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="tank-icon shadow-inner">
            <ShieldCheck className="text-white w-6 h-6 opacity-50" />
          </div>
          <h1 className="brand-logo">TECNOMONTE</h1>
          <p className="brand-subtitle">Gestão de Almoxarifado Industrial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-tecnomonte-gold outline-none transition-all dark:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-tecnomonte-gold outline-none transition-all dark:bg-white"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded text-sm flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-tecnomonte text-white font-bold py-4 rounded text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Acessar Sistema
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-tighter">
            Fabricação, Montagem e Manutenção Industrial
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
