import { useMemo } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Shield, TrendingUp, Database, CheckCircle, Zap, Lock } from "lucide-react";

const CODE_SYMBOLS = [
  "{}", "</>", "//", "=>", "()", "[]", "&&", "||", "!=", "===",
  "if", "fn", "let", "var", "0x", "++", "<<", ">>", "**", ";",
  "<%>", "#!", "~/", "::", "->", "<?", "@", "$_", "$", "/**",
];

function useCodeSnowflakes(count: number) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      symbol: CODE_SYMBOLS[Math.floor(Math.random() * CODE_SYMBOLS.length)],
      left: Math.random() * 100,
      size: Math.random() * 0.5 + 0.6,
      opacity: Math.random() * 0.12 + 0.04,
      duration: Math.random() * 18 + 14,
      delay: Math.random() * 20,
      drift: (Math.random() - 0.5) * 60,
    }));
  }, [count]);
}

export function LandingPage() {
  const navigate = useNavigate();
  const snowflakes = useCodeSnowflakes(35);

  const features = [
    {
      icon: Shield,
      title: "AI-Powered Fraud Detection",
      description: "Advanced machine learning algorithms analyze invoices in real-time to identify fraudulent patterns and anomalies."
    },
    {
      icon: TrendingUp,
      title: "Duplicate Payment Prevention",
      description: "Automatically cross-reference invoices against your history to prevent costly duplicate payments."
    },
    {
      icon: Database,
      title: "Smart Watchlist",
      description: "Build an intelligent database of verified Tax IDs and IBANs to strengthen future validations."
    },
    {
      icon: CheckCircle,
      title: "Instant Validation",
      description: "Verify Tax ID and IBAN numbers instantly against official registries and your internal database."
    },
    {
      icon: Zap,
      title: "Lightning Fast Analysis",
      description: "Process and analyze invoices in seconds, not hours. Upload or paste, and get instant insights."
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-grade encryption and security protocols to protect your sensitive financial data."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-navy-light relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-emerald/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-burgundy/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Falling code snowflakes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {snowflakes.map((flake) => (
          <motion.span
            key={flake.id}
            className="absolute font-mono text-gold select-none"
            style={{
              left: `${flake.left}%`,
              top: -30,
              fontSize: `${flake.size}rem`,
              opacity: 0,
            }}
            animate={{
              y: ["0vh", "110vh"],
              x: [0, flake.drift],
              opacity: [0, flake.opacity, flake.opacity, 0],
              rotate: [0, (Math.random() - 0.5) * 40],
            }}
            transition={{
              duration: flake.duration,
              delay: flake.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {flake.symbol}
          </motion.span>
        ))}
      </div>

      {/* Navigation */}
      <motion.nav
        className="relative z-10 flex justify-between items-center px-8 py-6 border-b border-gold/20"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <Shield className="w-8 h-8 text-gold" />
          <span className="text-2xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
            InvoiceGuard
          </span>
        </motion.div>
        <motion.button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-dark rounded-lg font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          Sign In
        </motion.button>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className="inline-block mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
          >
            <span className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-full text-gold-light text-sm font-medium">
              Enterprise Invoice Protection
            </span>
          </motion.div>
          
          <h1 className="mb-6 bg-gradient-to-r from-white via-gold-light to-emerald-light bg-clip-text text-transparent">
            Protect Your Business from
            <br />
            Invoice Fraud & Duplicates
          </h1>
          
          <motion.p
            className="text-xl text-gray-300 max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Leverage AI-powered analysis to detect fraudulent invoices, validate payment details,
            and prevent duplicate payments. Secure, fast, and intelligent.
          </motion.p>

          <motion.div
            className="flex justify-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-gold via-gold-light to-gold text-navy-dark rounded-xl font-bold text-lg shadow-2xl shadow-gold/30 hover:shadow-gold/50 transition-all duration-300"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
            <motion.button
              className="px-8 py-4 bg-navy-light/50 border-2 border-gold/30 text-gold-light rounded-xl font-bold text-lg backdrop-blur-sm hover:bg-navy-light/70 hover:border-gold/50 transition-all duration-300"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              Watch Demo
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group relative bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-8 hover:border-gold/30 transition-all duration-500"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
            >
              
              <div className="relative z-10">
                <div
                  className="w-14 h-14 bg-gradient-to-br from-gold/20 to-emerald/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                >
                  <feature.icon className="w-7 h-7 text-gold" />
                </div>
                
                <h3 className="mb-3 text-gold-light">
                  {feature.title}
                </h3>
                
                <p className="text-gray-300">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <motion.div
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
        >
          {[
            { number: "99.9%", label: "Fraud Detection Accuracy" },
            { number: "<2s", label: "Average Analysis Time" },
            { number: "$50M+", label: "Fraud Prevented" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="text-center p-8 bg-gradient-to-br from-navy/50 to-navy-light/30 backdrop-blur-sm border border-gold/20 rounded-2xl"
              whileHover={{ scale: 1.05, borderColor: "rgba(212, 175, 55, 0.4)" }}
            >
              <motion.div
                className="text-5xl font-bold bg-gradient-to-r from-gold to-emerald-light bg-clip-text text-transparent mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2 + index * 0.1, type: "spring" }}
              >
                {stat.number}
              </motion.div>
              <div className="text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        className="relative z-10 border-t border-gold/20 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-400">
          <p>&copy; 2026 InvoiceGuard. All rights reserved. Enterprise-grade invoice protection.</p>
        </div>
      </motion.footer>
    </div>
  );
}
