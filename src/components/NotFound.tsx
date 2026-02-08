import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { AlertTriangle, Home } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-navy-light flex items-center justify-center p-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-burgundy/20 to-burgundy/10 rounded-3xl mb-8"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <AlertTriangle className="w-12 h-12 text-burgundy" />
        </motion.div>

        <h1 className="mb-4 text-white">404</h1>
        <h2 className="text-gold-light mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <motion.button
          onClick={() => navigate('/')}
          className="px-8 py-4 bg-gradient-to-r from-gold to-gold-dark text-navy-dark rounded-xl font-semibold shadow-lg shadow-gold/30 hover:shadow-gold/50 transition-all duration-300 inline-flex items-center gap-2"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Home className="w-5 h-5" />
          Back to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
