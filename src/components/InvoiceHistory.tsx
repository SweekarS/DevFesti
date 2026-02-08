import { motion } from "motion/react";
import { useState } from "react";
import { 
  Search, 
  Filter, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingDown,
  Eye
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  amount: string;
  date: string;
  status: 'safe' | 'warning' | 'fraud';
  fraudScore: number;
  isPaid: boolean;
}

export function InvoiceHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'fraud'>('all');

  // Mock data - will be replaced with actual API data
  const mockInvoices: Invoice[] = [
    {
      id: "1",
      invoiceNumber: "INV-2024-001",
      vendor: "Acme Corporation Ltd.",
      amount: "$12,450.00",
      date: "2024-02-05",
      status: "safe",
      fraudScore: 15.2,
      isPaid: true
    },
    {
      id: "2",
      invoiceNumber: "INV-2024-002",
      vendor: "TechSupply Inc.",
      amount: "$8,920.50",
      date: "2024-02-04",
      status: "warning",
      fraudScore: 58.7,
      isPaid: false
    },
    {
      id: "3",
      invoiceNumber: "INV-2024-003",
      vendor: "Global Services LLC",
      amount: "$25,000.00",
      date: "2024-02-03",
      status: "fraud",
      fraudScore: 92.4,
      isPaid: false
    },
    {
      id: "4",
      invoiceNumber: "INV-2024-004",
      vendor: "Office Supplies Pro",
      amount: "$1,245.75",
      date: "2024-02-02",
      status: "safe",
      fraudScore: 8.3,
      isPaid: true
    },
    {
      id: "5",
      invoiceNumber: "INV-2024-005",
      vendor: "IT Solutions Group",
      amount: "$45,800.00",
      date: "2024-02-01",
      status: "safe",
      fraudScore: 22.1,
      isPaid: true
    }
  ];

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'emerald';
      case 'warning': return 'gold';
      case 'fraud': return 'burgundy';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'fraud': return AlertTriangle;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-gold-light mb-2">Invoice History</h2>
        <p className="text-gray-400">View and manage all analyzed invoices</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or vendor..."
              className="w-full pl-12 pr-4 py-3 bg-navy-dark/50 border border-gold/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'safe', label: 'Safe' },
              { value: 'warning', label: 'Warning' },
              { value: 'fraud', label: 'Fraud' }
            ].map((filter) => (
              <motion.button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  filterStatus === filter.value
                    ? 'bg-gradient-to-r from-gold to-gold-dark text-navy-dark'
                    : 'bg-navy-dark/50 text-gray-400 hover:text-gold-light'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Invoice List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <motion.div
            className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <FileText className="w-16 h-16 text-gold/30 mx-auto mb-4" />
            <p className="text-gray-400">No invoices found</p>
          </motion.div>
        ) : (
          filteredInvoices.map((invoice, index) => {
            const StatusIcon = getStatusIcon(invoice.status);
            const statusColor = getStatusColor(invoice.status);

            return (
              <motion.div
                key={invoice.id}
                className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6 hover:border-gold/30 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ y: -2, scale: 1.01 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Status Indicator */}
                  <div className={`w-16 h-16 bg-gradient-to-br from-${statusColor}/20 to-${statusColor}/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-8 h-8 text-${statusColor}`} />
                  </div>

                  {/* Invoice Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold mb-1">{invoice.invoiceNumber}</h3>
                        <p className="text-gray-400 text-sm">{invoice.vendor}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white mb-1">{invoice.amount}</div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 bg-${statusColor}/10 border border-${statusColor}/30 rounded-lg`}>
                          <TrendingDown className={`w-3 h-3 text-${statusColor}`} />
                          <span className={`text-xs font-medium text-${statusColor}-light`}>
                            {invoice.fraudScore.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{invoice.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          invoice.isPaid ? 'bg-emerald' : 'bg-burgundy'
                        }`}></span>
                        <span className={invoice.isPaid ? 'text-emerald-light' : 'text-burgundy-light'}>
                          {invoice.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      {invoice.status === 'safe' && (
                        <span className="text-emerald-light">✓ All checks passed</span>
                      )}
                      {invoice.status === 'warning' && (
                        <span className="text-gold-light">⚠ Requires review</span>
                      )}
                      {invoice.status === 'fraud' && (
                        <span className="text-burgundy-light">⚠ High risk detected</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <motion.button
                    className="px-6 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold-light hover:bg-gold/20 hover:border-gold/50 transition-all duration-300 flex items-center gap-2 opacity-0 group-hover:opacity-100"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <motion.div
          className="flex justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[1, 2, 3, 4, 5].map((page) => (
            <motion.button
              key={page}
              className={`w-10 h-10 rounded-lg font-medium transition-all duration-300 ${
                page === 1
                  ? 'bg-gradient-to-r from-gold to-gold-dark text-navy-dark'
                  : 'bg-navy-light/50 text-gray-400 hover:text-gold-light hover:bg-navy-light'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {page}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
