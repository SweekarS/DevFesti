import { motion } from "motion/react";
import { useState } from "react";
import {
  Database,
  Search,
  Hash,
  CreditCard,
  Building,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

type WatchlistStatus = "verified" | "flagged" | "pending";

interface WatchlistEntry {
  id: string;
  vendor: string;
  taxId: string;
  iban: string;
  status: WatchlistStatus;
  dateAdded: string;
  sourceInvoice: string;
  timesMatched: number;
  notes: string;
}

const MOCK_ENTRIES: WatchlistEntry[] = [
  {
    id: "1",
    vendor: "Acme Corporation Ltd.",
    taxId: "GB123456789",
    iban: "GB29NWBK60161331926819",
    status: "verified",
    dateAdded: "2026-02-05",
    sourceInvoice: "INV-2024-001",
    timesMatched: 12,
    notes: "Long-standing vendor, all invoices clean.",
  },
  {
    id: "2",
    vendor: "TechSupply Inc.",
    taxId: "US987654321",
    iban: "DE89370400440532013000",
    status: "flagged",
    dateAdded: "2026-02-04",
    sourceInvoice: "INV-2024-002",
    timesMatched: 3,
    notes: "Tax ID mismatch on 2 invoices. Under review.",
  },
  {
    id: "3",
    vendor: "Global Services LLC",
    taxId: "FR76543210987",
    iban: "FR7630006000011234567890189",
    status: "flagged",
    dateAdded: "2026-02-03",
    sourceInvoice: "INV-2024-003",
    timesMatched: 1,
    notes: "High fraud score on initial invoice. IBAN unverified.",
  },
  {
    id: "4",
    vendor: "Office Supplies Pro",
    taxId: "GB111222333",
    iban: "GB82WEST12345698765432",
    status: "verified",
    dateAdded: "2026-02-02",
    sourceInvoice: "INV-2024-004",
    timesMatched: 8,
    notes: "Recurring vendor. Consistently valid.",
  },
  {
    id: "5",
    vendor: "IT Solutions Group",
    taxId: "DE123456789",
    iban: "DE44500105175407324931",
    status: "verified",
    dateAdded: "2026-02-01",
    sourceInvoice: "INV-2024-005",
    timesMatched: 6,
    notes: "",
  },
  {
    id: "6",
    vendor: "NewVendor Co.",
    taxId: "NL004495445B01",
    iban: "NL91ABNA0417164300",
    status: "pending",
    dateAdded: "2026-02-07",
    sourceInvoice: "INV-2024-008",
    timesMatched: 1,
    notes: "First invoice. Awaiting validation.",
  },
  {
    id: "7",
    vendor: "CloudNet Services",
    taxId: "IE9S99999L",
    iban: "IE29AIBK93115212345678",
    status: "pending",
    dateAdded: "2026-02-06",
    sourceInvoice: "INV-2024-007",
    timesMatched: 2,
    notes: "IBAN validation pending.",
  },
];

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    color: "emerald",
    icon: ShieldCheck,
    bg: "from-emerald/10 to-emerald/5",
    border: "border-emerald/30",
  },
  flagged: {
    label: "Flagged",
    color: "burgundy",
    icon: ShieldAlert,
    bg: "from-burgundy/10 to-burgundy/5",
    border: "border-burgundy/30",
  },
  pending: {
    label: "Pending",
    color: "gold",
    icon: ShieldQuestion,
    bg: "from-gold/10 to-gold/5",
    border: "border-gold/30",
  },
};

