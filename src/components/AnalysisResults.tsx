import { motion } from "motion/react";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar,
  DollarSign,
  Building,
  CreditCard,
  Hash,
  ArrowLeft,
  Save,
  Shield
} from "lucide-react";
import { useState } from "react";

interface AnalysisData {
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
}

interface AnalysisResultsProps {
  data: AnalysisData | null;
  isAnalyzing: boolean;
  onNewUpload: () => void;
}

export function AnalysisResults({ data, isAnalyzing, onNewUpload }: AnalysisResultsProps) {
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (paid: boolean) => {
    setIsPaid(paid);
    setIsSaving(true);

    // Simulate API call - your backend team will replace this
    setTimeout(() => {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/invoices', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...data,
      //     isPaid: paid,
      //     addToWatchlist: paid
      //   })
      // });

      setIsSaving(false);
      setSaved(true);
    }, 1500);
  };

  if (isAnalyzing) {
    return (
      <div className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-3xl p-12">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gold/20 to-emerald/20 rounded-3xl mb-8"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Shield className="w-12 h-12 text-gold" />
          </motion.div>

          <h2 className="text-white mb-4">Analyzing Invoice...</h2>
          <p className="text-gray-400 mb-8">Our AI is scanning for fraud patterns, duplicates, and validating payment details</p>

          <div className="max-w-md mx-auto space-y-4">
            {[
              "Extracting invoice data...",
              "Checking for duplicates...",
              "Validating Tax ID...",
              "Verifying IBAN...",
              "Running fraud detection..."
            ].map((step, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 bg-navy-dark/30 rounded-xl p-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
              >
                <motion.div
                  className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-gray-300 text-sm">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getRiskLevel = (score: number) => {
    if (score < 30) return { label: "Low Risk", color: "emerald", icon: CheckCircle };
    if (score < 70) return { label: "Medium Risk", color: "gold", icon: AlertTriangle };
    return { label: "High Risk", color: "burgundy", icon: XCircle };
  };

  const risk = getRiskLevel(data.fraudScore);
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-gold-light mb-2">Analysis Complete</h2>
          <p className="text-gray-400">Review the results and confirm payment status</p>
        </div>
        <motion.button
          onClick={onNewUpload}
          className="flex items-center gap-2 px-4 py-2 bg-navy-light/50 border border-gold/30 rounded-lg text-gold-light hover:bg-navy-light hover:border-gold/50 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          New Upload
        </motion.button>
      </motion.div>

      {/* Risk Score Card */}
      <motion.div
        className={`bg-gradient-to-br from-${risk.color}/10 to-${risk.color}/5 border-2 border-${risk.color}/30 rounded-3xl p-8`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br from-${risk.color} to-${risk.color}-dark rounded-2xl flex items-center justify-center`}>
              <RiskIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-white mb-1">Fraud Risk Assessment</h3>
              <p className={`text-${risk.color}-light font-semibold`}>{risk.label}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-white mb-1">{data.fraudScore.toFixed(1)}%</div>
            <p className="text-gray-400 text-sm">Risk Score</p>
          </div>
        </div>

        {/* Risk Progress Bar */}
        <div className="relative h-3 bg-navy-dark/50 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-${risk.color} to-${risk.color}-light`}
            initial={{ width: 0 }}
            animate={{ width: `${data.fraudScore}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Validation Results */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ValidationCard
          icon={FileText}
          label="Duplicate Check"
          status={!data.duplicateFound}
          message={data.duplicateFound ? "Duplicate Found" : "No Duplicates"}
          delay={0.3}
        />
        <ValidationCard
          icon={Hash}
          label="Tax ID Validation"
          status={data.taxIdValid}
          message={data.taxIdValid ? "Valid Tax ID" : "Invalid Tax ID"}
          delay={0.4}
        />
        <ValidationCard
          icon={CreditCard}
          label="IBAN Validation"
          status={data.ibanValid}
          message={data.ibanValid ? "Valid IBAN" : "Invalid IBAN"}
          delay={0.5}
        />
      </motion.div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <motion.div
          className="bg-gradient-to-br from-burgundy/10 to-burgundy/5 border border-burgundy/30 rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-burgundy flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-burgundy-light font-semibold mb-3">Warnings Detected</h3>
              <ul className="space-y-2">
                {data.warnings.map((warning, index) => (
                  <motion.li
                    key={index}
                    className="text-gray-300 text-sm flex items-start gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <span className="w-1.5 h-1.5 bg-burgundy rounded-full mt-1.5 flex-shrink-0"></span>
                    {warning}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Invoice Details */}
      <motion.div
        className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-gold-light mb-6">Invoice Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailItem icon={FileText} label="Invoice Number" value={data.invoiceData.invoiceNumber} />
          <DetailItem icon={DollarSign} label="Amount" value={data.invoiceData.amount} />
          <DetailItem icon={Building} label="Vendor" value={data.invoiceData.vendor} />
          <DetailItem icon={Calendar} label="Date" value={data.invoiceData.date} />
          <DetailItem icon={Hash} label="Tax ID" value={data.invoiceData.taxId} />
          <DetailItem icon={CreditCard} label="IBAN" value={data.invoiceData.iban} />
        </div>
      </motion.div>

      {/* Payment Status Question */}
      {!saved && (
        <motion.div
          className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h3 className="text-white mb-4 text-center">Has this invoice been paid?</h3>
          <p className="text-gray-400 text-center mb-6">
            If paid, we'll add the Tax ID and IBAN to the watchlist for enhanced fraud detection
          </p>
          <div className="flex gap-4 justify-center">
            <motion.button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-8 py-4 bg-gradient-to-r from-emerald to-emerald-dark text-white rounded-xl font-semibold shadow-lg shadow-emerald/30 hover:shadow-emerald/50 disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
              whileHover={{ scale: isSaving ? 1 : 1.05, y: isSaving ? 0 : -2 }}
              whileTap={{ scale: isSaving ? 1 : 0.95 }}
            >
              {isSaving && isPaid === true ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Yes, Paid
                </>
              )}
            </motion.button>
            <motion.button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-8 py-4 bg-gradient-to-r from-burgundy to-burgundy-dark text-white rounded-xl font-semibold shadow-lg shadow-burgundy/30 hover:shadow-burgundy/50 disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
              whileHover={{ scale: isSaving ? 1 : 1.05, y: isSaving ? 0 : -2 }}
              whileTap={{ scale: isSaving ? 1 : 0.95 }}
            >
              {isSaving && isPaid === false ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Not Paid
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {saved && (
        <motion.div
          className="bg-gradient-to-br from-emerald/10 to-emerald/5 border border-emerald/30 rounded-2xl p-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3 justify-center">
            <Save className="w-6 h-6 text-emerald" />
            <p className="text-emerald-light font-semibold">
              Invoice saved successfully! {isPaid && "Tax ID and IBAN added to watchlist."}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ValidationCard({ 
  icon: Icon, 
  label, 
  status, 
  message, 
  delay 
}: { 
  icon: any; 
  label: string; 
  status: boolean; 
  message: string;
  delay: number;
}) {
  return (
    <motion.div
      className={`bg-gradient-to-br ${
        status 
          ? 'from-emerald/10 to-emerald/5 border-emerald/30' 
          : 'from-burgundy/10 to-burgundy/5 border-burgundy/30'
      } border rounded-xl p-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 bg-gradient-to-br ${
          status ? 'from-emerald/20 to-emerald-dark/20' : 'from-burgundy/20 to-burgundy-dark/20'
        } rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${status ? 'text-emerald' : 'text-burgundy'}`} />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-xs">{label}</p>
          <p className={`font-semibold ${status ? 'text-emerald-light' : 'text-burgundy-light'}`}>
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className="text-white font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
