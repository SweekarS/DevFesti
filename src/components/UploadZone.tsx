import { motion } from "motion/react";
import { useState, useRef } from "react";
import { Upload, FileText, Image, X, Sparkles, Search } from "lucide-react";

interface UploadZoneProps {
  onUpload: (files: File[], priceCheck: boolean) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [priceCheck, setPriceCheck] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png'
    );
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (selectedFiles.length > 0 || pastedText.trim()) {
      onUpload(selectedFiles, priceCheck);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-gold-light mb-2">Upload Invoice for Analysis</h2>
        <p className="text-gray-400">Upload invoice images or paste invoice text for AI-powered fraud detection</p>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        className={`relative bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ${
          isDragging 
            ? 'border-gold bg-gold/5 scale-105' 
            : 'border-gold/30 hover:border-gold/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.01 }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-gold/5 via-emerald/5 to-gold/5 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ backgroundSize: '200% 200%' }}
        />

        <div className="relative z-10 text-center">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gold/20 to-emerald/20 rounded-2xl mb-6"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Upload className="w-10 h-10 text-gold" />
          </motion.div>

          <h3 className="text-white mb-2">
            Drag & Drop Invoice Images
          </h3>
          <p className="text-gray-400 mb-6">
            or click to browse your files
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-dark rounded-xl font-semibold shadow-lg shadow-gold/30 hover:shadow-gold/50 transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Browse Files
          </motion.button>

          <p className="text-sm text-gray-500 mt-4">
            Supported formats: JPEG, JPG, PNG
          </p>
        </div>
      </motion.div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <h3 className="text-gold-light">Selected Files ({selectedFiles.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFiles.map((file, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-xl p-4 flex items-center gap-3 group hover:border-gold/40 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-emerald/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{file.name}</p>
                  <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-burgundy/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4 text-burgundy" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* OR Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gold/20"></div>
        <span className="text-gray-500 font-medium">OR</span>
        <div className="flex-1 h-px bg-gold/20"></div>
      </div>

      {/* Paste Invoice Text */}
      <motion.div
        className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6 hover:border-gold/30 transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-gold" />
          <h3 className="text-gold-light">Paste Invoice Text</h3>
        </div>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste invoice details here (invoice number, amount, vendor, tax ID, IBAN, etc.)..."
          className="w-full h-40 bg-navy-dark/50 border border-gold/20 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-all duration-300 resize-none"
        />
      </motion.div>

      {/* Price Check Option */}
      <motion.div
        className="bg-gradient-to-br from-navy-light/50 to-navy/50 backdrop-blur-sm border border-gold/20 rounded-2xl p-6 hover:border-gold/30 transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <label className="flex items-center gap-4 cursor-pointer group">
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={priceCheck}
              onChange={(e) => setPriceCheck(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-navy-dark/50 border border-gold/30 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-emerald peer-checked:to-emerald-dark peer-checked:border-emerald/50 transition-all duration-300" />
            <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-gray-400 rounded-full transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-white shadow-lg" />
          </div>
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-5 h-5 text-gold" />
            <div>
              <p className="text-white font-semibold">Would you like to price check?</p>
              <p className="text-gray-400 text-sm">Scrapes the internet to verify if you're getting a fair price or being overcharged</p>
            </div>
          </div>
          {priceCheck && (
            <motion.span
              className="px-3 py-1 bg-emerald/20 border border-emerald/30 rounded-full text-emerald-light text-xs font-semibold flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              Enabled
            </motion.span>
          )}
        </label>
      </motion.div>

      {/* Analyze Button */}
      <motion.button
        onClick={handleAnalyze}
        disabled={selectedFiles.length === 0 && !pastedText.trim()}
        className="w-full py-4 bg-gradient-to-r from-emerald via-emerald-light to-emerald text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald/30 hover:shadow-emerald/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: selectedFiles.length === 0 && !pastedText.trim() ? 1 : 1.02, y: selectedFiles.length === 0 && !pastedText.trim() ? 0 : -2 }}
        whileTap={{ scale: selectedFiles.length === 0 && !pastedText.trim() ? 1 : 0.98 }}
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        Analyze with AI
        <Sparkles className="w-6 h-6 group-hover:-rotate-12 transition-transform duration-300" />
      </motion.button>
    </div>
  );
}
