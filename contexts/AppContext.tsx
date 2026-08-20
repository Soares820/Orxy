'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser, AppData, Paciente, Sessao, Contrato, Pagamento, Meta, Avaliacao, Funcionario, Usuario, Despesa } from '@/lib/types';

// ─── State ────────────────────────────────────────────────

interface AppState {
  user: AppUser | null;
  data: AppData;
  loading: boolean;
  initialized: boolean;
}

const EMPTY_DATA: AppData = {
  children: [],
  sessions: [],
  contracts: [],
  payments: [],
  goals: [],
  evaluations: [],
  team: [],
  profiles: [],
  expenses: [],
  fornecedores: [],
};

const initialState: AppState = {
  user: null,
  data: EMPTY_DATA,
  loading: true,
  initialized: false,
};

// ─── Actions ──────────────────────────────────────────────

type Action =
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'SET_DATA'; payload: Partial<AppData> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED' }
  | { type: 'ADD_CHILD'; payload: Paciente }
  | { type: 'UPDATE_CHILD'; payload: Paciente }
  | { type: 'ADD_SESSION'; payload: Sessao }
  | { type: 'UPDATE_SESSION'; payload: Sessao }
  | { type: 'DELETE_SESSION'; payload: number }
  | { type: 'ADD_CONTRACT'; payload: Contrato }
  | { type: 'ADD_PAYMENT'; payload: Pagamento }
  | { type: 'UPDATE_PAYMENT'; payload: Pagamento }
  | { type: 'ADD_GOAL'; payload: Meta }
  | { type: 'UPDATE_GOAL'; payload: Meta }
  | { type: 'ADD_EXPENSE'; payload: Despesa }
  | { type: 'UPDATE_EXPENSE'; payload: Despesa }
  | { type: 'DELETE_EXPENSE'; payload: number }
  | { type: 'LOGOUT' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_DATA':
      return { ...state, data: { ...state.data, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, initialized: true, loading: false };
    case 'ADD_CHILD':
      return { ...state, data: { ...state.data, children: [...state.data.children, action.payload] } };
    case 'UPDATE_CHILD':
      return { ...state, data: { ...state.data, children: state.data.children.map((c) => c.id === action.payload.id ? action.payload : c) } };
    case 'ADD_SESSION':
      return { ...state, data: { ...state.data, sessions: [action.payload, ...state.data.sessions] } };
    case 'UPDATE_SESSION':
      return { ...state, data: { ...state.data, sessions: state.data.sessions.map((s) => s.id === action.payload.id ? action.payload : s) } };
    case 'DELETE_SESSION':
      return { ...state, data: { ...state.data, sessions: state.data.sessions.filter((s) => s.id !== action.payload) } };
    case 'ADD_CONTRACT':
      return { ...state, data: { ...state.data, contracts: [...state.data.contracts, action.payload] } };
    case 'ADD_PAYMENT':
      return { ...state, data: { ...state.data, payments: [...state.data.payments, action.payload] } };
    case 'UPDATE_PAYMENT':
      return { ...state, data: { ...state.data, payments: state.data.payments.map((p) => p.id === action.payload.id ? action.payload : p) } };
    case 'ADD_GOAL':
      return { ...state, data: { ...state.data, goals: [...state.data.goals, action.payload] } };
    case 'UPDATE_GOAL':
      return { ...state, data: { ...state.data, goals: state.data.goals.map((g) => g.id === action.payload.id ? action.payload : g) } };
    case 'ADD_EXPENSE':
      return { ...state, data: { ...state.data, expenses: [...state.data.expenses, action.payload] } };
    case 'UPDATE_EXPENSE':
      return { ...state, data: { ...state.data, expenses: state.data.expenses.map((e) => e.id === action.payload.id ? action.payload : e) } };
    case 'DELETE_EXPENSE':
      return { ...state, data: { ...state.data, expenses: state.data.expenses.filter((e) => e.id !== action.payload) } };
    case 'LOGOUT':
      return { ...initialState, loading: false, initialized: true };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadUserData: (clinicId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadUserData = useCallback(async (clinicId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [pac, sess, cont, pag, met, aval, func, usuarios, desp, forn] = await Promise.allSettled([
        supabase.from('pacientes').select('*').eq('clinic_id', clinicId).order('name'),
        supabase.from('sessoes').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
        supabase.from('contratos').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
        supabase.from('pagamentos').select('*').eq('clinic_id', clinicId).order('mes', { ascending: false }),
        supabase.from('metas').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
        supabase.from('avaliacoes').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
        supabase.from('funcionarios').select('*').eq('clinic_id', clinicId).order('nome'),
        supabase.from('users').select('*').eq('clinic_id', clinicId).order('nome'),
        supabase.from('despesas').select('*').eq('clinic_id', clinicId).order('mes', { ascending: false }),
        supabase.from('fornecedores').select('*').eq('clinic_id', clinicId).eq('status', 'ativo').order('nome'),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pick = (r: PromiseSettledResult<{ data: any[] | null }>): any[] =>
        r.status === 'fulfilled' ? (r.value.data ?? []) : [];

      dispatch({
        type: 'SET_DATA',
        payload: {
          children:     pick(pac as PromiseSettledResult<{ data: unknown[] | null }>),
          sessions:     pick(sess as PromiseSettledResult<{ data: unknown[] | null }>),
          contracts:    pick(cont as PromiseSettledResult<{ data: unknown[] | null }>),
          payments:     pick(pag as PromiseSettledResult<{ data: unknown[] | null }>),
          goals:        pick(met as PromiseSettledResult<{ data: unknown[] | null }>),
          evaluations:  pick(aval as PromiseSettledResult<{ data: unknown[] | null }>),
          team:         pick(func as PromiseSettledResult<{ data: unknown[] | null }>),
          profiles:     pick(usuarios as PromiseSettledResult<{ data: unknown[] | null }>),
          expenses:     pick(desp as PromiseSettledResult<{ data: unknown[] | null }>),
          fornecedores: pick(forn as PromiseSettledResult<{ data: unknown[] | null }>),
        },
      });
    } catch (e) {
      console.error('loadUserData error', e);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Busca o usuário pelo auth_id
        const { data: userRow } = await supabase
          .from('users')
          .select('*, clinics(*)')
          .eq('auth_id', session.user.id)
          .single();

        if (userRow) {
          const clinic = (userRow as any).clinics;
          dispatch({
            type: 'SET_USER',
            payload: {
              id: userRow.id,
              auth_id: session.user.id,
              email: session.user.email ?? '',
              clinicId: userRow.clinic_id,
              clinicName: clinic?.nome ?? '',
              role: userRow.role,
              name: userRow.nome,
              plan: clinic?.plano ?? 'trial',
              trialEndsAt: clinic?.trial_ends ?? null,
            },
          });
          await loadUserData(userRow.clinic_id);
        } else {
          // Sem perfil no banco — provisiona automaticamente (cria clínica + usuario)
          try {
            const provRes = await fetch('/api/provision', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (provRes.ok) {
              const { user: provUser, clinic } = await provRes.json();
              dispatch({
                type: 'SET_USER',
                payload: {
                  id: provUser.id,
                  auth_id: session.user.id,
                  email: session.user.email ?? '',
                  clinicId: provUser.clinic_id,
                  clinicName: clinic?.nome ?? 'Minha Clínica',
                  role: provUser.role,
                  name: provUser.nome,
                  plan: clinic?.plano ?? 'trial',
                  trialEndsAt: clinic?.trial_ends ?? null,
                },
              });
              await loadUserData(provUser.clinic_id);
            } else {
              // Fallback mínimo se o provisionamento falhar
              dispatch({
                type: 'SET_USER',
                payload: {
                  id: session.user.id,
                  auth_id: session.user.id,
                  email: session.user.email ?? '',
                  clinicId: '',
                  clinicName: 'Minha Clínica',
                  role: 'admin',
                  name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
                  plan: 'trial',
                  trialEndsAt: null,
                },
              });
            }
          } catch {
            dispatch({
              type: 'SET_USER',
              payload: {
                id: session.user.id,
                auth_id: session.user.id,
                email: session.user.email ?? '',
                clinicId: '',
                clinicName: 'Minha Clínica',
                role: 'admin',
                name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
                plan: 'trial',
                trialEndsAt: null,
              },
            });
          }
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
      dispatch({ type: 'SET_INITIALIZED' });
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  return (
    <AppContext.Provider value={{ state, dispatch, loadUserData, logout }}>
      {children}
    </AppContext.Provider>
  );
}
