/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Wallet, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Search, 
  Bell, 
  ChevronDown, 
  TrendingUp, 
  Download, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  Utensils, 
  Info, 
  Calculator, 
  X, 
  History,
  Trash2,
  ChevronRight, 
  Shield, 
  Lock, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Copy, 
  ArrowRight, 
  Headphones,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatBot } from './components/ChatBot';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from './lib/utils';
import { auth, db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong. Please try refreshing the page.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Error: ${parsed.error}`;
      } catch (e) {
        if (this.state.error?.message) message = this.state.error.message;
      }

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-outline-variant/30 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-on-surface-variant text-sm mb-8">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm tracking-widest hover:bg-black/90 transition-all"
            >
              REFRESH PAGE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---
type Screen = 'overview' | 'analytics' | 'portfolio' | 'settings' | 'support';

interface Transaction {
  id: number;
  name: string;
  date: string; // Display date like "Oct 24"
  fullDate: Date;
  category: string;
  amount: number;
  type: 'received' | 'sent';
  icon: any;
}

// --- Mock Data ---
const INITIAL_TRANSACTIONS: Transaction[] = [];

interface Debt {
  id: number;
  name: string;
  status: 'Owes You' | 'You Owe';
  amount: number;
  initials: string;
  color: string;
}

const INITIAL_DEBTS: Debt[] = [
  { id: 1, name: 'Aryan Varma', status: 'Owes You', amount: 0, initials: 'AV', color: 'bg-black' },
  { id: 2, name: 'Saira Khan', status: 'You Owe', amount: 0, initials: 'SK', color: 'bg-white border border-outline-variant' },
  { id: 3, name: 'Jai Prakash', status: 'Owes You', amount: 0, initials: 'JP', color: 'bg-white border border-outline-variant' },
];

const CHART_DATA = [
  { name: 'W1', income: 0, expenses: 0 },
  { name: 'W2', income: 0, expenses: 0 },
  { name: 'W3', income: 0, expenses: 0 },
  { name: 'W4', income: 0, expenses: 0 },
];

const SAVINGS_DATA = [
  { name: 'Jul', value: 0 },
  { name: 'Aug', value: 0 },
  { name: 'Sep', value: 0 },
  { name: 'Oct', value: 0 },
];

const INITIAL_NETWORK_NODES: NetworkNode[] = [
  { 
    id: 'es', 
    name: 'Elena Sorova', 
    tier: 'Tier 1 Partner', 
    received: '0', 
    sent: '0', 
    net: 0, 
    initials: 'ES',
    children: [
      { id: 'mk', name: 'Marcus Kroll', received: '0', sent: '0', net: 0, initials: 'MK', trend: 'flat' },
      { id: 'lt', name: 'Linda Tan', received: '0', sent: '0', net: 0, initials: 'LT', trend: 'flat' },
    ]
  },
  { id: 'rh', name: 'Robert Hencke', tier: 'Executive Node', received: '0', sent: '0', net: 0, initials: 'RH', active: true },
  { id: 'wm', name: 'Whitney Meyer', tier: 'Tier 1 Partner', received: '0', sent: '0', net: 0, initials: 'WM', faded: true },
];

interface NetworkNode {
  id: string;
  name: string;
  tier?: string;
  received?: string;
  sent?: string;
  net: number;
  initials: string;
  active?: boolean;
  faded?: boolean;
  timestamp?: string;
  children?: {
    id: string;
    name: string;
    received?: string;
    sent?: string;
    net: number;
    initials: string;
    trend: string;
    timestamp?: string;
  }[];
}

// --- Constants ---
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD - US Dollar': '$',
  'EUR - Euro': '€',
  'GBP - British Pound': '£',
  'INR - Indian Rupee': '₹',
  'JPY - Japanese Yen': '¥',
  'AUD - Australian Dollar': 'A$',
  'CAD - Canadian Dollar': 'C$',
  'CHF - Swiss Franc': 'Fr',
  'CNY - Chinese Yuan': '¥',
  'AED - UAE Dirham': 'د.إ'
};

const COUNTRY_CODES = [
  { code: '+1', country: 'USA' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+81', country: 'Japan' },
  { code: '+971', country: 'UAE' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
];

interface Profile {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  currency: string;
}

// --- Components ---

const Sidebar = ({ activeScreen, setScreen, onSignOut }: { activeScreen: Screen, setScreen: (s: Screen) => void, onSignOut: () => void }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-black text-white p-6 flex flex-col z-50">
      <div className="mb-12">
        <h1 className="text-2xl font-extrabold tracking-tighter">Vrix Finance</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1 font-semibold">Financial Group</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeScreen === item.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeScreen === item.id ? "text-white" : "text-white/50 group-hover:text-white")} />
            <span className="font-semibold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-2 pt-6 border-t border-white/10">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeScreen === item.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeScreen === item.id ? "text-white" : "text-white/50 group-hover:text-white")} />
            <span className="font-semibold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

const TopBar = ({ 
  title, 
  selectedMonth, 
  setSelectedMonth, 
  selectedYear, 
  setSelectedYear,
  profile 
}: { 
  title: string,
  selectedMonth: string,
  setSelectedMonth: (m: string) => void,
  selectedYear: string,
  setSelectedYear: (y: string) => void,
  profile: Profile
}) => {
  return (
    <header className="fixed top-0 right-0 left-64 h-20 flex items-center justify-between px-10 bg-surface z-40">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold font-headline">{title}</h2>
        <div className="flex items-center gap-2">
          <div className="relative inline-block">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-surface-container-low border-none rounded-full py-2 pl-4 pr-10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors focus:ring-0"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant pointer-events-none" />
          </div>
          <div className="relative inline-block">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-surface-container-low border-none rounded-full py-2 pl-4 pr-10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors focus:ring-0"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-black/10 transition-all"
          />
        </div>
        <button className="p-2 rounded-full text-on-surface-variant hover:text-black hover:bg-surface-container-low transition-all">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 bg-surface-container-low rounded-full pl-1 pr-4 py-1 cursor-pointer hover:bg-surface-container-high transition-all">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-300">
            <img 
              src={`https://picsum.photos/seed/${profile.name.split(' ')[0].toLowerCase()}/100/100`} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-sm font-bold">{profile.name}</span>
        </div>
      </div>
    </header>
  );
};

const CalculatorPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<{ expression: string, result: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (waitingForOperand && operator) {
      setOperator(nextOperator);
      return;
    }

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      const newValue = calculate(currentValue, inputValue, operator);
      
      // Add intermediate step to history
      const expression = `${currentValue} ${operator} ${inputValue}`;
      setHistory(prev => [{ expression, result: String(newValue) }, ...prev].slice(0, 20));
      
      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (prev: number, next: number, op: string) => {
    switch (op) {
      case '+': return prev + next;
      case '-': return prev - next;
      case '×': return prev * next;
      case '÷': return next !== 0 ? prev / next : 0;
      default: return next;
    }
  };

  const handleEqual = () => {
    const inputValue = parseFloat(display);
    if (operator && prevValue !== null) {
      const result = calculate(prevValue, inputValue, operator);
      const expression = `${prevValue} ${operator} ${inputValue}`;
      setHistory(prev => [{ expression, result: String(result) }, ...prev].slice(0, 20));
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handlePoint = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-80 bg-white shadow-2xl z-[70] p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant">Calculator</span>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    showHistory ? "bg-black text-white" : "hover:bg-surface-container-low text-on-surface-variant"
                  )}
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-surface-container-low rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              {showHistory ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">History</h4>
                    {history.length > 0 && (
                      <button 
                        onClick={() => setHistory([])}
                        className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
                    {history.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <History className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No history yet</p>
                      </div>
                    ) : (
                      history.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="bg-surface-container-low p-4 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group"
                          onClick={() => {
                            setDisplay(item.result);
                            setWaitingForOperand(true);
                            setShowHistory(false);
                          }}
                        >
                          <div className="text-[10px] font-bold text-on-surface-variant mb-1">{item.expression} =</div>
                          <div className="text-lg font-extrabold flex justify-between items-center">
                            <span>{item.result}</span>
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="mt-4 w-full py-3 border border-outline-variant/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors"
                  >
                    Back to Calculator
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-surface-container-low p-6 rounded-2xl text-right">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      {operator ? `${prevValue} ${operator}` : 'Quick Calculation'}
                    </div>
                    <div className="text-3xl font-extrabold tracking-tight truncate">
                      {display}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[7, 8, 9, '÷', 4, 5, 6, '×', 1, 2, 3, '-', 0, '.', 'C', '+'].map((btn, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          if (typeof btn === 'number') handleNumber(String(btn));
                          else if (btn === 'C') handleClear();
                          else if (btn === '.') handlePoint();
                          else handleOperator(btn as string);
                        }}
                        className={cn(
                          "h-12 rounded-xl text-sm font-bold transition-all active:scale-95",
                          typeof btn === 'number' || btn === '.' ? "bg-surface-container-low hover:bg-surface-container-high" : "bg-black/5 text-black hover:bg-black/10"
                        )}
                      >
                        {btn}
                      </button>
                    ))}
                    <button 
                      onClick={handleEqual}
                      className="h-12 rounded-xl col-span-4 bg-black text-white font-bold text-sm tracking-widest hover:bg-black/90 transition-all active:scale-95"
                    >
                      CALCULATE
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Screen Components ---

const OverviewScreen = ({ 
  transactions,
  onAddTransaction,
  selectedMonth,
  selectedYear,
  currencySymbol,
  debts,
  onUpdateDebts,
  networkBalance,
  networkReceived,
  networkSent
}: { 
  transactions: Transaction[],
  onAddTransaction: (t: Omit<Transaction, 'id' | 'icon'>) => void,
  selectedMonth: string,
  selectedYear: string,
  currencySymbol: string,
  debts: Debt[],
  onUpdateDebts: (debts: Debt[]) => void,
  networkBalance: number,
  networkReceived: number,
  networkSent: number
}) => {
  const [isAdding, setIsAdding] = useState<'received' | 'sent' | null>(null);
  const [isEditingDebts, setIsEditingDebts] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [editDebts, setEditDebts] = useState<Debt[]>(debts);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  const received = transactions.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0) + networkReceived;
  const sent = transactions.filter(t => t.type === 'sent').reduce((sum, t) => sum + Math.abs(t.amount), 0) + networkSent;
  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0) + networkBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount) return;

    // Create a date object for the selected month and year
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const date = new Date(parseInt(selectedYear), monthIndex, 15); // Use 15th as default day

    onAddTransaction({
      name: newName,
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      fullDate: date,
      category: newCategory,
      amount: isAdding === 'sent' ? -Number(newAmount) : Number(newAmount),
      type: isAdding as 'received' | 'sent'
    });

    setIsAdding(null);
    setNewName('');
    setNewAmount('');
    setNewCategory('General');
  };

  const handleSaveDebts = () => {
    onUpdateDebts(editDebts);
    setIsEditingDebts(false);
  };

  const updateDebt = (id: number, field: keyof Debt, value: any) => {
    setEditDebts(prev => prev.map(d => {
      if (d.id === id) {
        const initials = field === 'name' ? value.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : d.initials;
        return { ...d, [field]: value, initials };
      }
      return d;
    }));
  };

  const addDebt = () => {
    const newDebt: Debt = {
      id: Date.now(),
      name: 'New Person',
      status: 'Owes You',
      amount: 0,
      initials: 'NP',
      color: 'bg-white border border-outline-variant'
    };
    setEditDebts(prev => [...prev, newDebt]);
  };

  const removeDebt = (id: number) => {
    setEditDebts(prev => prev.filter(d => d.id !== id));
  };

  const handleSettleAll = () => {
    onUpdateDebts(debts.map(d => ({ ...d, amount: 0 })));
    setIsSettling(false);
  };

  return (
    <div className="space-y-8">
      {/* Portfolio Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-neutral-900 to-neutral-800 p-12 text-white">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-end gap-10">
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-white/50">Total Balance Value</span>
            <h2 className="text-6xl font-extrabold tracking-tight leading-none">{currencySymbol} {totalBalance.toLocaleString()}</h2>
            <div className="flex items-center gap-2 text-white/70 font-semibold text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Calculated from all activities</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-bold text-sm transition-all">
              Download Report
            </button>
            <button className="px-8 py-3 bg-white text-black hover:bg-gray-100 rounded-full font-bold text-sm transition-all shadow-xl shadow-black/20">
              Invest More
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            {/* Money Received */}
            <div 
              onClick={() => setIsAdding('received')}
              className="bg-white p-8 rounded-[2rem] border border-outline-variant/30 hover:shadow-md transition-shadow group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-black" />
                </div>
              </div>
              <div className="mt-8 space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Money Received</span>
                <div className="text-3xl font-extrabold">{currencySymbol} {received.toLocaleString()}</div>
              </div>
            </div>
            {/* Money Sent */}
            <div 
              onClick={() => setIsAdding('sent')}
              className="bg-white p-8 rounded-[2rem] border border-outline-variant/30 hover:shadow-md transition-shadow group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-black" />
                </div>
              </div>
              <div className="mt-8 space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Money Sent</span>
                <div className="text-3xl font-extrabold">{currencySymbol} {sent.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Add Activity Modal */}
          <AnimatePresence>
            {isAdding && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAdding(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold tracking-tight">Add {isAdding === 'received' ? 'Income' : 'Expense'}</h3>
                    <button onClick={() => setIsAdding(null)} className="p-2 hover:bg-surface-container-low rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Description</label>
                      <input 
                        type="text" 
                        required
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Salary, Rent, Coffee"
                        className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-black/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Amount ({currencySymbol})</label>
                      <input 
                        type="number" 
                        required
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-black/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
                      <select 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-black/10"
                      >
                        <option>General</option>
                        <option>Investment</option>
                        <option>Tech & Gadgets</option>
                        <option>Dining</option>
                        <option>Rent</option>
                        <option>Salary</option>
                      </select>
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-4 bg-black text-white rounded-xl font-bold text-sm tracking-widest hover:bg-black/90 transition-all active:scale-95 mt-4"
                    >
                      ADD ACTIVITY
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Recent Transactions */}
          <div className="bg-white p-8 rounded-[2rem] border border-outline-variant/30">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold tracking-tight">Recent Activities</h3>
              <button className="text-[10px] font-bold uppercase tracking-widest hover:underline text-on-surface-variant">View All</button>
            </div>
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="py-12 text-center opacity-30">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No activities yet</p>
                </div>
              ) : (
                transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-white transition-colors">
                        <t.icon className="w-5 h-5 text-on-surface-variant" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t.name}</p>
                        <p className="text-[11px] text-on-surface-variant font-medium">{t.date} • {t.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold text-sm", t.type === 'received' ? "text-emerald-600" : "text-black")}>
                        {t.type === 'received' ? '+' : '-'} {currencySymbol} {Math.abs(t.amount).toLocaleString()}
                      </p>
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", t.type === 'received' ? "text-emerald-500" : "text-on-surface-variant")}>
                        {t.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Debts Sidebar */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low/50 p-8 rounded-[2rem] flex flex-col border border-outline-variant/20">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-lg font-bold tracking-tight">Who Owes Who</h3>
            <button 
              onClick={() => {
                setEditDebts(debts);
                setIsEditingDebts(true);
              }}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            >
              <Settings className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
          <div className="space-y-8 flex-1">
            {debts.map((d) => (
              <div key={d.id} className="flex items-center gap-4">
                <div className={cn("h-11 w-11 rounded-full flex items-center justify-center text-[10px] font-bold", d.color)}>
                  {d.initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{d.name}</p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{d.status}</p>
                </div>
                <div className={cn("text-sm font-extrabold", d.status === 'You Owe' ? "text-red-600" : "text-black")}>
                  {currencySymbol} {d.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsSettling(true)}
            className="w-full mt-10 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/90 transition-all active:scale-95 shadow-lg shadow-black/10"
          >
            Settle All Debts
          </button>
        </div>
      </div>

      {/* Edit Debts Modal */}
      <AnimatePresence>
        {isEditingDebts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingDebts(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Edit Debts & Credits</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={addDebt}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </button>
                  <button onClick={() => setIsEditingDebts(false)} className="p-2 hover:bg-surface-container-low rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-8">
                {editDebts.map((d) => (
                  <div key={d.id} className="p-6 bg-surface-container-low rounded-2xl space-y-4 relative group/debt">
                    <button 
                      onClick={() => removeDebt(d.id)}
                      className="absolute top-2 right-2 p-2 text-on-surface-variant hover:text-red-600 opacity-0 group-hover/debt:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</label>
                        <input 
                          type="text" 
                          value={d.name}
                          onChange={(e) => updateDebt(d.id, 'name', e.target.value)}
                          className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                        <select 
                          value={d.status}
                          onChange={(e) => updateDebt(d.id, 'status', e.target.value)}
                          className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                        >
                          <option value="Owes You">Owes You</option>
                          <option value="You Owe">You Owe</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Amount ({currencySymbol})</label>
                        <input 
                          type="number" 
                          value={d.amount}
                          onChange={(e) => updateDebt(d.id, 'amount', Number(e.target.value))}
                          className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setIsEditingDebts(false)}
                  className="flex-1 py-4 border border-outline-variant/30 rounded-xl font-bold text-sm tracking-widest hover:bg-surface-container-low transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSaveDebts}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-bold text-sm tracking-widest hover:bg-black/90 transition-all active:scale-95"
                >
                  SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settle All Confirmation Modal */}
      <AnimatePresence>
        {isSettling && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettling(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Settle All Debts?</h3>
              <p className="text-sm text-on-surface-variant font-medium mb-8">
                This will set the amount for all your debts and credits to zero. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsSettling(false)}
                  className="flex-1 py-3 border border-outline-variant/30 rounded-xl font-bold text-xs tracking-widest hover:bg-surface-container-low transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSettleAll}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                  SETTLE ALL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnalyticsScreen = ({ 
  transactions, 
  currencySymbol,
  networkBalance
}: { 
  transactions: Transaction[], 
  currencySymbol: string,
  networkBalance: number
}) => {
  const chartData = useMemo(() => {
    const weeks = ['W1', 'W2', 'W3', 'W4'];
    return weeks.map((w, index) => {
      // Group transactions by week (1-7, 8-14, 15-21, 22+)
      const weekTransactions = transactions.filter(t => {
        const day = t.fullDate.getDate();
        if (index === 0) return day <= 7;
        if (index === 1) return day > 7 && day <= 14;
        if (index === 2) return day > 14 && day <= 21;
        return day > 21;
      });

      const income = weekTransactions.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
      const expenses = weekTransactions.filter(t => t.type === 'sent').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      return {
        name: w,
        income,
        expenses
      };
    });
  }, [transactions]);

  const savingsData = useMemo(() => {
    // Calculate cumulative balance over weeks for the current view
    let cumulative = networkBalance;
    const weeks = ['W1', 'W2', 'W3', 'W4'];
    return weeks.map((w, index) => {
      const weekTransactions = transactions.filter(t => {
        const day = t.fullDate.getDate();
        if (index === 0) return day <= 7;
        if (index === 1) return day > 7 && day <= 14;
        if (index === 2) return day > 14 && day <= 21;
        return day > 21;
      });
      
      const weekNet = weekTransactions.reduce((sum, t) => sum + t.amount, 0);
      cumulative += weekNet;
      return { name: w, value: cumulative };
    });
  }, [transactions]);

  const totalSavings = transactions.reduce((sum, t) => sum + t.amount, 0) + networkBalance;

  return (
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-5xl font-extrabold tracking-tight mb-4">Financial Performance</h2>
          <p className="text-on-surface-variant text-lg max-w-lg">
            {transactions.length > 0 
              ? "Analytics are generated in real-time based on your transaction activities."
              : "Add transactions in the Dashboard to see your financial performance analytics."}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Cash Flow Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] p-8 border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-bold mb-1">Cash Flow Dynamics</h3>
              <p className="text-sm text-on-surface-variant">Weekly breakdown of your activities</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-black" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="income" fill="#000000" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="#a3a3a3" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Growth */}
        <div className="col-span-12 lg:col-span-4 bg-black text-white rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">Savings Growth</h3>
            <p className="text-white/60 text-sm">Cumulative balance</p>
          </div>
          <div className="mt-8 relative z-10">
            <div className="text-4xl font-extrabold tracking-tighter">{currencySymbol}{totalSavings.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Real-time tracking</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low rounded-[2rem] p-8">
          <h3 className="text-lg font-bold mb-6">Asset Allocation</h3>
          <div className="space-y-6">
            {[
              { label: 'Equities', value: 65, color: 'bg-black', icon: Wallet },
              { label: 'Real Estate', value: 20, color: 'bg-neutral-400', icon: ShoppingBag },
              { label: 'Crypto & Alts', value: 15, color: 'bg-neutral-200', icon: TrendingUp },
            ].map((asset, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", asset.color === 'bg-black' ? "text-white" : "text-black", asset.color)}>
                  <asset.icon className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between text-sm font-bold mb-1">
                    <span>{asset.label}</span>
                    <span>{asset.value}%</span>
                  </div>
                  <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", asset.color)} style={{ width: `${asset.value}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expert Insight */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-[2rem] p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-black text-white text-[9px] font-bold rounded-full mb-4 tracking-widest uppercase">Expert Insight</div>
              <h4 className="text-2xl font-bold mb-4">
                {totalSavings > 0 ? "You're building a solid foundation." : "Start your financial journey today."}
              </h4>
              <p className="text-on-surface-variant leading-relaxed text-sm">
                {totalSavings > 0 
                  ? `Based on your current performance, your projected capital is growing. Keep adding activities to refine your long-term wealth strategy.`
                  : "Add your first transaction to see real-time insights and projections for your financial future."}
              </p>
              <div className="mt-8 flex gap-4">
                <button className="px-6 py-3 bg-black text-white rounded-full text-xs font-bold hover:scale-105 transition-transform duration-200">View Strategy</button>
                <button className="px-6 py-3 text-black text-xs font-bold border-b-2 border-transparent hover:border-black transition-all">Full Report</button>
              </div>
            </div>
            <div className="hidden md:flex w-48 items-center justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-[12px] border-black/5 rounded-full" />
                <div className="absolute inset-0 border-[12px] border-black border-t-transparent border-r-transparent rounded-full rotate-45" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PortfolioScreen = ({ 
  transactions, 
  currencySymbol,
  profile,
  nodes,
  onUpdateNodes,
  selectedMonth,
  networkBalance
}: { 
  transactions: Transaction[], 
  currencySymbol: string,
  profile: Profile,
  nodes: NetworkNode[],
  onUpdateNodes: (nodes: NetworkNode[]) => void,
  selectedMonth: string,
  networkBalance: number
}) => {
  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0) + networkBalance;
  const activeNodes = transactions.length > 0 ? Math.ceil(transactions.length / 2) : 0;
  const [isEditing, setIsEditing] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [editNodes, setEditNodes] = useState<NetworkNode[]>(nodes);

  const userInitials = useMemo(() => {
    return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [profile.name]);

  const handleSave = () => {
    onUpdateNodes(editNodes);
    setIsEditing(false);
  };

  const addNode = () => {
    const newNode: NetworkNode = {
      id: `node-${Date.now()}`,
      name: 'New Partner',
      tier: 'Tier 1 Partner',
      net: 0,
      initials: 'NP',
      received: '0',
      sent: '0',
      timestamp: selectedMonth === 'March' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
    };
    setEditNodes(prev => [...prev, newNode]);
  };

  const removeNode = (id: string) => {
    setEditNodes(prev => prev.filter(n => n.id !== id));
  };

  const addSubNode = (parentId: string) => {
    setEditNodes(prev => prev.map(node => {
      if (node.id === parentId) {
        const newSubNode = {
          id: `sub-${Date.now()}`,
          name: 'New Sub-Node',
          net: 0,
          initials: 'NS',
          trend: 'flat',
          timestamp: selectedMonth === 'March' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        };
        return {
          ...node,
          children: [...(node.children || []), newSubNode]
        };
      }
      return node;
    }));
    // Automatically expand the parent node to show the new sub-node
    if (!expandedNodes.includes(parentId)) {
      setExpandedNodes(prev => [...prev, parentId]);
    }
  };

  const removeSubNode = (parentId: string, childId: string) => {
    setEditNodes(prev => prev.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: node.children?.filter(c => c.id !== childId)
        };
      }
      return node;
    }));
  };

  const updateNode = (id: string, field: string, value: any, parentId?: string) => {
    setEditNodes(prev => prev.map(node => {
      if (parentId && node.id === parentId) {
        return {
          ...node,
          children: node.children?.map(child => {
            if (child.id === id) {
              const updatedChild = { ...child, [field]: value };
              if (field === 'received' || field === 'sent') {
                updatedChild.net = Number(updatedChild.received || 0) - Number(updatedChild.sent || 0);
                updatedChild.trend = updatedChild.net >= 0 ? 'up' : 'down';
                if (selectedMonth === 'March') {
                  updatedChild.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
              if (field === 'name') {
                updatedChild.initials = value.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              }
              return updatedChild;
            }
            return child;
          })
        };
      }
      if (node.id === id) {
        const updatedNode = { ...node, [field]: value };
        if (field === 'received' || field === 'sent') {
          updatedNode.net = Number(updatedNode.received || 0) - Number(updatedNode.sent || 0);
          if (selectedMonth === 'March') {
            updatedNode.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
        if (field === 'name') {
          updatedNode.initials = value.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return updatedNode;
      }
      return node;
    }));
  };

  const toggleNodeExpansion = (id: string) => {
    setExpandedNodes(prev => 
      prev.includes(id) ? prev.filter(nodeId => nodeId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-12">
      <section className="space-y-2">
        <p className="uppercase text-[10px] tracking-[0.3em] text-on-surface-variant font-extrabold">Network Hierarchy</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h2 className="text-5xl font-extrabold tracking-tight">Network Distribution</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setEditNodes(nodes);
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 border border-outline-variant/30 rounded-xl text-xs font-bold hover:bg-black hover:text-white transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Partners</span>
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Edit Network Partners</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={addNode}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Partner</span>
                  </button>
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-surface-container-low rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-8">
                {editNodes.map((node) => (
                  <div key={node.id} className="space-y-4">
                    <div className="p-6 bg-surface-container-low rounded-2xl space-y-4 relative group/node">
                      <button 
                        onClick={() => removeNode(node.id)}
                        className="absolute top-2 right-2 p-2 text-on-surface-variant hover:text-red-600 opacity-0 group-hover/node:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Primary Node</span>
                          <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-bold">{node.initials}</div>
                          {node.timestamp && (
                            <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">Added: {node.timestamp}</span>
                          )}
                        </div>
                        {node.children && node.children.length > 0 && (
                          <button 
                            onClick={() => toggleNodeExpansion(node.id)}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-black transition-colors"
                          >
                            <span>{expandedNodes.includes(node.id) ? 'Hide' : 'Show'} Sub-Nodes</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", expandedNodes.includes(node.id) && "rotate-180")} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Partner Name</label>
                          <input 
                            type="text" 
                            value={node.name}
                            onChange={(e) => updateNode(node.id, 'name', e.target.value)}
                            className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tier / Role</label>
                          <input 
                            type="text" 
                            value={node.tier || ''}
                            onChange={(e) => updateNode(node.id, 'tier', e.target.value)}
                            className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Received</label>
                          <input 
                            type="number" 
                            value={node.received || ''}
                            onChange={(e) => updateNode(node.id, 'received', e.target.value)}
                            className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sent</label>
                          <input 
                            type="number" 
                            value={node.sent || ''}
                            onChange={(e) => updateNode(node.id, 'sent', e.target.value)}
                            className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-black/10"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-black text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          Net: {currencySymbol}{node.net.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedNodes.includes(node.id) && node.children && node.children.length > 0 && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-12 space-y-4 relative overflow-hidden"
                        >
                          <div className="absolute left-[-24px] top-0 bottom-0 w-px bg-outline-variant/30" />
                          {node.children.map((child) => (
                            <div key={child.id} className="relative p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10 group/subnode">
                              <button 
                                onClick={() => removeSubNode(node.id, child.id)}
                                className="absolute top-1 right-1 p-1.5 text-on-surface-variant hover:text-red-600 opacity-0 group-hover/subnode:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="absolute left-[-24px] top-1/2 w-6 h-px bg-outline-variant/30" />
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-black/30">Sub-Node</span>
                                  <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[8px] font-bold">{child.initials}</div>
                                  {child.timestamp && (
                                    <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">Added: {child.timestamp}</span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Name</label>
                                  <input 
                                    type="text" 
                                    value={child.name}
                                    onChange={(e) => updateNode(child.id, 'name', e.target.value, node.id)}
                                    className="w-full bg-white border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-black/10"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Received</label>
                                  <input 
                                    type="number" 
                                    value={child.received || ''}
                                    onChange={(e) => updateNode(child.id, 'received', e.target.value, node.id)}
                                    className="w-full bg-white border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-black/10"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Sent</label>
                                  <input 
                                    type="number" 
                                    value={child.sent || ''}
                                    onChange={(e) => updateNode(child.id, 'sent', e.target.value, node.id)}
                                    className="w-full bg-white border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-black/10"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end mt-2">
                                <div className="bg-surface-container-high text-black px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border border-outline-variant/20">
                                  Net: {currencySymbol}{child.net.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="ml-12">
                      <button 
                        onClick={() => addSubNode(node.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-outline-variant/50 rounded-xl text-[9px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Sub-Node</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 border border-outline-variant/30 rounded-xl font-bold text-sm tracking-widest hover:bg-surface-container-low transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-bold text-sm tracking-widest hover:bg-black/90 transition-all active:scale-95"
                >
                  SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-4">
        <div className="bg-white border border-outline-variant/30 px-8 py-6 rounded-2xl flex flex-col min-w-[200px] shadow-sm">
          <span className="uppercase tracking-widest text-on-surface-variant text-[9px] font-bold mb-1">Total Balance Value</span>
          <span className="text-3xl font-extrabold tracking-tighter">{currencySymbol} {totalBalance.toLocaleString()}</span>
        </div>
        <div className="bg-white border border-outline-variant/30 px-8 py-6 rounded-2xl flex flex-col min-w-[200px] shadow-sm">
          <span className="uppercase tracking-widest text-on-surface-variant text-[9px] font-bold mb-1">Active Nodes</span>
          <span className="text-3xl font-extrabold tracking-tighter">{activeNodes}</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Master Node */}
        <div className="bg-black text-white p-6 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full border border-white/20 bg-white/5 flex items-center justify-center font-bold text-lg">{userInitials}</div>
            <div>
              <h3 className="font-bold text-xl tracking-tight">{profile.name} (You)</h3>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Master Portfolio Holder</span>
            </div>
          </div>
          <div className="flex items-center gap-12">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Net Balance</p>
              <p className="text-2xl font-extrabold tracking-tighter">{currencySymbol} {totalBalance.toLocaleString()}</p>
            </div>
            <ChevronDown className="w-6 h-6 text-white/30" />
          </div>
        </div>

        {/* Network Tree */}
        <div className="ml-14 space-y-6 relative">
          <div className="absolute left-[-28px] top-0 bottom-0 w-px bg-outline-variant/30" />
          
          {nodes.map((node) => (
            <div key={node.id} className="relative">
              <div className="absolute left-[-28px] top-8 w-7 h-px bg-outline-variant/30" />
              <div 
                onClick={() => node.children && node.children.length > 0 && toggleNodeExpansion(node.id)}
                className={cn(
                  "bg-white border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all cursor-pointer",
                  node.faded ? "opacity-60 grayscale" : "hover:border-black/20",
                  node.active && "border-l-4 border-l-black",
                  expandedNodes.includes(node.id) && "border-black/20 shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center font-bold border border-outline-variant/30">
                    {node.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-black tracking-tight">{node.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[9px] tracking-[0.2em] font-bold text-on-surface-variant">{node.tier}</span>
                      {node.timestamp && (
                        <span className="text-[8px] font-bold text-black/30 bg-black/5 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          {node.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                  {node.children && node.children.length > 0 && (
                    <ChevronDown className={cn("w-4 h-4 text-on-surface-variant transition-transform duration-300", expandedNodes.includes(node.id) && "rotate-180")} />
                  )}
                </div>
                <div className="flex gap-10 items-center">
                  {node.received && (
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-on-surface-variant font-bold tracking-widest mb-0.5">Received</p>
                      <p className="text-sm font-bold">{currencySymbol}{node.received}</p>
                    </div>
                  )}
                  {node.sent && (
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-on-surface-variant font-bold tracking-widest mb-0.5">Sent</p>
                      <p className="text-sm font-bold">{currencySymbol}{node.sent}</p>
                    </div>
                  )}
                  <div className={cn("px-4 py-2 rounded-xl min-w-[120px]", node.faded ? "bg-surface-container-low" : "bg-black text-white")}>
                    <p className="text-[8px] uppercase font-bold tracking-[0.2em] opacity-50 mb-0.5">Net Position</p>
                    <p className="text-sm font-extrabold tracking-tight">
                      {node.net > 0 ? '+' : ''}{currencySymbol}{node.net.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedNodes.includes(node.id) && node.children && node.children.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-12 mt-6 space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute left-[-28px] top-0 bottom-0 w-px bg-outline-variant/30" />
                    {node.children.map((child) => (
                      <div key={child.id} className="relative">
                        <div className="absolute left-[-28px] top-6 w-7 h-px bg-outline-variant/30" />
                        <div className="bg-white border border-outline-variant/30 p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-low transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                              {child.initials}
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">{child.name}</p>
                              {child.timestamp && (
                                <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest">
                                  Added at {child.timestamp}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            {child.received && (
                              <div className="text-right hidden md:block">
                                <p className="text-[8px] uppercase text-on-surface-variant font-bold tracking-widest">Received</p>
                                <p className="text-xs font-bold">{currencySymbol}{child.received}</p>
                              </div>
                            )}
                            {child.sent && (
                              <div className="text-right hidden md:block">
                                <p className="text-[8px] uppercase text-on-surface-variant font-bold tracking-widest">Sent</p>
                                <p className="text-xs font-bold">{currencySymbol}{child.sent}</p>
                              </div>
                            )}
                            <div className="text-right">
                              <p className="text-[8px] uppercase text-on-surface-variant font-bold tracking-widest">Net Balance</p>
                              <p className="text-sm font-bold">{currencySymbol}{child.net.toLocaleString()}</p>
                            </div>
                            {child.trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-neutral-300" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = ({ 
  profile: globalProfile, 
  onSaveProfile 
}: { 
  profile: Profile, 
  onSaveProfile: (p: Profile) => void 
}) => {
  const [toggles, setToggles] = useState({ market: true, weekly: true, trans: false });
  const [localProfile, setLocalProfile] = useState<Profile>(globalProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const currencies = [
    'USD - US Dollar',
    'EUR - Euro',
    'GBP - British Pound',
    'INR - Indian Rupee',
    'JPY - Japanese Yen',
    'AUD - Australian Dollar',
    'CAD - Canadian Dollar',
    'CHF - Swiss Franc',
    'CNY - Chinese Yuan',
    'AED - UAE Dirham'
  ];

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      onSaveProfile(localProfile);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="space-y-12">
      <section className="space-y-2">
        <h2 className="text-5xl font-extrabold tracking-tight">Settings</h2>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">Manage your premium wealth account, update security protocols, and configure your personalized financial feed.</p>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Profile Section */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] p-8 border border-outline-variant/30 shadow-sm relative">
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 right-8 bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg z-10"
              >
                <CheckCircle2 className="w-3 h-3" /> Changes Saved Successfully
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold mb-1">Edit Profile</h3>
              <p className="text-sm text-on-surface-variant">Personalize your identity and contact methods.</p>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "bg-black text-white px-8 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2",
                isSaving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
              )}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Full Name</label>
                <input 
                  type="text" 
                  value={localProfile.name}
                  onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Email Address</label>
                <input 
                  type="email" 
                  value={localProfile.email}
                  onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-1 focus:ring-black/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Phone Number</label>
                <div className="flex gap-3">
                  <select 
                    value={localProfile.countryCode}
                    onChange={(e) => setLocalProfile({ ...localProfile, countryCode: e.target.value })}
                    className="bg-surface-container-low border-none rounded-xl px-3 py-3 text-sm font-bold focus:ring-1 focus:ring-black/10 appearance-none cursor-pointer w-28"
                  >
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.country})</option>)}
                  </select>
                  <input 
                    type="tel" 
                    value={localProfile.phone}
                    onChange={(e) => setLocalProfile({ ...localProfile, phone: e.target.value })}
                    className="flex-1 bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-1 focus:ring-black/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Primary Currency</label>
                <select 
                  value={localProfile.currency}
                  onChange={(e) => setLocalProfile({ ...localProfile, currency: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-1 focus:ring-black/10 appearance-none cursor-pointer"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Banking Integration */}
        <section className="col-span-12 lg:col-span-4 bg-black text-white rounded-[2rem] p-8 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3 leading-tight">Financial Connectivity</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">Securely link your global bank accounts to enable real-time portfolio tracking and automated rebalancing.</p>
          </div>
          <button className="w-full bg-white text-black py-4 rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all">
            Link New Account
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        {/* Security Protocols */}
        <section className="col-span-12 lg:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
          <h3 className="text-xl font-bold mb-6">Security Protocols</h3>
          <div className="space-y-4">
            {[
              { label: 'Update Password', sub: 'Last changed 3 months ago', icon: Lock },
              { label: 'Two-Factor Authentication', sub: 'Currently Enabled (SMS)', icon: Shield },
              { label: 'Active Sessions', sub: '3 devices logged in', icon: Smartphone },
            ].map((item, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <item.icon className="w-5 h-5 text-black" />
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant" />
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="col-span-12 lg:col-span-6 bg-surface-container-low rounded-[2rem] p-8 relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Preferences</h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-on-surface-variant cursor-help" />
              <div className="absolute right-0 top-6 w-48 bg-black text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                These settings control your automated financial reports and real-time alert systems.
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {[
              { id: 'market', label: 'Market Volatility Alerts', sub: 'Push notifications for >2% portfolio swings' },
              { id: 'weekly', label: 'Weekly Wealth Summary', sub: 'Receive editorial reports via email' },
              { id: 'trans', label: 'Transaction Confirmations', sub: 'Instant alerts for all outgoing funds' },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="max-w-[70%]">
                  <p className="font-bold text-sm">{pref.label}</p>
                  <p className="text-[11px] text-on-surface-variant font-medium">{pref.sub}</p>
                </div>
                <button 
                  onClick={() => {
                    setToggles(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof toggles] }));
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    toggles[pref.id as keyof typeof toggles] ? "bg-black" : "bg-neutral-300"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    toggles[pref.id as keyof typeof toggles] ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const SupportScreen = ({ currencySymbol, onOpenChat }: { currencySymbol: string, onOpenChat: () => void }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    { id: 1, q: 'How long do international wire transfers take?', a: 'International wire transfers typically take 1-3 business days depending on the destination and intermediary banks.' },
    { id: 2, q: 'What are the daily withdrawal limits for my tier?', a: `Daily withdrawal limits vary by account tier. For Tier 1 partners, the current limit is ${currencySymbol}50,000 per day.` },
    { id: 3, q: 'Setting up multi-factor authentication (MFA)', a: 'To enable MFA, go to Settings > Security. We support SMS-based codes and authenticator apps.' },
  ];

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h2 className="text-6xl font-extrabold tracking-tighter">Support Center</h2>
        <p className="text-xl text-on-surface-variant max-w-2xl leading-relaxed">
          Personalized assistance for your financial journey. Find answers, chat with experts, or manage your security protocols.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div 
          onClick={onOpenChat}
          className="bg-black text-white p-8 rounded-[2rem] flex flex-col justify-between h-64 hover:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden group"
        >
          <div className="relative z-10">
            <MessageSquare className="w-10 h-10 mb-4 text-white" />
            <h3 className="text-2xl font-bold">Live Chat</h3>
            <p className="text-white/60 text-sm mt-2">Typical response time: &lt; 20 mins</p>
          </div>
          <div className="relative z-10 flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
            Start Conversation <ArrowRight className="w-4 h-4" />
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
        </div>

        <div className="bg-surface-container-low p-8 rounded-[2rem] flex flex-col justify-between h-64 hover:bg-surface-container-high transition-colors cursor-pointer">
          <div>
            <Mail className="w-10 h-10 mb-4 text-black" />
            <h3 className="text-2xl font-bold">Email Support</h3>
            <p className="text-on-surface-variant text-sm mt-2">For detailed inquiries and documentation.</p>
          </div>
          <div className="flex items-center gap-2 font-bold text-sm text-black">
            support@vrixfinance.com 
            <Copy className="w-4 h-4 text-on-surface-variant" />
          </div>
        </div>
      </div>

      <section className="flex flex-col md:flex-row gap-16 pt-12">
        <div className="w-full md:w-1/3 space-y-6">
          <h3 className="text-3xl font-bold">Frequently Asked Questions</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Most concerns can be resolved quickly by browsing our documentation categorized by topic.
          </p>
          <div className="p-1.5 bg-surface-container-low rounded-full inline-flex gap-2">
            <button className="px-6 py-2 bg-white rounded-full shadow-sm text-xs font-bold">All Topics</button>
            <button className="px-6 py-2 text-xs font-bold text-on-surface-variant hover:text-black">Video Guides</button>
          </div>
        </div>
        <div className="w-full md:w-2/3 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="bg-white border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                className="w-full flex justify-between items-center p-6 text-left hover:bg-surface-container-low transition-colors"
              >
                <span className="font-bold text-lg">{faq.q}</span>
                <ChevronDown className={cn("w-5 h-5 text-on-surface-variant transition-transform", activeFaq === faq.id && "rotate-180")} />
              </button>
              <AnimatePresence>
                {activeFaq === faq.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <div className="pt-4 border-t border-outline-variant/30 text-on-surface-variant text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-high rounded-[3rem] p-16 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h3 className="text-4xl font-extrabold tracking-tight">Didn't find what you were looking for?</h3>
          <p className="text-on-surface-variant text-lg">Our specialized advisors are available to help you with complex wealth management questions.</p>
          <button className="bg-black text-white px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-xl shadow-black/10">
            Schedule an Advisory Call
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 blur-2xl rounded-full translate-y-1/2 -translate-x-1/2" />
      </section>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>({ uid: 'demo-user', email: 'alex.morgan@executive.com' });
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [screen, setScreen] = useState<Screen>('overview');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Default to current month and year from runtime context
  const [selectedMonth, setSelectedMonth] = useState('March');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NETWORK_NODES);
  const [debts, setDebts] = useState<Debt[]>(INITIAL_DEBTS);

  const [profile, setProfile] = useState<Profile>({
    name: 'Alex Morgan',
    email: 'alex.morgan@executive.com',
    phone: '(555) 902-4821',
    countryCode: '+1',
    currency: 'INR - Indian Rupee'
  });

  // Auth Listener removed to bypass sign-in
  useEffect(() => {
    // Mocking auth readiness
    setIsAuthReady(true);
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = `users/${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Profile;
        setProfile(prev => ({ ...prev, ...data }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    // Test connection as per instructions
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleSignOut = async () => {
    // Sign out functionality disabled as auth page is removed
    console.log("Sign out requested in demo mode");
    setScreen('overview');
  };

  const saveProfile = async (newProfile: Profile) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, path), {
        ...newProfile,
        uid: user.uid
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const currencySymbol = useMemo(() => CURRENCY_SYMBOLS[profile.currency] || '₹', [profile.currency]);

  const { networkBalance, networkReceived, networkSent } = useMemo(() => {
    let balance = 0;
    let received = 0;
    let sent = 0;
    nodes.forEach(node => {
      balance += node.net;
      received += Number(node.received || 0);
      sent += Number(node.sent || 0);
      if (node.children) {
        node.children.forEach(child => {
          balance += child.net;
          received += Number(child.received || 0);
          sent += Number(child.sent || 0);
        });
      }
    });
    return { networkBalance: balance, networkReceived: received, networkSent: sent };
  }, [nodes]);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const m = t.fullDate.toLocaleDateString('en-US', { month: 'long' });
      const y = t.fullDate.getFullYear().toString();
      return m === selectedMonth && y === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const addTransaction = (t: Omit<Transaction, 'id' | 'icon'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Date.now(),
      icon: t.type === 'received' ? Wallet : ShoppingBag
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const screenTitle = useMemo(() => {
    switch(screen) {
      case 'overview': return 'Dashboard';
      case 'analytics': return 'Analytics';
      case 'portfolio': return 'Portfolio';
      case 'settings': return 'Settings';
      case 'support': return 'Support';
    }
  }, [screen]);

  // Scroll to top on screen change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface selection:bg-black selection:text-white">
        <Sidebar activeScreen={screen} setScreen={setScreen} onSignOut={handleSignOut} />
        <TopBar 
          title={screenTitle} 
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          profile={profile}
        />

        <main className="pl-64 pt-20">
          <div className="max-w-7xl mx-auto px-10 py-12">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {screen === 'overview' && (
                <OverviewScreen 
                  transactions={currentMonthTransactions}
                  onAddTransaction={addTransaction}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  currencySymbol={currencySymbol}
                  debts={debts}
                  onUpdateDebts={setDebts}
                  networkBalance={networkBalance}
                  networkReceived={networkReceived}
                  networkSent={networkSent}
                />
              )}
              {screen === 'analytics' && <AnalyticsScreen transactions={currentMonthTransactions} currencySymbol={currencySymbol} networkBalance={networkBalance} />}
              {screen === 'portfolio' && (
                <PortfolioScreen 
                  transactions={transactions} 
                  currencySymbol={currencySymbol} 
                  profile={profile}
                  nodes={nodes}
                  onUpdateNodes={setNodes}
                  selectedMonth={selectedMonth}
                  networkBalance={networkBalance}
                />
              )}
              {screen === 'settings' && <SettingsScreen profile={profile} onSaveProfile={saveProfile} />}
              {screen === 'support' && (
                <SupportScreen 
                  currencySymbol={currencySymbol} 
                  onOpenChat={() => setIsChatOpen(true)}
                />
              )}
            </motion.div>
          </div>

          {/* Footer */}
          <footer className="px-10 py-16 border-t border-outline-variant/10 flex justify-between items-center opacity-30 select-none">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-2xl tracking-tighter">Vrix Finance</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">© 2023 Wealth Management Systems</span>
            </div>
            <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span>London</span>
              <span>New York</span>
              <span>Singapore</span>
              <span>Tokyo</span>
            </div>
          </footer>
        </main>

        {/* Floating Calculator Trigger */}
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
          <button 
            onClick={() => setIsCalcOpen(true)}
            className="bg-black text-white p-3 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2 transition-all hover:pl-5 group"
          >
            <Calculator className="w-5 h-5" />
            <span className="[writing-mode:vertical-lr] text-[9px] font-bold uppercase tracking-widest py-3">Quick Calc</span>
          </button>
        </div>

        <CalculatorPanel isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
        {screen !== 'support' ? (
          <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
        ) : (
          isChatOpen && <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
        )}
      </div>
    </ErrorBoundary>
  );
}
