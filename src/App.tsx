import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  History, 
  Settings, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Clock, 
  Droplets, 
  Calendar,
  Download,
  Moon,
  Sun,
  Bell,
  Check,
  X,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedingRecord {
  id: string;
  timestamp: number;
  amount: number;
  nextFeedingTime: number;
}

export default function App() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'stats' | 'settings'>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  
  // Form states
  const [amount, setAmount] = useState<number>(120);
  const [interval, setInterval] = useState<number>(3); // hours
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('baby_feeding_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse records", e);
      }
    }
    
    // Set default amount from last record
    const lastRecord = saved ? JSON.parse(saved)[0] : null;
    if (lastRecord) {
      setAmount(lastRecord.amount);
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('baby_feeding_records', JSON.stringify(records));
  }, [records]);

  const handleAddFeeding = () => {
    const now = Date.now();
    const nextTime = now + (interval * 60 * 60 * 1000);
    
    const newRecord: FeedingRecord = {
      id: crypto.randomUUID(),
      timestamp: now,
      amount: amount,
      nextFeedingTime: nextTime
    };

    setRecords([newRecord, ...records]);
    setShowAddModal(false);
    
    // Vibration feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleUpdateFeeding = () => {
    if (!editingRecord) return;
    
    const updatedRecords = records.map(r => 
      r.id === editingRecord.id 
        ? { ...editingRecord, amount, nextFeedingTime: editingRecord.timestamp + (interval * 60 * 60 * 1000) } 
        : r
    );
    
    setRecords(updatedRecords);
    setEditingRecord(null);
    setShowAddModal(false);
  };

  const deleteRecord = (id: string) => {
    if (confirm('Bạn có chắc muốn xoá bản ghi này?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'baby_feeding_data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getNextFeedingCountdown = () => {
    if (records.length === 0) return null;
    const nextTime = records[0].nextFeedingTime;
    const diff = nextTime - Date.now();
    
    if (diff <= 0) return "Đã đến lúc bú!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Còn ${hours}g ${minutes}p`;
  };

  const [countdown, setCountdown] = useState(getNextFeedingCountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getNextFeedingCountdown());
    }, 60000);
    return () => clearInterval(timer);
  }, [records]);

  // Daily stats
  const getDailyStats = () => {
    const stats: Record<string, number> = {};
    records.forEach(r => {
      const date = formatDate(r.timestamp);
      stats[date] = (stats[date] || 0) + r.amount;
    });
    return Object.entries(stats).slice(0, 7);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BabyMilk</h1>
          <p className="text-sm opacity-60">Theo dõi cữ bú của bé</p>
        </div>
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
          <Droplets size={24} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Status Card */}
              <div className="card p-8 text-center space-y-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-xl shadow-blue-500/20">
                <p className="text-sm font-medium opacity-80 uppercase tracking-widest">Cữ bú tiếp theo</p>
                <h2 className="text-5xl font-bold">{countdown || "--:--"}</h2>
                {records.length > 0 && (
                  <p className="text-sm opacity-80">
                    Dự kiến lúc: {formatTime(records[0].nextFeedingTime)}
                  </p>
                )}
              </div>

              {/* Quick Action */}
              <div className="flex flex-col items-center space-y-4">
                <button 
                  onClick={() => {
                    setEditingRecord(null);
                    setShowAddModal(true);
                    setTimeout(() => amountInputRef.current?.focus(), 100);
                  }}
                  className="w-48 h-48 rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/40 flex flex-col items-center justify-center space-y-2 active:scale-95 transition-transform"
                >
                  <Plus size={48} />
                  <span className="font-bold text-lg">Cho bú ngay</span>
                </button>
                <p className="text-sm opacity-60">Lần cuối: {records.length > 0 ? `${formatTime(records[0].timestamp)} (${records[0].amount}ml)` : "Chưa có dữ liệu"}</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold mb-4">Lịch sử bú</h2>
              {records.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <History size={48} className="mx-auto mb-2" />
                  <p>Chưa có lịch sử</p>
                </div>
              ) : (
                records.map(record => (
                  <div key={record.id} className="card p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Droplets size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{record.amount}ml</p>
                        <p className="text-xs opacity-60">{formatDate(record.timestamp)} • {formatTime(record.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => {
                          setEditingRecord(record);
                          setAmount(record.amount);
                          setShowAddModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteRecord(record.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Thống kê 7 ngày</h2>
              <div className="space-y-4">
                {getDailyStats().map(([date, total]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{date}</span>
                      <span className="font-bold">{total} ml</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((total / 1000) * 100, 100)}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <p className="text-center py-20 opacity-40">Chưa có dữ liệu thống kê</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Cài đặt</h2>
              <div className="card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Clock size={20} className="text-gray-400" />
                    <span>Khoảng cách mặc định</span>
                  </div>
                  <select 
                    value={interval} 
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="bg-transparent font-bold text-blue-500 outline-none"
                  >
                    <option value={1}>1 giờ</option>
                    <option value={2}>2 giờ</option>
                    <option value={3}>3 giờ</option>
                    <option value={4}>4 giờ</option>
                  </select>
                </div>
                <button 
                  onClick={exportData}
                  className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Download size={20} className="text-gray-400" />
                    <span>Xuất dữ liệu (JSON)</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Bell size={20} className="text-gray-400" />
                    <span>Thông báo nhắc nhở</span>
                  </div>
                  <div className="w-10 h-6 bg-blue-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
              
              <div className="text-center opacity-40 text-xs">
                <p>BabyMilk Tracker v1.0</p>
                <p>Thiết kế cho bố mẹ bỉm sữa</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-between items-center z-40">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Plus size={24} />} label="Chính" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={24} />} label="Lịch sử" />
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={24} />} label="T.Kê" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="C.Đặt" />
      </nav>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="card w-full max-w-sm p-6 relative z-10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{editingRecord ? "Sửa bản ghi" : "Ghi cữ bú mới"}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 opacity-40"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase opacity-40 tracking-widest">Lượng sữa (ml)</label>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setAmount(Math.max(0, amount - 10))}
                      className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold"
                    >
                      -
                    </button>
                    <input 
                      ref={amountInputRef}
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="flex-1 text-center text-4xl font-bold bg-transparent outline-none"
                    />
                    <button 
                      onClick={() => setAmount(amount + 10)}
                      className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase opacity-40 tracking-widest">Cữ tiếp theo sau (giờ)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(h => (
                      <button 
                        key={h}
                        onClick={() => setInterval(h)}
                        className={`py-2 rounded-xl font-bold transition-colors ${interval === h ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                      >
                        {h}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={editingRecord ? handleUpdateFeeding : handleAddFeeding}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2"
              >
                <Check size={24} />
                <span>{editingRecord ? "Cập nhật" : "Xác nhận"}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 transition-colors ${active ? 'text-blue-500' : 'text-gray-400'}`}
    >
      <div className={`p-1 rounded-lg ${active ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
