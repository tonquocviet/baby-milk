import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, History, Settings, Trash2, Edit2, 
  ChevronRight, Clock, Droplets, Download, 
  Check, X, BarChart3, Upload, AlertCircle,
  Info, ArrowLeft, MoreVertical, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedingRecord {
  id: string;
  timestamp: number;
  amount: number;
  nextFeedingTime: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'stats' | 'settings'>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  
  // Form states
  const [amount, setAmount] = useState<number>(120);
  const [feedingInterval, setFeedingInterval] = useState<number>(3); // hours
  const [nextFeedingMode, setNextFeedingMode] = useState<'interval' | 'manual'>('interval');
  const [manualNextTime, setManualNextTime] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showFeedingAlert, setShowFeedingAlert] = useState(false);
  const lastAlertedTimeRef = useRef<number | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('baby_feeding_records');
    const savedNotif = localStorage.getItem('baby_notifications_enabled');
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecords(parsed);
        if (parsed.length > 0) {
          setAmount(parsed[0].amount);
          scheduleNextNotification(parsed[0].nextFeedingTime);
        }
      } catch (e) {
        console.error("Failed to parse records", e);
      }
    }
    
    if (savedNotif === 'true') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('baby_feeding_records', JSON.stringify(records));
    if (records.length > 0) {
      scheduleNextNotification(records[0].nextFeedingTime);
    }
  }, [records]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (!('Notification' in window)) {
      if (isIOS) {
        if (!isStandalone) {
          addToast('Vui lòng thêm ứng dụng vào Màn hình chính (Add to Home Screen) để sử dụng thông báo trên iPhone.', 'info');
        } else {
          addToast('iPhone của bạn cần cập nhật lên iOS 16.4 trở lên để hỗ trợ thông báo.', 'error');
        }
      } else {
        addToast('Trình duyệt của bạn không hỗ trợ thông báo.', 'error');
      }
      return;
    }
    
    try {
      // On some browsers, requestPermission doesn't return a promise
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('baby_notifications_enabled', 'true');
        addToast('Đã bật thông báo nhắc nhở');
      } else {
        addToast('Bạn đã từ chối quyền thông báo', 'info');
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      // Fallback for older browsers that use callback
      Notification.requestPermission((permission) => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('baby_notifications_enabled', 'true');
          addToast('Đã bật thông báo nhắc nhở');
        } else {
          addToast('Bạn đã từ chối quyền thông báo', 'info');
        }
      });
    }
  };

  const scheduleNextNotification = (targetTime: number) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    
    const delay = targetTime - Date.now();
    if (delay > 0) {
      notificationTimerRef.current = setTimeout(() => {
        showNotification();
      }, delay);
    }
  };

  const showNotification = () => {
    if (document.visibilityState === 'visible' || Notification.permission !== 'granted') return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('BabyMilk Tracker', {
        body: 'Đã đến lúc cho bé bú rồi bố mẹ ơi! 🍼',
        icon: 'https://picsum.photos/seed/baby/192/192',
        badge: 'https://picsum.photos/seed/baby/192/192',
        vibrate: [200, 100, 200],
        tag: 'feeding-reminder',
        renotify: true
      } as any);
    });
  };

  const handleAddFeeding = () => {
    const now = Date.now();
    let nextTime: number;

    if (nextFeedingMode === 'manual' && manualNextTime) {
      const [hours, minutes] = manualNextTime.split(':').map(Number);
      const nextDate = new Date();
      nextDate.setHours(hours, minutes, 0, 0);
      
      // If the time is in the past, assume it's for the next day
      if (nextDate.getTime() <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      nextTime = nextDate.getTime();
    } else {
      nextTime = now + (feedingInterval * 60 * 60 * 1000);
    }
    
    const newRecord: FeedingRecord = {
      id: crypto.randomUUID(),
      timestamp: now,
      amount: amount,
      nextFeedingTime: nextTime
    };

    setRecords([newRecord, ...records]);
    setShowAddModal(false);
    addToast('Đã ghi cữ bú mới');
    
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const handleUpdateFeeding = () => {
    if (!editingRecord) return;
    
    const now = Date.now();
    let nextTime: number;

    if (nextFeedingMode === 'manual' && manualNextTime) {
      const [hours, minutes] = manualNextTime.split(':').map(Number);
      const nextDate = new Date();
      nextDate.setHours(hours, minutes, 0, 0);
      
      // If the time is in the past, assume it's for the next day
      if (nextDate.getTime() <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      nextTime = nextDate.getTime();
    } else {
      nextTime = Number(editingRecord.timestamp) + (feedingInterval * 60 * 60 * 1000);
    }

    const updatedRecords = records.map(r => 
      r.id === editingRecord.id 
        ? { ...editingRecord, amount, nextFeedingTime: nextTime } 
        : r
    );
    
    setRecords(updatedRecords);
    setEditingRecord(null);
    setShowAddModal(false);
    addToast('Đã cập nhật bản ghi');
    
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const deleteRecord = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Xoá bản ghi',
      message: 'Bạn có chắc muốn xoá bản ghi này?',
      onConfirm: () => {
        setRecords(records.filter(r => r.id !== id));
        addToast('Đã xoá bản ghi');
        if ('vibrate' in navigator) navigator.vibrate(50);
      }
    });
  };

  const clearAllData = () => {
    setConfirmModal({
      show: true,
      title: 'Xoá tất cả dữ liệu',
      message: 'CẢNH BÁO: Tất cả dữ liệu sẽ bị xoá vĩnh viễn. Bạn có chắc chắn?',
      onConfirm: () => {
        setRecords([]);
        localStorage.removeItem('baby_feeding_records');
        addToast('Đã xoá toàn bộ dữ liệu', 'info');
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
    });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `babymilk_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addToast('Đã xuất dữ liệu');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setRecords(json);
          addToast('Đã nhập dữ liệu thành công');
        } else {
          throw new Error('Định dạng không hợp lệ');
        }
      } catch (err) {
        addToast('Lỗi khi nhập dữ liệu', 'error');
      }
    };
    reader.readAsText(file);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getRelativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return formatDate(ts);
  };

  const getCountdownData = () => {
    if (records.length === 0) return { text: "--:--", progress: 0 };
    const now = Date.now();
    const target = Number(records[0].nextFeedingTime);
    const start = Number(records[0].timestamp);
    const total = target - start;
    const elapsed = now - start;
    
    const diff = target - now;
    if (diff <= 0) return { text: "Đã đến cữ bú!", progress: 100 };
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const progress = Math.min((elapsed / total) * 100, 100);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    return { 
      text: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`, 
      progress 
    };
  };

  const [countdown, setCountdown] = useState<{ text: string, progress: number }>(getCountdownData());
  
  useEffect(() => {
    // Update immediately when records change
    setCountdown(getCountdownData());
    
    // Then update every second
    const t = window.setInterval(() => {
      const data = getCountdownData();
      setCountdown(data);
      
      // Show alert if time is up and we haven't alerted for this record yet
      if (records.length > 0) {
        const target = Number(records[0].nextFeedingTime);
        if (Date.now() >= target && lastAlertedTimeRef.current !== target) {
          setShowFeedingAlert(true);
          lastAlertedTimeRef.current = target;
          
          // Also try to show system notification if enabled
          if (notificationsEnabled) {
            showNotification();
          }
        }
      }
    }, 1000);
    
    return () => window.clearInterval(t);
  }, [records]);

  // Grouped history
  const groupedRecords = records.reduce((groups: Record<string, FeedingRecord[]>, record: FeedingRecord) => {
    const date = formatDate(record.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {} as Record<string, FeedingRecord[]>);

  // Stats calculations
  const totalAmount = records.reduce((sum: number, r: FeedingRecord) => sum + r.amount, 0);
  const avgAmount = records.length > 0 ? Math.round(totalAmount / records.length) : 0;
  
  const dailyStatsObj = records.reduce((acc: Record<string, number>, r: FeedingRecord) => {
    const d = formatDate(r.timestamp);
    acc[d] = (acc[d] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  const dailyStats = Object.entries(dailyStatsObj).slice(0, 7);

  const avgDaily = dailyStats.length > 0 
    ? Math.round(dailyStats.reduce((sum: number, [_, val]: [string, number]) => sum + val, 0) / dailyStats.length) 
    : 0;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="p-6 flex justify-between items-center sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-30">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">BabyMilk</h1>
          <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Smart Feeding Tracker</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('settings')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <Settings size={20} className="text-slate-400" />
          </button>
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
              <div className="card p-8 text-center space-y-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl shadow-blue-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-16 -mb-16 blur-2xl" />
                
                <div className="relative flex justify-center">
                  <svg className="w-56 h-56 transform -rotate-90">
                    <circle
                      cx="112"
                      cy="112"
                      r="100"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/10"
                    />
                    <motion.circle
                      cx="112"
                      cy="112"
                      r="100"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={628}
                      initial={{ strokeDashoffset: 628 }}
                      animate={{ strokeDashoffset: 628 - (628 * (countdown.progress as any)) / 100 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeLinecap="round"
                      className="text-white"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-[0.2em] mb-1">Cữ tiếp theo</p>
                    <h2 className={`font-black tracking-tighter leading-none ${countdown.text.length > 12 ? 'text-xl' : countdown.text.length > 10 ? 'text-2xl' : countdown.text.length > 8 ? 'text-3xl' : 'text-5xl'}`}>
                      {countdown.text}
                    </h2>
                  </div>
                </div>

                {records.length > 0 && (
                  <div className="flex items-center justify-center space-x-2 text-xs font-bold bg-white/10 py-2.5 px-5 rounded-full w-fit mx-auto backdrop-blur-sm">
                    <Clock size={14} />
                    <span>Dự kiến lúc {formatTime(records[0].nextFeedingTime)}</span>
                  </div>
                )}
              </div>

              {/* Quick Action Button */}
              <div className="flex justify-center -mt-12 relative z-20">
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl"
                  />
                  <button 
                    onClick={() => {
                      setEditingRecord(null);
                      setNextFeedingMode('interval');
                      setShowAddModal(true);
                      if ('vibrate' in navigator) navigator.vibrate(50);
                      setTimeout(() => amountInputRef.current?.focus(), 150);
                    }}
                    className="w-32 h-32 rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/40 flex flex-col items-center justify-center space-y-1 active:scale-90 transition-transform relative z-10 border-4 border-slate-50 dark:border-slate-950"
                  >
                    <Plus size={40} strokeWidth={4} />
                    <span className="font-black text-xs uppercase tracking-widest">Cho bú</span>
                  </button>
                </div>
              </div>

              {/* Mini Stats & Last Feeding */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4" id="mini-stats-grid">
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="card p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-default"
                  >
                    <div className="flex items-center space-x-2 mb-2 opacity-40">
                      <Droplets size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Hôm nay</p>
                    </div>
                    <p className="text-2xl font-black text-blue-500">
                      {dailyStats.find(([d]) => d === formatDate(Date.now()))?.[1] || 0} <span className="text-xs font-bold opacity-40">ml</span>
                    </p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className="card p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-default"
                  >
                    <div className="flex items-center space-x-2 mb-2 opacity-40">
                      <History size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Số cữ bú</p>
                    </div>
                    <p className="text-2xl font-black text-indigo-500">
                      {records.filter(r => formatDate(r.timestamp) === formatDate(Date.now())).length} <span className="text-xs font-bold opacity-40">lần</span>
                    </p>
                  </motion.div>
                </div>

                {records.length > 0 && (
                  <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Clock size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-0.5">Lần cuối bú</p>
                        <p className="font-black text-slate-700 dark:text-slate-200">{getRelativeTime(records[0].timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-500">{records[0].amount}ml</p>
                      <p className="text-[10px] font-bold opacity-40">{formatTime(records[0].timestamp)}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-black">Lịch sử</h2>
                <p className="text-xs font-bold opacity-40">{records.length} bản ghi</p>
              </div>

              {records.length === 0 ? (
                <div className="text-center py-32 opacity-20">
                  <History size={64} className="mx-auto mb-4" />
                  <p className="font-bold">Chưa có dữ liệu</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {(Object.entries(groupedRecords) as [string, FeedingRecord[]][]).map(([date, items]) => (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{date}</span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>
                      <div className="space-y-3">
                        {items.map(record => (
                          <div key={record.id} className="card p-4 flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <Droplets size={22} />
                              </div>
                              <div>
                                <p className="font-black text-lg">{record.amount}ml</p>
                                <p className="text-xs font-bold opacity-40">{formatTime(record.timestamp)}</p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => {
                                  setEditingRecord(record);
                                  setAmount(record.amount);
                                  setNextFeedingMode('manual');
                                  const date = new Date(record.nextFeedingTime);
                                  setManualNextTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => deleteRecord(record.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-black">Thống kê</h2>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-5 bg-blue-500 text-white border-none">
                  <p className="text-[10px] font-bold opacity-70 uppercase mb-1">TB mỗi ngày</p>
                  <p className="text-2xl font-black">{avgDaily} <span className="text-sm">ml</span></p>
                </div>
                <div className="card p-5 bg-indigo-500 text-white border-none">
                  <p className="text-[10px] font-bold opacity-70 uppercase mb-1">TB mỗi cữ</p>
                  <p className="text-2xl font-black">{avgAmount} <span className="text-sm">ml</span></p>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-6">
                <h3 className="text-sm font-black uppercase opacity-40 tracking-widest">7 ngày gần nhất</h3>
                <div className="space-y-5">
                  {dailyStats.length === 0 ? (
                    <p className="text-center py-10 opacity-30 text-sm">Chưa có dữ liệu</p>
                  ) : (
                    dailyStats.map(([date, total]: [string, number]) => (
                      <div key={date} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{date}</span>
                          <span className="text-blue-500">{total} ml</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((total / 1200) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3 text-slate-400 mb-4">
                  <Info size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Thông tin thêm</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="opacity-40">Tổng lượng sữa</p>
                    <p className="font-black">{totalAmount} ml</p>
                  </div>
                  <div>
                    <p className="opacity-40">Tổng số cữ bú</p>
                    <p className="font-black">{records.length} lần</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center space-x-4">
                <button onClick={() => setActiveTab('home')} className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-black">Cài đặt</h2>
              </div>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2">Ứng dụng</h3>
                  <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <Clock size={20} className="text-slate-400" />
                        <span className="font-bold">Khoảng cách cữ bú</span>
                      </div>
                      <select 
                        value={feedingInterval} 
                        onChange={(e) => setFeedingInterval(Number(e.target.value))}
                        className="bg-transparent font-black text-blue-500 outline-none"
                      >
                        {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(h => (
                          <option key={h} value={h}>{h} giờ</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <Bell size={20} className="text-slate-400" />
                        <span className="font-bold">Thông báo nhắc nhở</span>
                      </div>
                      <button 
                        onClick={notificationsEnabled ? () => {
                          setNotificationsEnabled(false);
                          localStorage.setItem('baby_notifications_enabled', 'false');
                          addToast('Đã tắt thông báo', 'info');
                        } : requestNotificationPermission}
                        className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                      >
                        <motion.div 
                          animate={{ x: notificationsEnabled ? 26 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2">Dữ liệu</h3>
                  <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={exportData}
                      className="w-full p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Download size={20} className="text-slate-400" />
                        <span className="font-bold">Xuất dữ liệu (JSON)</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Upload size={20} className="text-slate-400" />
                        <span className="font-bold">Nhập dữ liệu</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={importData} 
                      accept=".json" 
                      className="hidden" 
                    />
                    <button 
                      onClick={clearAllData}
                      className="w-full p-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-500"
                    >
                      <div className="flex items-center space-x-3">
                        <Trash2 size={20} />
                        <span className="font-bold">Xoá tất cả dữ liệu</span>
                      </div>
                    </button>
                  </div>
                </section>
              </div>
              
              <div className="text-center space-y-1 py-4">
                <p className="text-[10px] font-black uppercase opacity-20 tracking-[0.3em]">BabyMilk Tracker v1.2</p>
                <p className="text-[10px] font-bold opacity-20">Made with ❤️ for Parents</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-8 py-4 flex justify-between items-center z-40">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Plus size={26} strokeWidth={3} />} label="Ghi" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={26} />} label="Lịch sử" />
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 size={26} />} label="T.Kê" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={26} />} label="Cài đặt" />
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              className="card w-full max-w-sm p-8 relative z-10 space-y-8 bg-white dark:bg-slate-900 border-none shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">{editingRecord ? "Sửa cữ bú" : "Ghi cữ bú mới"}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em] text-center block">Lượng sữa (ml)</label>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl">
                    <button 
                      onClick={() => {
                        setAmount(Math.max(0, amount - 10));
                        if ('vibrate' in navigator) navigator.vibrate(20);
                      }}
                      className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl font-black text-blue-500 active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <input 
                      ref={amountInputRef}
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-24 text-center text-5xl font-black bg-transparent outline-none text-slate-800 dark:text-white"
                    />
                    <button 
                      onClick={() => {
                        setAmount(amount + 10);
                        if ('vibrate' in navigator) navigator.vibrate(20);
                      }}
                      className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl font-black text-blue-500 active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em]">Cữ tiếp theo</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button 
                        onClick={() => setNextFeedingMode('interval')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${nextFeedingMode === 'interval' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-500' : 'text-slate-400'}`}
                      >
                        Khoảng cách
                      </button>
                      <button 
                        onClick={() => {
                          setNextFeedingMode('manual');
                          if (!manualNextTime) {
                            const date = new Date(Date.now() + (feedingInterval * 60 * 60 * 1000));
                            setManualNextTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${nextFeedingMode === 'manual' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-500' : 'text-slate-400'}`}
                      >
                        Giờ cụ thể
                      </button>
                    </div>
                  </div>

                  {nextFeedingMode === 'interval' ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 2.5, 3, 4].map(h => (
                        <button 
                          key={h}
                          onClick={() => {
                            setFeedingInterval(h);
                            if ('vibrate' in navigator) navigator.vibrate(20);
                          }}
                          className={`py-3 rounded-2xl font-black transition-all ${feedingInterval === h ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                        >
                          {h}g
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl">
                      <input 
                        type="time" 
                        value={manualNextTime}
                        onChange={(e) => setManualNextTime(e.target.value)}
                        className="text-4xl font-black bg-transparent outline-none text-blue-500 text-center w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={editingRecord ? handleUpdateFeeding : handleAddFeeding}
                className="w-full py-5 bg-blue-500 text-white rounded-3xl font-black text-xl shadow-xl shadow-blue-500/40 flex items-center justify-center space-x-3 active:scale-95 transition-transform"
              >
                <Check size={28} strokeWidth={3} />
                <span>{editingRecord ? "Cập nhật" : "Xác nhận"}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-xs p-6 relative z-10 space-y-6 bg-white dark:bg-slate-900 border-none shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-black">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{confirmModal.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="py-3 rounded-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  Huỷ
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="py-3 rounded-2xl font-black bg-red-500 text-white shadow-lg shadow-red-500/30"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feeding Alert Modal */}
      <AnimatePresence>
        {showFeedingAlert && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-600/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="w-full max-w-xs p-8 relative z-10 text-center space-y-8"
            >
              <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-white/20"
                >
                  <Droplets size={64} className="text-blue-500" />
                </motion.div>
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white rounded-full -z-10"
                />
              </div>
              
              <div className="space-y-3 text-white">
                <h2 className="text-3xl font-black tracking-tighter">Đã đến cữ bú!</h2>
                <p className="text-white/70 font-bold">Bé yêu đang đợi sữa rồi bố mẹ ơi. Hãy chuẩn bị sữa cho bé nhé! 🍼</p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowFeedingAlert(false);
                    setShowAddModal(true);
                  }}
                  className="w-full py-5 bg-white text-blue-600 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-transform"
                >
                  Ghi cữ bú ngay
                </button>
                <button 
                  onClick={() => setShowFeedingAlert(false)}
                  className="w-full py-4 text-white/60 font-black text-sm uppercase tracking-widest"
                >
                  Để sau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed top-6 left-6 right-6 z-[60] pointer-events-none space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-center space-x-3 pointer-events-auto ${
                toast.type === 'error' ? 'bg-red-500 text-white' : 
                toast.type === 'info' ? 'bg-slate-800 text-white' : 
                'bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-800'
              }`}
            >
              {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} className="text-green-500" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 transition-all ${active ? 'text-blue-500 scale-110' : 'text-slate-400'}`}
    >
      <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
