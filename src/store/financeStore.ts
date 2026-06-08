import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Movement, Debt, Goal, Tithe } from '../types';

interface FinanceState {
  movements: Movement[];
  debts: Debt[];
  goals: Goal[];
  tithes: Tithe[];
  balance: number;
  jointBalance: number;
  jointAccountId: string | null;
  jointAccountName: string;
  jointAccountTheme: string;
  titheBalance: number;
  setMovements: (movements: Movement[]) => void;
  addMovement: (movement: Movement) => void;
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  setTithes: (tithes: Tithe[]) => void;
  payTithe: (id: string) => void;
  setBalance: (balance: number) => void;
  setJointBalance: (balance: number) => void;
  setJointAccountMeta: (meta: { id?: string | null; name?: string | null; theme?: string | null }) => void;
  setTitheBalance: (balance: number) => void;
  resetFinance: () => void;
}

const initialFinanceState = {
  movements: [],
  debts: [],
  goals: [],
  tithes: [],
  balance: 0,
  jointBalance: 0,
  jointAccountId: null,
  jointAccountName: 'Nuestra cuenta',
  jointAccountTheme: 'purple',
  titheBalance: 0,
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      ...initialFinanceState,
      setMovements: (movements) => set({ movements }),
      addMovement: (movement) =>
        set((s) => ({ movements: [movement, ...s.movements] })),
      setDebts: (debts) => set({ debts }),
      addDebt: (debt) => set((s) => ({ debts: [...s.debts, debt] })),
      updateDebt: (id, updates) =>
        set((s) => ({
          debts: s.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      setGoals: (goals) => set({ goals }),
      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
      updateGoal: (id, updates) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
      setTithes: (tithes) => set({ tithes }),
      payTithe: (id) =>
        set((s) => ({
          tithes: s.tithes.map((t) =>
            t.id === id ? { ...t, is_paid: true, paid_at: new Date().toISOString() } : t,
          ),
        })),
      setBalance: (balance) => set({ balance }),
      setJointBalance: (balance) => set({ jointBalance: balance }),
      setJointAccountMeta: (meta) =>
        set((state) => ({
          jointAccountId: meta.id !== undefined ? meta.id : state.jointAccountId,
          jointAccountName: meta.name || state.jointAccountName,
          jointAccountTheme: meta.theme || state.jointAccountTheme,
        })),
      setTitheBalance: (balance) => set({ titheBalance: balance }),
      resetFinance: () => set(initialFinanceState),
    }),
    {
      name: 'finance-store',
      partialize: (state) => ({
        movements: state.movements,
        balance: state.balance,
        jointBalance: state.jointBalance,
        jointAccountId: state.jointAccountId,
        jointAccountName: state.jointAccountName,
        jointAccountTheme: state.jointAccountTheme,
        titheBalance: state.titheBalance,
      }),
    },
  ),
);