export function Watchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(MOCK_ENTRIES);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | WatchlistStatus>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({
    vendor: "",
    taxId: "",
    iban: "",
    notes: "",
  });

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.iban.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || entry.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = [
    {
      label: "Total Entries",
      value: entries.length,
      icon: Database,
      color: "from-gold to-gold-dark",
    },
    {
      label: "Verified",
      value: entries.filter((e) => e.status === "verified").length,
      icon: ShieldCheck,
      color: "from-emerald to-emerald-dark",
    },
    {
      label: "Flagged",
      value: entries.filter((e) => e.status === "flagged").length,
      icon: ShieldAlert,
      color: "from-burgundy to-burgundy-dark",
    },
    {
      label: "Pending",
      value: entries.filter((e) => e.status === "pending").length,
      icon: ShieldQuestion,
      color: "from-gold-dark to-gold",
    },
  ];

  const handleAddEntry = () => {
    if (!newEntry.vendor.trim() || !newEntry.taxId.trim() || !newEntry.iban.trim()) return;

    const entry: WatchlistEntry = {
      id: String(Date.now()),
      vendor: newEntry.vendor,
      taxId: newEntry.taxId,
      iban: newEntry.iban,
      status: "pending",
      dateAdded: new Date().toISOString().split("T")[0],
      sourceInvoice: "Manual Entry",
      timesMatched: 0,
      notes: newEntry.notes,
    };

    setEntries((prev) => [entry, ...prev]);
    setNewEntry({ vendor: "", taxId: "", iban: "", notes: "" });
    setShowAddModal(false);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const cycle: WatchlistStatus[] = ["pending", "verified", "flagged"];
        const nextIdx = (cycle.indexOf(e.status) + 1) % cycle.length;
        return { ...e, status: cycle[nextIdx] };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-gold-light mb-2">Watchlist</h2>
          <p className="text-gray-400">
            Verified Tax IDs and IBANs from paid invoices. New invoices are checked against this list.
          </p>
        </div>
        <motion.button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-dark rounded-xl font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          Add Entry
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-5 hover:border-gold/30 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search & Filter */}
      <motion.div
        className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor, Tax ID, or IBAN..."
              className="w-full pl-12 pr-4 py-3 bg-navy-dark/50 border border-gold/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "verified", "flagged", "pending"] as const).map((status) => (
              <motion.button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 capitalize ${
                  filterStatus === status
                    ? "bg-gradient-to-r from-gold to-gold-dark text-navy-dark"
                    : "bg-navy-dark/50 text-gray-400 hover:text-gold-light"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {status}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <motion.div
            className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Database className="w-16 h-16 text-gold/30 mx-auto mb-4" />
            <p className="text-gray-400">No watchlist entries found</p>
          </motion.div>
        ) : (
          filteredEntries.map((entry, index) => {
            const config = STATUS_CONFIG[entry.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedEntry === entry.id;

            return (
              <motion.div
                key={entry.id}
                className={`bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/10 rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.04 }}
              >
                {/* Main Row */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Status Icon */}
                    <div
                      className={`w-14 h-14 bg-gradient-to-br ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <StatusIcon className={`w-7 h-7 text-${config.color}`} />
                    </div>

                    {/* Vendor & IDs */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold">{entry.vendor}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-${config.color}/10 border ${config.border} text-${config.color}-light`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Hash className="w-3.5 h-3.5" />
                          <span className="font-mono text-gray-300">{entry.taxId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="font-mono text-gray-300 truncate max-w-[220px]">
                            {entry.iban}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm text-gray-400 flex items-center gap-1.5 justify-end">
                          <Calendar className="w-3.5 h-3.5" />
                          {entry.dateAdded}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Matched {entry.timesMatched} time{entry.timesMatched !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <motion.div
                        className="w-6 h-6 flex items-center justify-center text-gold/50"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    className="px-6 pb-6 border-t border-gold/10"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <DetailRow icon={Building} label="Vendor" value={entry.vendor} />
                        <DetailRow icon={Hash} label="Tax ID" value={entry.taxId} mono />
                        <DetailRow icon={CreditCard} label="IBAN" value={entry.iban} mono />
                        <DetailRow icon={FileText} label="Source Invoice" value={entry.sourceInvoice} />
                        <DetailRow icon={Calendar} label="Date Added" value={entry.dateAdded} />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-400 text-sm mb-2">Notes</p>
                          <div className="bg-navy-dark/50 border border-gold/10 rounded-xl p-4 text-gray-300 text-sm min-h-[80px]">
                            {entry.notes || "No notes."}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(entry.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-navy-dark/50 border border-gold/30 text-gold-light rounded-xl font-semibold hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Shield className="w-4 h-4" />
                            Cycle Status
                          </motion.button>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveEntry(entry.id);
                            }}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-burgundy/10 border border-burgundy/30 text-burgundy-light rounded-xl font-semibold hover:bg-burgundy/20 hover:border-burgundy/50 transition-all duration-300"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            className="bg-gradient-to-br from-navy-light to-navy border border-gold/30 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-emerald/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Add Watchlist Entry</h3>
                  <p className="text-gray-400 text-sm">Manually add a Tax ID and IBAN</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gold/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vendor Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                  <input
                    type="text"
                    value={newEntry.vendor}
                    onChange={(e) => setNewEntry((prev) => ({ ...prev, vendor: e.target.value }))}
                    placeholder="e.g. Acme Corporation"
                    className="w-full pl-11 pr-4 py-3 bg-navy-dark/50 border border-gold/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tax ID</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                  <input
                    type="text"
                    value={newEntry.taxId}
                    onChange={(e) => setNewEntry((prev) => ({ ...prev, taxId: e.target.value }))}
                    placeholder="e.g. GB123456789"
                    className="w-full pl-11 pr-4 py-3 bg-navy-dark/50 border border-gold/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">IBAN</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                  <input
                    type="text"
                    value={newEntry.iban}
                    onChange={(e) => setNewEntry((prev) => ({ ...prev, iban: e.target.value }))}
                    placeholder="e.g. GB29NWBK60161331926819"
                    className="w-full pl-11 pr-4 py-3 bg-navy-dark/50 border border-gold/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any relevant notes about this vendor..."
                  className="w-full h-24 bg-navy-dark/50 border border-gold/20 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <motion.button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-navy-dark/50 border border-gold/30 text-gold-light rounded-xl font-semibold hover:bg-navy-dark/70 hover:border-gold/50 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleAddEntry}
                disabled={!newEntry.vendor.trim() || !newEntry.taxId.trim() || !newEntry.iban.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-dark rounded-xl font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle className="w-5 h-5" />
                Add to Watchlist
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-xs mb-0.5">{label}</p>
        <p className={`text-white font-medium text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
