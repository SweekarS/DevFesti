import { motion } from "motion/react";
import { useState, useEffect } from "react";
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
  X,
  Sun,
  ZoomIn,
  ZoomOut,
  Eye,
  MonitorSmartphone,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import { UploadZone } from "./UploadZone";
import { AnalysisResults } from "./AnalysisResults";
import { InvoiceHistory } from "./InvoiceHistory";
import { Watchlist } from "./Watchlist";

type PriceCheckItem = {
  item: string;
  invoicePrice: number;
  marketPrice: number;
  verdict: 'fair' | 'overpriced' | 'underpriced';
  differencePercent: number;
  source: string;
};

type PriceCheckData = {
  enabled: boolean;
  items: PriceCheckItem[];
  overallVerdict: 'fair' | 'overpriced' | 'underpriced';
  totalInvoice: number;
  totalMarket: number;
};

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
  priceCheck?: PriceCheckData;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'upload' | 'analysis' | 'history' | 'watchlist'>('upload');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [priceCheckEnabled, setPriceCheckEnabled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largePointer, setLargePointer] = useState(false);

  // Apply accessibility settings to the document
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-pointer', largePointer);
  }, [largePointer]);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    files: File[];
    priceCheck: boolean;
    matchedInvoice: { invoiceNumber: string; vendor: string; amount: string; paidDate: string } | null;
  }>({ show: false, files: [], priceCheck: false, matchedInvoice: null });

  const handleLogout = () => {
    // TODO: Replace with actual logout API call
    navigate('/');
  };

// Add new state for extracted data
const [extractedData, setExtractedData] = useState<any>(null);
const [uploadedFilePath, setUploadedFilePath] = useState<string>("");

