import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  DollarSign, 
  Percent, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  TrendingDown, 
  PieChart as PieChartIcon,
  Table as TableIcon,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

type Frequency = 'Monthly' | 'Bi-weekly' | 'Weekly';

interface AmortizationRow {
  paymentNumber: number;
  date: string;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  totalInterestPaid: number;
  remainingBalance: number;
}

// --- Helpers ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const getFrequencyMultiplier = (freq: Frequency) => {
  switch (freq) {
    case 'Monthly': return 12;
    case 'Bi-weekly': return 26;
    case 'Weekly': return 52;
    default: return 12;
  }
};

const getFrequencyLabel = (freq: Frequency) => {
  switch (freq) {
    case 'Monthly': return 'Month';
    case 'Bi-weekly': return 'Bi-week';
    case 'Weekly': return 'Week';
    default: return 'Month';
  }
};

// --- Components ---

const CurrencyInput = ({ value, onChange, className }: { value: number, onChange: (val: number) => void, className?: string }) => {
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());

  useEffect(() => {
    setDisplayValue(value.toLocaleString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = Number(rawValue);
    setDisplayValue(numValue.toLocaleString());
    onChange(numValue);
  };

  return (
    <input 
      type="text" 
      value={displayValue} 
      onChange={handleChange}
      className={cn("w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium", className)}
    />
  );
};

const InputGroup = ({ label, icon: Icon, children, helperText }: { label: string, icon?: any, children: React.ReactNode, helperText?: string }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      {label}
    </label>
    {children}
    {helperText && <p className="text-xs text-slate-400">{helperText}</p>}
  </div>
);

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default function App() {
  // --- State ---
  const [homePrice, setHomePrice] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.75);
  const [loanTerm, setLoanTerm] = useState(30);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Additional Costs
  const [showAdditionalCosts, setShowAdditionalCosts] = useState(false);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.2); // Annual %
  const [propertyTaxAmount, setPropertyTaxAmount] = useState(4800); // Annual $
  const [isTaxPercent, setIsTaxPercent] = useState(true);
  const [homeInsurance, setHomeInsurance] = useState(1200); // Annual $
  const [hoaFees, setHoaFees] = useState(0); // Monthly $
  const [pmiRate, setPmiRate] = useState(0.5); // Annual %
  const [overridePmi, setOverridePmi] = useState(false);

  // Extra Payments
  const [showExtraPayments, setShowExtraPayments] = useState(false);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState(0);

  // Amortization Table Toggle
  const [showAllAmortization, setShowAllAmortization] = useState(false);

  // --- Handlers ---
  const handleHomePriceChange = (val: number) => {
    setHomePrice(val);
    const newDownPayment = (val * downPaymentPercent) / 100;
    setDownPayment(newDownPayment);
    if (isTaxPercent) {
      setPropertyTaxAmount((val * propertyTaxRate) / 100);
    }
  };

  const handleDownPaymentChange = (val: number) => {
    setDownPayment(val);
    setDownPaymentPercent((val / homePrice) * 100);
  };

  const handleDownPaymentPercentChange = (val: number) => {
    setDownPaymentPercent(val);
    setDownPayment(homePrice * (val / 100));
  };

  const handleTaxRateChange = (val: number) => {
    setPropertyTaxRate(val);
    setPropertyTaxAmount((homePrice * val) / 100);
  };

  const handleTaxAmountChange = (val: number) => {
    setPropertyTaxAmount(val);
    setPropertyTaxRate((val / homePrice) * 100);
  };

  // --- Calculations ---
  const loanAmount = useMemo(() => homePrice - downPayment, [homePrice, downPayment]);
  const ltv = useMemo(() => (loanAmount / homePrice) * 100, [loanAmount, homePrice]);
  
  const pmiEnabled = useMemo(() => {
    if (overridePmi) return true;
    return ltv > 80;
  }, [ltv, overridePmi]);

  const calculations = useMemo(() => {
    const freqMultiplier = getFrequencyMultiplier(frequency);
    const periodicRate = interestRate / freqMultiplier / 100;
    const totalPayments = loanTerm * freqMultiplier;

    // Principal + Interest
    let piPayment = 0;
    if (periodicRate === 0) {
      piPayment = loanAmount / totalPayments;
    } else {
      piPayment = loanAmount * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) / (Math.pow(1 + periodicRate, totalPayments) - 1);
    }

    // Additional Costs per period
    const taxPerPeriod = propertyTaxAmount / freqMultiplier;
    const insurancePerPeriod = homeInsurance / freqMultiplier;
    const hoaPerPeriod = frequency === 'Monthly' ? hoaFees : (hoaFees * 12) / freqMultiplier;
    const pmiPerPeriod = pmiEnabled ? (loanAmount * (pmiRate / 100)) / freqMultiplier : 0;

    const totalPeriodicPayment = piPayment + taxPerPeriod + insurancePerPeriod + hoaPerPeriod + pmiPerPeriod;

    // Amortization Schedule
    const schedule: AmortizationRow[] = [];
    const extraSchedule: AmortizationRow[] = [];
    
    let balance = loanAmount;
    let totalInterest = 0;
    let currentDate = new Date(startDate + '-01');

    for (let i = 1; i <= totalPayments; i++) {
      const interest = balance * periodicRate;
      const principal = piPayment - interest;
      totalInterest += interest;
      balance -= principal;

      schedule.push({
        paymentNumber: i,
        date: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        paymentAmount: piPayment,
        principalPaid: principal,
        interestPaid: interest,
        totalInterestPaid: totalInterest,
        remainingBalance: Math.max(0, balance),
      });

      // Update date for next payment
      if (frequency === 'Monthly') currentDate.setMonth(currentDate.getMonth() + 1);
      else if (frequency === 'Bi-weekly') currentDate.setDate(currentDate.getDate() + 14);
      else if (frequency === 'Weekly') currentDate.setDate(currentDate.getDate() + 7);
    }

    // Extra Payments Schedule
    let extraBalance = loanAmount;
    let extraTotalInterest = 0;
    let extraCurrentDate = new Date(startDate + '-01');
    let extraMonthsSaved = 0;
    let extraInterestSaved = 0;

    if (extraMonthlyPayment > 0) {
      for (let i = 1; i <= totalPayments; i++) {
        const interest = extraBalance * periodicRate;
        let principal = piPayment - interest;
        
        // Add extra payment
        const actualExtra = Math.min(extraMonthlyPayment, extraBalance - principal);
        principal += actualExtra;

        extraTotalInterest += interest;
        extraBalance -= principal;

        extraSchedule.push({
          paymentNumber: i,
          date: extraCurrentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          paymentAmount: piPayment + actualExtra,
          principalPaid: principal,
          interestPaid: interest,
          totalInterestPaid: extraTotalInterest,
          remainingBalance: Math.max(0, extraBalance),
        });

        if (extraBalance <= 0) {
          extraMonthsSaved = totalPayments - i;
          extraInterestSaved = totalInterest - extraTotalInterest;
          break;
        }

        if (frequency === 'Monthly') extraCurrentDate.setMonth(extraCurrentDate.getMonth() + 1);
        else if (frequency === 'Bi-weekly') extraCurrentDate.setDate(extraCurrentDate.getDate() + 14);
        else if (frequency === 'Weekly') extraCurrentDate.setDate(extraCurrentDate.getDate() + 7);
      }
    }

    const payoffDate = schedule[schedule.length - 1]?.date || 'N/A';
    const extraPayoffDate = extraSchedule[extraSchedule.length - 1]?.date || payoffDate;

    return {
      piPayment,
      totalPeriodicPayment,
      totalInterest,
      totalCost: loanAmount + totalInterest,
      taxPerPeriod,
      insurancePerPeriod,
      hoaPerPeriod,
      pmiPerPeriod,
      schedule,
      extraSchedule,
      payoffDate,
      extraPayoffDate,
      extraMonthsSaved,
      extraInterestSaved,
      extraTotalInterest
    };
  }, [loanAmount, interestRate, loanTerm, frequency, startDate, propertyTaxAmount, homeInsurance, hoaFees, pmiEnabled, pmiRate, extraMonthlyPayment]);

  const breakdownData = useMemo(() => [
    { name: 'Principal', value: calculations.piPayment - (calculations.totalInterest / (loanTerm * getFrequencyMultiplier(frequency))), color: '#3b82f6' },
    { name: 'Interest', value: calculations.totalInterest / (loanTerm * getFrequencyMultiplier(frequency)), color: '#64748b' },
    { name: 'Property Tax', value: calculations.taxPerPeriod, color: '#f59e0b' },
    { name: 'Insurance', value: calculations.insurancePerPeriod, color: '#10b981' },
    { name: 'HOA', value: calculations.hoaPerPeriod, color: '#8b5cf6' },
    { name: 'PMI', value: calculations.pmiPerPeriod, color: '#ec4899' },
  ].filter(d => d.value > 0), [calculations, loanTerm, frequency]);

  const ltvColor = ltv < 80 ? 'text-emerald-600 bg-emerald-50' : ltv <= 90 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-10 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Home className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mortgage Pro</h1>
          </div>
          <p className="text-slate-500 max-w-2xl">
            A professional-grade mortgage calculator with real-time updates, amortization schedules, and visual breakdowns.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <Card title="Loan Details" icon={DollarSign}>
              <div className="space-y-5">
                <InputGroup label="Home Price">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <CurrencyInput 
                      value={homePrice} 
                      onChange={handleHomePriceChange}
                    />
                  </div>
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Down Payment">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <CurrencyInput 
                        value={downPayment} 
                        onChange={handleDownPaymentChange}
                      />
                    </div>
                  </InputGroup>
                  <InputGroup label="Down Payment %">
                    <div className="relative">
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={downPaymentPercent.toFixed(2)} 
                        onChange={(e) => handleDownPaymentPercentChange(Number(e.target.value))}
                        className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                      />
                    </div>
                  </InputGroup>
                </div>

                <InputGroup label="Loan Amount (Read-only)">
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold">
                    {formatCurrency(loanAmount)}
                  </div>
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Interest Rate">
                    <div className="relative">
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={interestRate} 
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                      />
                    </div>
                  </InputGroup>
                  <InputGroup label="Loan Term">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        value={loanTerm} 
                        onChange={(e) => setLoanTerm(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium appearance-none"
                      >
                        {[10, 15, 20, 25, 30].map(yr => <option key={yr} value={yr}>{yr} Years</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </InputGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Frequency">
                    <div className="relative">
                      <select 
                        value={frequency} 
                        onChange={(e) => setFrequency(e.target.value as Frequency)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium appearance-none"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </InputGroup>
                  <InputGroup label="Start Date">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="month" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                      />
                    </div>
                  </InputGroup>
                </div>
              </div>
            </Card>

            {/* Additional Costs Collapsible */}
            <Card className="p-0 overflow-visible">
              <button 
                onClick={() => setShowAdditionalCosts(!showAdditionalCosts)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-2xl"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-slate-800">Additional Costs</span>
                </div>
                {showAdditionalCosts ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showAdditionalCosts && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2 space-y-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700">Property Tax</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setIsTaxPercent(true)}
                            className={cn("px-2 py-1 text-xs rounded-md transition-all", isTaxPercent ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                          >%</button>
                          <button 
                            onClick={() => setIsTaxPercent(false)}
                            className={cn("px-2 py-1 text-xs rounded-md transition-all", !isTaxPercent ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                          >$</button>
                        </div>
                      </div>
                      {isTaxPercent ? (
                        <div className="relative">
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            step="0.01"
                            value={propertyTaxRate} 
                            onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                            className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <CurrencyInput 
                            value={propertyTaxAmount} 
                            onChange={handleTaxAmountChange}
                            className="py-2"
                          />
                        </div>
                      )}

                      <InputGroup label="Home Insurance (Annual $)">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <CurrencyInput 
                            value={homeInsurance} 
                            onChange={setHomeInsurance}
                            className="py-2"
                          />
                        </div>
                      </InputGroup>

                      <InputGroup label="HOA Fees (Monthly $)">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <CurrencyInput 
                            value={hoaFees} 
                            onChange={setHoaFees}
                            className="py-2"
                          />
                        </div>
                      </InputGroup>

                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            PMI (Private Mortgage Insurance)
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Required if down payment < 20%" />
                          </label>
                          <input 
                            type="checkbox" 
                            checked={overridePmi} 
                            onChange={(e) => setOverridePmi(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                        <div className="relative">
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            step="0.01"
                            value={pmiRate} 
                            onChange={(e) => setPmiRate(Number(e.target.value))}
                            disabled={!pmiEnabled}
                            className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50"
                          />
                        </div>
                        {!pmiEnabled && <p className="text-[10px] text-emerald-600 mt-1">Not required (LTV ≤ 80%)</p>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Extra Payments Collapsible */}
            <Card className="p-0 overflow-visible">
              <button 
                onClick={() => setShowExtraPayments(!showExtraPayments)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-2xl"
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-slate-800">Extra Payments</span>
                </div>
                {showExtraPayments ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showExtraPayments && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2 space-y-4 border-t border-slate-100">
                      <InputGroup label={`Extra ${getFrequencyLabel(frequency)}ly Payment`} helperText="Applied to principal each period">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <CurrencyInput 
                            value={extraMonthlyPayment} 
                            onChange={setExtraMonthlyPayment}
                            className="py-2"
                          />
                        </div>
                      </InputGroup>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-8">
            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-blue-600 border-none text-white shadow-xl shadow-blue-200">
                <div className="space-y-1">
                  <p className="text-blue-100 text-sm font-medium">Monthly Payment (P+I)</p>
                  <h2 className="text-4xl font-bold">{formatCurrency(calculations.piPayment)}</h2>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">Total Monthly</p>
                    <p className="text-xl font-bold">{formatCurrency(calculations.totalPeriodicPayment)}</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">Payoff Date</p>
                    <p className="text-xl font-bold">{calculations.payoffDate}</p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Interest</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(calculations.totalInterest)}</p>
                </Card>
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(calculations.totalCost)}</p>
                </Card>
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">LTV Ratio</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-800">{ltv.toFixed(1)}%</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", ltvColor)}>
                      {ltv < 80 ? 'Safe' : ltv <= 90 ? 'Warning' : 'High Risk'}
                    </span>
                  </div>
                </Card>
                <Card className="flex flex-col justify-center bg-emerald-50 border-emerald-100">
                  <p className="text-emerald-600 text-xs uppercase tracking-wider font-semibold mb-1">Interest Saved</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculations.extraInterestSaved)}</p>
                </Card>
              </div>
            </div>

            {/* Extra Payments Comparison */}
            {extraMonthlyPayment > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card title="Extra Payment Impact" icon={TrendingDown} className="bg-emerald-50/30 border-emerald-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">New Payoff Date</p>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-sm">{calculations.payoffDate}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-xl font-bold text-emerald-700">{calculations.extraPayoffDate}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Time Saved</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {Math.floor(calculations.extraMonthsSaved / getFrequencyMultiplier(frequency))} Years, {calculations.extraMonthsSaved % getFrequencyMultiplier(frequency)} {getFrequencyLabel(frequency)}s
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Total Interest Saved</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculations.extraInterestSaved)}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card title="Payment Breakdown" icon={PieChartIcon}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {breakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Loan Balance Over Time" icon={TrendingDown}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={calculations.schedule.filter((_, i) => i % (frequency === 'Monthly' ? 12 : 52) === 0 || i === calculations.schedule.length - 1)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="remainingBalance" stroke="#3b82f6" strokeWidth={3} dot={false} name="Standard" />
                      {extraMonthlyPayment > 0 && (
                        <Line 
                          type="monotone" 
                          data={calculations.extraSchedule.filter((_, i) => i % (frequency === 'Monthly' ? 12 : 52) === 0 || i === calculations.extraSchedule.length - 1)} 
                          dataKey="remainingBalance" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={false} 
                          name="With Extra" 
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Amortization Table */}
            <Card title="Amortization Schedule" icon={TableIcon} className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Principal</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interest</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Interest</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(showAllAmortization ? calculations.schedule : calculations.schedule.slice(0, 12)).map((row) => (
                      <tr key={row.paymentNumber} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-400">{row.paymentNumber}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{row.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(row.principalPaid)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(row.interestPaid)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(row.totalInterestPaid)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{formatCurrency(row.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => setShowAllAmortization(!showAllAmortization)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
                >
                  {showAllAmortization ? (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show All {calculations.schedule.length} Payments <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Mortgage Pro. All calculations are estimates.</p>
        </footer>
      </div>
    </div>
  );
}
