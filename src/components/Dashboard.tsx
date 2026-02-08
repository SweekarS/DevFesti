import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  Shield, 
  Upload, 
  LogOut, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Database,
  Bell,
  Settings,
  Menu,
  X
} from "lucide-react";
import { UploadZone } from "./UploadZone";
import { AnalysisResults } from "./AnalysisResults";
import { InvoiceHistory } from "./InvoiceHistory";

type AnalysisData = {
  fraudScore: number;
  duplicateFound: boolean;
  taxIdValid: boolean;
  ibanValid: boolean;
  warnings: string[];
  invoiceData: {
    invoiceNumber: string;
    amount: string;
    vendor: string;
    date: string;
    taxId: string;
    iban: string;
  };
};

export function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'upload' | 'analysis' | 'history'>('upload');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleLogout = () => {
    // TODO: Replace with actual logout API call
    navigate('/');
  };

  const handleFileUpload = async (files: File[]) => {
    setIsAnalyzing(true);
    setCurrentView('analysis');

    // Simulate ML analysis - your backend team will replace this
    setTimeout(() => {
      // TODO: Replace with actual API call to your ML service
      // const formData = new FormData();
      // files.forEach(file => formData.append('invoices', file));
      // const response = await fetch('/api/analyze-invoice', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();

      // Mock analysis data
      const mockData: AnalysisData = {
        fraudScore: Math.random() * 100,
        duplicateFound: Math.random() > 0.7,
        taxIdValid: Math.random() > 0.3,
        ibanValid: Math.random() > 0.3,
        warnings: [],
        invoiceData: {
          invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
          amount: `$${(Math.random() * 50000 + 1000).toFixed(2)}`,
          vendor: "Acme Corporation Ltd.",
          date: new Date().toLocaleDateString(),
          taxId: "GB123456789",
          iban: "GB29NWBK60161331926819"
        }
      };

      if (mockData.fraudScore > 70) {
        mockData.warnings.push("High fraud risk detected based on pattern analysis");
      }
      if (mockData.duplicateFound) {
        mockData.warnings.push("Potential duplicate invoice found in database");
      }
      if (!mockData.taxIdValid) {
        mockData.warnings.push("Tax ID could not be validated");
      }
      if (!mockData.ibanValid) {
        mockData.warnings.push("IBAN format validation failed");
      }

      setAnalysisData(mockData);
      setIsAnalyzing(false);
    }, 3000);
  };

  const stats = [
    { 
      icon: FileText, 
      label: "Invoices Processed", 
      value: "1,247",
      trend: "+12%",
      color: "from-gold to-gold-dark"
    },
    { 
      icon: AlertTriangle, 
      label: "Fraud Detected", 
      value: "23",
      trend: "-8%",
      color: "from-burgundy to-burgundy-dark"
    },
    { 
      icon: CheckCircle, 
      label: "Verified Safe", 
      value: "1,224",
      trend: "+15%",
      color: "from-emerald to-emerald-dark"
    },
    { 
      icon: TrendingUp, 
      label: "Savings", 
      value: "$284K",
      trend: "+23%",
      color: "from-emerald-light to-emerald"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-navy-light">
      {/* Top Navigation */}
      <motion.nav
        className="bg-navy-light/50 backdrop-blur-xl border-b border-gold/20 px-6 py-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gold/10 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-gold" /> : <Menu className="w-6 h-6 text-gold" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center shadow-lg shadow-gold/30">
                <Shield className="w-6 h-6 text-navy-dark" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
                InvoiceGuard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              className="relative p-2 hover:bg-gold/10 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-6 h-6 text-gold" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-burgundy rounded-full"></span>
            </motion.button>
            <motion.button
              className="p-2 hover:bg-gold/10 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-6 h-6 text-gold" />
            </motion.button>
            <div className="w-px h-8 bg-gold/20"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white">Acme Corp</div>
                <div className="text-xs text-gray-400">admin@acme.com</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald to-emerald-dark rounded-full flex items-center justify-center font-bold text-white">
                AC
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              className="p-2 hover:bg-burgundy/10 rounded-lg transition-colors group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-6 h-6 text-gray-400 group-hover:text-burgundy transition-colors" />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-light/30 backdrop-blur-xl border-r border-gold/20 transition-transform duration-300`}
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-6 space-y-2 mt-4">
            <SidebarButton
              icon={Upload}
              label="Upload Invoice"
              active={currentView === 'upload'}
              onClick={() => setCurrentView('upload')}
            />
            <SidebarButton
              icon={FileText}
              label="Invoice History"
              active={currentView === 'history'}
              onClick={() => setCurrentView('history')}
            />
            <SidebarButton
              icon={Database}
              label="Watchlist"
              active={false}
              onClick={() => {}}
            />
            <SidebarButton
              icon={TrendingUp}
              label="Analytics"
              active={false}
              onClick={() => {}}
            />
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-6 hover:border-gold/30 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm text-emerald-light font-semibold">{stat.trend}</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {currentView === 'upload' && !analysisData && (
              <UploadZone onUpload={handleFileUpload} />
            )}
            
            {currentView === 'analysis' && (
              <AnalysisResults 
                data={analysisData} 
                isAnalyzing={isAnalyzing}
                onNewUpload={() => {
                  setCurrentView('upload');
                  setAnalysisData(null);
                }}
              />
            )}

            {currentView === 'history' && (
              <InvoiceHistory />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function SidebarButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30 text-gold' 
          : 'hover:bg-gold/5 text-gray-400 hover:text-gold-light'
      }`}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </motion.button>
  );
}