// Step 1: Upload and extract invoice data (NO ML yet)
const handleFileUpload = async (files: File[], priceCheck: boolean) => {
  if (files.length === 0) return;

  setIsAnalyzing(true);
  setCurrentView('analysis');

  const formData = new FormData();
  formData.append('invoice', files[0]); // Just first file for now

  try {
    // Upload and extract data
    const uploadRes = await fetch('http://localhost:3001/invoices/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    const result = await uploadRes.json();
    
    setExtractedData(result.data);
    setUploadedFilePath(result.file_path);
    setPriceCheckEnabled(priceCheck);
    
    // Show extracted data immediately
    setAnalysisData({
      fraudScore: 0, // Will be filled by ML later
      duplicateFound: false,
      taxIdValid: true,
      ibanValid: true,
      warnings: [],
      invoiceData: {
        invoiceNumber: result.data.invoice_number || 'N/A',
        amount: `$${result.data.total_amount || '0'}`,
        vendor: result.data.vendor_name || 'Unknown',
        date: result.data.invoice_date || 'N/A',
        taxId: result.data.tax_id || 'N/A',
        iban: result.data.iban || 'N/A'
      }
    });
    
    setIsAnalyzing(false);

  } catch (error) {
    console.error('Upload failed:', error);
    setIsAnalyzing(false);
    // Show error to user
  }
};

// Step 2: Run ML analysis when user clicks button
const handleRunMLAnalysis = async () => {
  if (!uploadedFilePath) return;

  setIsAnalyzing(true);

  try {
    const mlRes = await fetch(
      `http://localhost:3001/invoices/analyze/${encodeURIComponent(uploadedFilePath)}`,
      { method: 'POST' }
    );

    if (!mlRes.ok) throw new Error('ML analysis failed');

    const mlResult = await mlRes.json();

    // Update analysis data with ML results
    setAnalysisData(prev => ({
      ...prev!,
      fraudScore: mlResult.ml_score * 100 || 0,
      duplicateFound: mlResult.duplicate_risk?.risk_level !== 'LOW',
      warnings: mlResult.duplicate_risk?.reasons || [],
      priceCheck: priceCheckEnabled ? {
        enabled: true,
        items: [], // Parse from mlResult.price_check if needed
        overallVerdict: mlResult.price_check?.assessment === 'OVERPRICED' ? 'overpriced' : 
                       mlResult.price_check?.assessment === 'OK' ? 'fair' : 'underpriced',
        totalInvoice: extractedData?.total_amount || 0,
        totalMarket: mlResult.price_check?.estimated_market_low || 0,
      } : undefined
    }));

    setIsAnalyzing(false);

  } catch (error) {
    console.error('ML analysis failed:', error);
    setIsAnalyzing(false);
  }
};

  const handleDuplicateProceed = () => {
    const { files, priceCheck } = duplicateWarning;
    setDuplicateWarning({ show: false, files: [], priceCheck: false, matchedInvoice: null });
    runFullAnalysis(files, priceCheck);
  };

  const handleDuplicateCancel = () => {
    setDuplicateWarning({ show: false, files: [], priceCheck: false, matchedInvoice: null });
  };

  const runFullAnalysis = (files: File[], priceCheck: boolean) => {
    setPriceCheckEnabled(priceCheck);
    setIsAnalyzing(true);
    setCurrentView('analysis');

    // Simulate ML analysis - your backend team will replace this
    const analysisDelay = priceCheck ? 4500 : 3000;
    setTimeout(() => {
      // TODO: Replace with actual API call to your ML service
      // const formData = new FormData();
      // files.forEach(file => formData.append('invoices', file));
      // formData.append('priceCheck', String(priceCheck));
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

      // Generate mock price check data if enabled
      if (priceCheck) {
        const mockItems: PriceCheckItem[] = [
          {
            item: "IT Consulting Services (40 hrs)",
            invoicePrice: 6000,
            marketPrice: 5200,
            verdict: 'overpriced',
            differencePercent: 15.4,
            source: "Glassdoor, Indeed, Upwork"
          },
          {
            item: "Cloud Infrastructure Setup",
            invoicePrice: 3500,
            marketPrice: 3400,
            verdict: 'fair',
            differencePercent: 2.9,
            source: "AWS Marketplace, G2"
          },
          {
            item: "Security Audit & Compliance",
            invoicePrice: 4200,
            marketPrice: 4800,
            verdict: 'underpriced',
            differencePercent: -12.5,
            source: "Gartner, Industry Reports"
          },
          {
            item: "Software Licenses (Annual)",
            invoicePrice: 8500,
            marketPrice: 5900,
            verdict: 'overpriced',
            differencePercent: 44.1,
            source: "Vendor websites, Capterra"
          }
        ];

        const totalInvoice = mockItems.reduce((sum, i) => sum + i.invoicePrice, 0);
        const totalMarket = mockItems.reduce((sum, i) => sum + i.marketPrice, 0);
        const overallDiff = ((totalInvoice - totalMarket) / totalMarket) * 100;

        mockData.priceCheck = {
          enabled: true,
          items: mockItems,
          overallVerdict: overallDiff > 10 ? 'overpriced' : overallDiff < -10 ? 'underpriced' : 'fair',
          totalInvoice,
          totalMarket,
        };
      }

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
      if (mockData.priceCheck?.overallVerdict === 'overpriced') {
        mockData.warnings.push("Price check: invoice total is above market average — review line items");
      }

      setAnalysisData(mockData);
      setIsAnalyzing(false);
    }, analysisDelay);
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
        className="relative z-[1000] bg-navy-light/50 backdrop-blur-xl border-b border-gold/20 px-6 py-4"
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
            <div className="relative">
              <motion.button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setSettingsOpen(false); }}
                className="relative p-2 hover:bg-gold/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-6 h-6 text-gold" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-burgundy rounded-full"></span>
              </motion.button>

              {/* Notifications dropdown — content on blur/translucent */}
              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998] bg-navy-dark/50 backdrop-blur-sm"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <motion.div
                    className="fixed right-4 top-16 sm:absolute sm:right-0 sm:top-12 w-80 z-[999] bg-navy-light/90 backdrop-blur-xl border border-gold/20 rounded-2xl shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gold/10">
                      <h4 className="text-gold-light font-semibold text-sm">Notifications</h4>
                      <span className="text-xs bg-burgundy/20 text-burgundy-light px-2 py-0.5 rounded-full font-medium">3 new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {[
                        { icon: AlertTriangle, color: "burgundy", title: "High-risk invoice flagged", desc: "INV-4821 from vendor TechSupply Inc. scored 87% risk", time: "2 min ago" },
                        { icon: FileText, color: "gold", title: "Duplicate payment blocked", desc: "INV-3392 matched a previously paid invoice", time: "1 hr ago" },
                        { icon: CheckCircle, color: "emerald", title: "Batch analysis complete", desc: "12 invoices processed — all clear", time: "3 hrs ago" },
                        { icon: Clock, color: "gold", title: "Watchlist updated", desc: "2 new Tax IDs added to verification list", time: "Yesterday" },
                      ].map((notif, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gold/5 transition-colors cursor-pointer ${i < 3 ? 'border-b border-gold/5' : ''}`}
                        >
                          <div className={`w-8 h-8 bg-${notif.color}/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <notif.icon className={`w-4 h-4 text-${notif.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{notif.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{notif.desc}</p>
                            <p className="text-gray-500 text-xs mt-1">{notif.time}</p>
                          </div>
                          {i < 3 && <span className="w-2 h-2 bg-burgundy rounded-full flex-shrink-0 mt-2"></span>}
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-gold/10">
                      <button className="w-full text-center text-gold-light text-xs font-medium hover:text-gold transition-colors">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
            <div className="relative">
              <motion.button
                onClick={() => { setSettingsOpen(!settingsOpen); setNotificationsOpen(false); }}
                className="p-2 hover:bg-gold/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-6 h-6 text-gold" />
              </motion.button>

              {/* Settings dropdown — content on blur/translucent */}
              {settingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998] bg-navy-dark/50 backdrop-blur-sm"
                    onClick={() => setSettingsOpen(false)}
                  />
                  <motion.div
                    className="fixed right-4 top-16 sm:absolute sm:right-0 sm:top-12 w-96 max-w-[calc(100vw-2rem)] z-[999] bg-navy-light/90 backdrop-blur-xl border border-gold/20 rounded-2xl shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10">
                      <h4 className="text-gold-light font-semibold text-sm">Accessibility Settings</h4>
                      <motion.button
                        onClick={() => {
                          setFontSize(100);
                          setHighContrast(false);
                          setReducedMotion(false);
                          setLargePointer(false);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold-light transition-colors px-2 py-1 rounded-lg hover:bg-gold/10"
                        whileTap={{ scale: 0.95 }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </motion.button>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Font Size */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ZoomIn className="w-4 h-4 text-gold" />
                          <span className="text-white text-sm font-medium">Text Size</span>
                          <span className="ml-auto text-xs text-gold-light font-mono bg-gold/10 px-2 py-0.5 rounded-full">{fontSize}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <motion.button
                            onClick={() => setFontSize(Math.max(70, fontSize - 10))}
                            className="w-9 h-9 bg-navy-dark/50 border border-gold/20 rounded-lg flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/40 transition-all"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <div className="flex-1 relative h-2 bg-navy-dark/50 rounded-full overflow-hidden">
                            <motion.div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold-dark rounded-full"
                              animate={{ width: `${((fontSize - 70) / 80) * 100}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                          <motion.button
                            onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                            className="w-9 h-9 bg-navy-dark/50 border border-gold/20 rounded-lg flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/40 transition-all"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-gray-500">Smaller</span>
                          <span className="text-[10px] text-gray-500">Larger</span>
                        </div>
                      </div>

                      <div className="h-px bg-gold/10" />

                      {/* High Contrast */}
                      <SettingsToggle
                        icon={Sun}
                        label="High Contrast"
                        description="Increases color contrast for better readability"
                        enabled={highContrast}
                        onToggle={() => setHighContrast(!highContrast)}
                      />

                      {/* Reduced Motion */}
                      <SettingsToggle
                        icon={MonitorSmartphone}
                        label="Reduced Motion"
                        description="Minimizes animations and transitions"
                        enabled={reducedMotion}
                        onToggle={() => setReducedMotion(!reducedMotion)}
                      />

                      {/* Large Pointer */}
                      <SettingsToggle
                        icon={Eye}
                        label="Large Cursor"
                        description="Increases cursor size for easier targeting"
                        enabled={largePointer}
                        onToggle={() => setLargePointer(!largePointer)}
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </div>
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
              active={currentView === 'watchlist'}
              onClick={() => setCurrentView('watchlist')}
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

          {/* Duplicate Warning Modal */}
          {duplicateWarning.show && duplicateWarning.matchedInvoice && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="bg-gradient-to-br from-navy-light to-navy border-2 border-burgundy/40 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-burgundy/20 to-burgundy-dark/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-8 h-8 text-burgundy" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Duplicate Invoice Detected</h3>
                    <p className="text-gray-400 text-sm">This invoice is already in the system as paid</p>
                  </div>
                </div>

                <div className="bg-navy-dark/50 border border-burgundy/20 rounded-2xl p-5 mb-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Invoice #</span>
                    <span className="text-white font-medium text-sm">{duplicateWarning.matchedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Vendor</span>
                    <span className="text-white font-medium text-sm">{duplicateWarning.matchedInvoice.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Amount</span>
                    <span className="text-white font-medium text-sm">{duplicateWarning.matchedInvoice.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Paid on</span>
                    <span className="text-emerald-light font-medium text-sm">{duplicateWarning.matchedInvoice.paidDate}</span>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-6">
                  A matching invoice was found that has already been processed and paid. Proceeding may result in a <span className="text-burgundy-light font-semibold">duplicate payment</span>. Would you like to proceed anyway?
                </p>

                <div className="flex gap-4">
                  <motion.button
                    onClick={handleDuplicateCancel}
                    className="flex-1 py-3 bg-navy-dark/50 border border-gold/30 text-gold-light rounded-xl font-semibold hover:bg-navy-dark/70 hover:border-gold/50 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleDuplicateProceed}
                    className="flex-1 py-3 bg-gradient-to-r from-burgundy to-burgundy-dark text-white rounded-xl font-semibold shadow-lg shadow-burgundy/30 hover:shadow-burgundy/50 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Proceed Anyway
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

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
                priceCheckEnabled={priceCheckEnabled}
                onNewUpload={() => {
                  setCurrentView('upload');
                  setAnalysisData(null);
                  setPriceCheckEnabled(false);
                }}
              />
            )}

            {currentView === 'history' && (
              <InvoiceHistory />
            )}

            {currentView === 'watchlist' && (
              <Watchlist />
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

function SettingsToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: any;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="w-9 h-9 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
      <div className="relative flex-shrink-0 mt-1">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="sr-only peer"
        />
        <div className="w-10 h-6 bg-navy-dark/50 border border-gold/30 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-emerald peer-checked:to-emerald-dark peer-checked:border-emerald/50 transition-all duration-300" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-gray-400 rounded-full transition-all duration-300 peer-checked:translate-x-4 peer-checked:bg-white shadow-lg" />
      </div>
    </label>
  );
}
