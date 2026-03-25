import React, { useState, useEffect, useRef } from 'react';
import { Shield, User, Menu, X, ChevronRight, AlertTriangle, FileText, BarChart3, Users, Mic, CheckCircle, Trash2, Gavel, Camera, MessageSquare, Download, Map as MapIcon, WifiOff, Star, Bell, MapPin } from 'lucide-react';
import { Language, UserRole, Incident, Alert, PatrolAssignment } from './types';
import { TRANSLATIONS, MENU_ITEMS, OFFICER_MENU, ADMIN_MENU, ADMIN_CODES } from './constants';
import { LanguageToggle } from './components/LanguageToggle';
import { MapComponent } from './components/MapComponent';
import { summarizeIncident, predictResourceAllocation, buildLegalCase } from './services/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { GlassEffect, GlassCard, GlassButton } from './components/GlassComponents';
import { CameraCapture } from './components/CameraCapture';
import { db, auth } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// --- Error Boundary ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the app, just log and alert
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('Oromo');
  const [role, setRole] = useState<UserRole>('Citizen');
  const [currentPage, setCurrentPage] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedIncidentForCase, setSelectedIncidentForCase] = useState<Incident | null>(null);
  const [aiCaseText, setAiCaseText] = useState<string | null>(null);
  const [isCaseLoading, setIsCaseLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSOS, setShowSOS] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [showAdminCodeInput, setShowAdminCodeInput] = useState(false);
  const [adminCodeError, setAdminCodeError] = useState('');
  const [trackingIncidentId, setTrackingIncidentId] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Parallax setup
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 300]);
  const glassY = useTransform(scrollY, [0, 1000], [0, 150]);

  // Translation Helper
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Firebase & Network Setup ---
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(!!user);
      setIsAuthChecking(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      const incData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(incData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'incidents'));

    const qAlerts = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      if (alertData.length > alerts.length && alerts.length > 0) {
        showToast(`New Alert: ${alertData[0].title}`);
      }
      setAlerts(alertData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'alerts'));

    return () => {
      unsubIncidents();
      unsubAlerts();
    };
  }, [isAuthReady]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Shared Logic ---
  const toggleRole = (newRole: UserRole) => {
    setRole(newRole);
    setCurrentPage(newRole === 'Citizen' ? 'home' : newRole === 'Officer' ? 'hotspots' : 'admin_panel');
    setIsSidebarOpen(false);
  };

  const updateIncidentStatus = async (id: string, status: Incident['status']) => {
    try {
      await updateDoc(doc(db, 'incidents', id), { status });
      showToast(`Incident status updated to ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `incidents/${id}`);
    }
  };

  const handleSOS = async () => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'incidents'), {
        date: new Date().toISOString().split('T')[0],
        location: { lat: 9.03 + (Math.random() * 0.02 - 0.01), lng: 38.74 + (Math.random() * 0.02 - 0.01) },
        status: 'Critical',
        description: 'EMERGENCY SOS TRIGGERED',
        summary: 'SOS Alert',
        evidenceType: 'none',
        citizenName: 'Anonymous',
        userId: auth.currentUser.uid,
        createdAt: Date.now()
      });
      setShowSOS(false);
      showToast('SOS Alert Sent to Authorities!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'incidents');
    }
  };

  const handleBuildCase = async (incident: Incident) => {
    setSelectedIncidentForCase(incident);
    setAiCaseText(null);
    setIsCaseLoading(true);
    try {
      const caseText = await buildLegalCase(incident, lang, incident.reporterName || 'Unknown');
      setAiCaseText(caseText || "Failed to generate case.");
    } catch (err) {
      setAiCaseText("Error building case. Please check your API configuration.");
    } finally {
      setIsCaseLoading(false);
    }
  };

  const toggleTracking = (incidentId: string) => {
    if (trackingIncidentId === incidentId) {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setTrackingIncidentId(null);
      setWatchId(null);
      showToast("Location tracking stopped.");
    } else {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported by this browser.");
        return;
      }

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const incRef = doc(db, 'incidents', incidentId);
            await updateDoc(incRef, {
              officerLocation: { lat: latitude, lng: longitude, timestamp: Date.now() }
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `incidents/${incidentId}`);
          }
        },
        (err) => {
          showToast("Error tracking location: " + err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      
      setWatchId(id);
      setTrackingIncidentId(incidentId);
      showToast("Real-time tracking started.");
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  // --- Sub-Components ---
  const Header = () => (
    <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/50 dark:border-slate-800/50 text-[#2A3F54] dark:text-white p-4 sticky top-0 z-50 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
          <Menu size={24} />
        </button>
        <Shield className="text-[#1ABC9C] dark:text-teal-400" size={28} />
        <h1 className="text-xl font-bold tracking-tight hidden md:block">SPA</h1>
      </div>
      <div className="flex items-center gap-4">
        {isOffline && (
          <div className="flex items-center gap-1 text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
            <WifiOff size={14} /> Offline
          </div>
        )}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <LanguageToggle current={lang} onSelect={setLang} />
        <div className="flex items-center gap-2 bg-[#3498DB]/10 dark:bg-blue-500/20 text-[#3498DB] dark:text-blue-400 px-4 py-2 rounded-full cursor-pointer hover:bg-[#3498DB]/20 dark:hover:bg-blue-500/30 transition-all font-bold">
          <User size={18} />
          <span className="text-sm">{role}</span>
        </div>
      </div>
    </header>
  );

  const Sidebar = () => {
    const menu = role === 'Citizen' ? MENU_ITEMS : role === 'Officer' ? OFFICER_MENU : ADMIN_MENU;
    return (
      <>
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden" 
              onClick={() => setIsSidebarOpen(false)} 
            />
          )}
        </AnimatePresence>
        <aside className={`fixed top-0 left-0 h-full bg-white/80 backdrop-blur-2xl border-r border-white/50 w-64 z-[70] transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <Shield className="text-[#1ABC9C]" size={24} />
                <span className="font-bold text-[#2A3F54]">{t('app_title')}</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-black/5 rounded-full">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {menu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium ${
                    currentPage === item.id 
                    ? 'bg-[#1ABC9C] text-white shadow-lg shadow-[#1ABC9C]/30' 
                    : 'text-gray-600 hover:bg-black/5'
                  }`}
                >
                  {item.icon}
                  <span>{t(item.label)}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-200/50">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Switch View</label>
               <div className="grid grid-cols-1 gap-1">
                 {['Citizen', 'Officer', 'Admin'].map((r) => (
                   <button
                    key={r}
                    onClick={() => toggleRole(r as UserRole)}
                    className={`text-left px-4 py-2 text-sm rounded-xl transition-all ${role === r ? 'bg-[#2A3F54] text-white font-bold shadow-md' : 'text-gray-500 hover:bg-black/5 font-medium'}`}
                   >
                     {r} View
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </aside>
      </>
    );
  };

  // --- Page Content Components ---

  const CitizenHome = () => (
    <div className="space-y-6 relative z-10">
      <GlassCard className="p-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4 text-[#2C3E50] tracking-tight">Safe City Initiative</h2>
          <p className="text-gray-700 max-w-lg mb-8 text-lg font-medium">Empowering citizens to report incidents and receive real-time safety alerts across Ethiopia. Your contribution makes a difference.</p>
          <div className="flex flex-wrap gap-4">
            <GlassButton 
              onClick={() => setCurrentPage('report')}
              className="bg-[#1ABC9C] text-white px-8 py-4 text-lg flex items-center gap-2"
            >
              {t('report_incident')} <ChevronRight size={20} />
            </GlassButton>
            <GlassButton 
              onClick={() => setShowSOS(true)}
              className="bg-red-500 text-white px-8 py-4 text-lg flex items-center gap-2"
            >
              <AlertTriangle size={20} /> SOS Emergency
            </GlassButton>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#1ABC9C]/20 to-transparent transform translate-x-12" />
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#2A3F54]">
            <Bell className="text-yellow-500" size={24} />
            {t('safety_alerts')}
          </h3>
          <div className="space-y-4">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`p-4 rounded-2xl border-l-4 bg-white/50 backdrop-blur-sm ${alert.severity === 'high' ? 'border-red-500' : 'border-yellow-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-[#2A3F54]">{alert.title}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase bg-black/5 px-2 py-1 rounded-md">{alert.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">{alert.message}</p>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-gray-500 text-sm italic">No active alerts.</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
           <h3 className="text-xl font-bold mb-6 text-[#2A3F54]">Emergency Contacts</h3>
           <div className="space-y-3">
             {[
               { name: 'National Police', num: '991', icon: <Shield size={20} className="text-blue-500"/> },
               { name: 'Ambulance', num: '907', icon: <AlertTriangle size={20} className="text-red-500"/> },
               { name: 'Fire Department', num: '939', icon: <AlertTriangle size={20} className="text-orange-500"/> }
             ].map(item => (
               <div key={item.num} className="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-all cursor-pointer">
                 <div className="flex items-center gap-3">
                   {item.icon}
                   <span className="font-bold text-gray-700">{item.name}</span>
                 </div>
                 <span className="font-black text-xl text-[#2A3F54]">{item.num}</span>
               </div>
             ))}
           </div>
        </GlassCard>
      </div>
    </div>
  );

  const ReportIncident = () => {
    const [summary, setSummary] = useState('');
    const [desc, setDesc] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reporterPhone, setReporterPhone] = useState('');
    const [reporterFayda, setReporterFayda] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

    const handleUseCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => showToast("Could not get location")
        );
      } else {
        showToast("Geolocation is not supported by this browser.");
      }
    };

    const handleAutoSummary = async () => {
      if (!desc) return;
      setLoading(true);
      const res = await summarizeIncident(desc, lang);
      setSummary(res || '');
      setLoading(false);
    };

    const handleSubmit = async () => {
      if (!desc || !auth.currentUser) return;
      try {
        await addDoc(collection(db, 'incidents'), {
          date: new Date().toISOString().split('T')[0],
          location: location || { lat: 9.03 + (Math.random() * 0.02 - 0.01), lng: 38.74 + (Math.random() * 0.02 - 0.01) },
          status: 'Pending',
          description: desc,
          summary: summary || desc.slice(0, 50),
          citizenName: reporterName || 'Local Resident',
          reporterName,
          reporterPhone,
          reporterFayda,
          evidenceType: evidenceUrl ? 'image' : 'none',
          evidenceUrl: evidenceUrl || null,
          userId: auth.currentUser.uid,
          createdAt: Date.now()
        });
        setSubmitted(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'incidents');
      }
    };

    if (submitted) {
      return (
        <GlassCard className="flex flex-col items-center justify-center py-20 max-w-2xl mx-auto">
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} 
            className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20"
          >
            <CheckCircle size={40} />
          </motion.div>
          <h2 className="text-3xl font-black text-[#2A3F54] mb-2">Report Submitted</h2>
          <p className="text-gray-600 font-medium mb-8">Thank you for helping keep our city safe.</p>
          
          <div className="w-full max-w-md bg-white/50 p-6 rounded-3xl text-center">
            <p className="text-sm font-bold text-gray-500 uppercase mb-4">Rate your experience</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`p-2 transition-all ${rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-300 hover:text-yellow-200'}`}>
                  <Star size={32} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <GlassButton onClick={() => setCurrentPage('home')} className="w-full bg-[#2A3F54] text-white py-3">
              Return Home
            </GlassButton>
          </div>
        </GlassCard>
      );
    }

    return (
      <GlassCard className="max-w-3xl mx-auto p-8 space-y-8">
        <h2 className="text-3xl font-black text-[#2A3F54] dark:text-white">{t('report_incident')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('full_name')}</label>
            <input 
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/80 dark:border-slate-700/80 rounded-2xl focus:ring-4 focus:ring-[#1ABC9C]/20 outline-none transition-all font-medium text-gray-800 dark:text-white shadow-inner" 
              placeholder="Your Full Name"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('phone_number')}</label>
            <input 
              type="tel"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/80 dark:border-slate-700/80 rounded-2xl focus:ring-4 focus:ring-[#1ABC9C]/20 outline-none transition-all font-medium text-gray-800 dark:text-white shadow-inner" 
              placeholder="09..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('fayda_fin')}</label>
            <input 
              type="text"
              value={reporterFayda}
              onChange={(e) => setReporterFayda(e.target.value)}
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/80 dark:border-slate-700/80 rounded-2xl focus:ring-4 focus:ring-[#1ABC9C]/20 outline-none transition-all font-medium text-gray-800 dark:text-white shadow-inner" 
              placeholder="Fayda Fin Number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">Description</label>
          <textarea 
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full h-40 p-5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/80 dark:border-slate-700/80 rounded-3xl focus:ring-4 focus:ring-[#1ABC9C]/20 outline-none transition-all resize-none font-medium text-gray-800 dark:text-white shadow-inner" 
            placeholder="Tell us what happened in detail..."
          />
          <button 
            onClick={handleAutoSummary}
            disabled={loading}
            className="mt-3 text-sm text-[#3498DB] dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 transition-colors bg-blue-50/50 dark:bg-blue-900/30 px-4 py-2 rounded-full"
          >
            {loading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/> : '✨ Auto-Generate Summary with AI'}
          </button>
        </div>

        <AnimatePresence>
          {summary && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-blue-50/80 backdrop-blur-md rounded-2xl border border-blue-100/50 shadow-sm">
               <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">AI Summary</label>
               <p className="text-sm text-blue-900 font-medium leading-relaxed">{summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 gap-6">
           <div className="space-y-3">
             <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">{t('upload_evidence')}</label>
             {evidenceUrl ? (
               <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-md">
                 <img src={evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                 <button onClick={() => setEvidenceUrl(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md">
                   <X size={16} />
                 </button>
               </div>
             ) : (
               <div className="flex gap-3">
                 <GlassButton onClick={() => setShowCamera(true)} className="flex-1 py-4 bg-white/80 text-[#2A3F54] flex flex-col items-center justify-center gap-2 h-32">
                   <Camera size={28} className="text-[#3498DB]" />
                   <span className="text-sm">Take Photo</span>
                 </GlassButton>
                 <label className="flex-1 py-4 bg-white/80 text-[#2A3F54] flex flex-col items-center justify-center gap-2 h-32 rounded-3xl border border-white/80 shadow-md cursor-pointer hover:scale-[1.02] transition-transform">
                   <FileText size={28} className="text-[#1ABC9C]" />
                   <span className="text-sm font-bold">Upload File</span>
                   <input type="file" className="hidden" />
                 </label>
               </div>
             )}
           </div>
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Location</label>
               <button onClick={handleUseCurrentLocation} className="text-xs text-[#3498DB] font-bold hover:underline flex items-center gap-1">
                 <MapIcon size={12} /> Use My Location
               </button>
             </div>
             <div className="h-32 rounded-3xl overflow-hidden border-2 border-white shadow-md">
               <MapComponent 
                 zoom={14} 
                 onClick={(lat, lng) => setLocation({lat, lng})}
                 markers={location ? [{lat: location.lat, lng: location.lng, title: 'Incident Location'}] : []}
               />
             </div>
             {location && <p className="text-xs text-gray-500 font-medium">Selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
           </div>
        </div>

        <GlassButton onClick={handleSubmit} className="w-full bg-[#1ABC9C] text-white py-5 text-lg shadow-xl shadow-[#1ABC9C]/20">
          {t('submit')}
        </GlassButton>

        {showCamera && (
          <CameraCapture 
            onCapture={(base64) => { setEvidenceUrl(base64); setShowCamera(false); }} 
            onCancel={() => setShowCamera(false)} 
          />
        )}
      </GlassCard>
    );
  };

  const OfficerDashboard = () => {
    const [predicting, setPredicting] = useState(false);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [fullImageModalUrl, setFullImageModalUrl] = useState<string | null>(null);
    const [mapModalIncident, setMapModalIncident] = useState<Incident | null>(null);

    const handlePredict = async () => {
      setPredicting(true);
      const res = await predictResourceAllocation(incidents.length);
      setAllocations(res);
      setPredicting(false);
    };

    if (currentPage === 'hotspots') {
      return (
        <div className="space-y-6 relative z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-[#2A3F54]">{t('hotspot_map')}</h2>
            <GlassButton 
              onClick={handlePredict}
              className="bg-[#3498DB] text-white px-6 py-3 text-sm shadow-lg shadow-[#3498DB]/20"
            >
              {predicting ? 'Processing AI Models...' : 'Predict Resource Needs ✨'}
            </GlassButton>
          </div>

          <GlassCard className="h-[500px] p-2">
            <div className="w-full h-full rounded-[1.25rem] overflow-hidden">
              <MapComponent markers={incidents.flatMap(i => {
                const m = [{ lat: i.location.lat, lng: i.location.lng, title: i.summary || i.id }];
                if (i.officerLocation) {
                  m.push({ lat: i.officerLocation.lat, lng: i.officerLocation.lng, title: `Officer (${i.id})` });
                }
                return m;
              })} />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-6 text-[#2A3F54]">{t('predicted_resources')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="pb-4 font-bold">Officer</th>
                    <th className="pb-4 font-bold">Vehicle</th>
                    <th className="pb-4 font-bold">Shift</th>
                    <th className="pb-4 font-bold">Zone</th>
                    <th className="pb-4 font-bold">ETA</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium text-gray-700">
                  {(allocations.length > 0 ? allocations : [
                    { officer: 'Tadesse K.', vehicle: 'SUV-22', shift: 'Day', zone: 'Sector A', eta: '10 mins' },
                    { officer: 'Mulugeta S.', vehicle: 'MOT-05', shift: 'Day', zone: 'Sector C', eta: '5 mins' }
                  ]).map((a, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-white/50 transition-colors">
                      <td className="py-4 font-bold text-[#2A3F54]">{a.officer}</td>
                      <td className="py-4">{a.vehicle}</td>
                      <td className="py-4">{a.shift}</td>
                      <td className="py-4">{a.zone}</td>
                      <td className="py-4 text-[#27AE60] font-black">{a.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      );
    }

    const [filterStatus, setFilterStatus] = useState<string>('All');

    const filteredIncidents = incidents.filter(i => filterStatus === 'All' || i.status === filterStatus);

    const exportLegalDraft = () => {
      if (!aiCaseText) return;
      const blob = new Blob([aiCaseText], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal_Draft_${selectedIncidentForCase?.id || 'Incident'}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (currentPage === 'report') {
      return (
        <div className="space-y-6 relative z-10">
           <div className="flex justify-between items-center">
             <h2 className="text-3xl font-black text-[#2A3F54]">{t('report_incident')} - Investigation List</h2>
             <div className="flex gap-4">
               <select 
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="bg-white/50 border border-white/50 rounded-xl px-4 py-2 text-sm font-bold text-[#2A3F54] outline-none focus:ring-2 focus:ring-[#1ABC9C]"
               >
                 <option value="All">All Statuses</option>
                 <option value="Pending">Pending</option>
                 <option value="Validated">Validated</option>
                 <option value="Critical">Critical</option>
                 <option value="Resolved">Resolved</option>
               </select>
             </div>
           </div>

           <GlassCard className="overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-white/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                   <tr>
                     <th className="px-6 py-5">Incident</th>
                     <th className="px-6 py-5">Location</th>
                     <th className="px-6 py-5">Evidence</th>
                     <th className="px-6 py-5">Status</th>
                     <th className="px-6 py-5">Action</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm font-medium">
                   {filteredIncidents.map(i => (
                     <tr key={i.id} className="border-b border-white/50 last:border-0 hover:bg-white/60 transition-colors">
                       <td className="px-6 py-5">
                         <p className="font-black text-[#2A3F54] text-base">{i.id}</p>
                         <p className="text-xs text-gray-500 mt-1 line-clamp-1">{i.summary}</p>
                       </td>
                       <td className="px-6 py-5">
                         <p className="text-xs text-gray-500 font-mono">{i.location.lat.toFixed(4)}, {i.location.lng.toFixed(4)}</p>
                         <button 
                           onClick={() => setMapModalIncident(i)}
                           className="text-xs text-[#3498DB] font-bold hover:underline flex items-center gap-1 mt-1"
                         >
                           <MapPin size={12} /> View Map
                         </button>
                       </td>
                       <td className="px-6 py-5">
                         {i.evidenceType === 'image' && i.evidenceUrl ? (
                           <div 
                             onClick={() => setFullImageModalUrl(i.evidenceUrl!)}
                             className="w-16 h-12 rounded-xl overflow-hidden cursor-pointer border-2 border-white shadow-sm hover:scale-105 transition-transform"
                           >
                             <img src={i.evidenceUrl} alt="Evidence Thumbnail" className="w-full h-full object-cover" />
                           </div>
                         ) : (
                           <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#3498DB]">
                             {i.evidenceType === 'image' ? <Camera size={20} /> : <FileText size={20} />}
                           </div>
                         )}
                       </td>
                       <td className="px-6 py-5">
                         <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                           i.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                           i.status === 'Critical' ? 'bg-red-100 text-red-700' :
                           'bg-green-100 text-green-700'
                         }`}>{i.status}</span>
                       </td>
                       <td className="px-6 py-5 flex items-center gap-2">
                         <GlassButton 
                           onClick={() => handleBuildCase(i)}
                           className="flex items-center gap-2 bg-[#2A3F54] text-white px-4 py-2 text-xs"
                         >
                           <Gavel size={14} /> Build Case
                         </GlassButton>
                         {(i.status === 'Pending' || i.status === 'Critical') && (
                           <GlassButton
                             onClick={() => toggleTracking(i.id)}
                             className={`flex items-center gap-2 px-4 py-2 text-xs text-white ${trackingIncidentId === i.id ? 'bg-red-500' : 'bg-[#3498DB]'}`}
                           >
                             <MapPin size={14} /> {trackingIncidentId === i.id ? 'Stop Tracking' : 'Start Tracking'}
                           </GlassButton>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </GlassCard>

           <AnimatePresence>
             {selectedIncidentForCase && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
               >
                 <motion.div 
                   initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                   className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                 >
                   <div className="p-6 border-b border-gray-200/50 flex justify-between items-center bg-gradient-to-r from-[#2A3F54] to-[#34495E] text-white">
                     <h3 className="text-xl font-black flex items-center gap-2"><Gavel size={24}/> SPA Ai</h3>
                     <button onClick={() => setSelectedIncidentForCase(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                       <X size={20} />
                     </button>
                   </div>
                   <div className="p-8 overflow-y-auto flex-1">
                      {isCaseLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                          <div className="w-12 h-12 border-4 border-[#1ABC9C] border-t-transparent rounded-full animate-spin shadow-lg"></div>
                          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Gemini AI is analyzing evidence & local statutes...</p>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                           <pre className="whitespace-pre-wrap font-sans text-gray-800 font-medium leading-relaxed bg-white p-6 rounded-2xl shadow-inner border border-gray-100">
                             {aiCaseText}
                           </pre>
                        </div>
                      )}
                   </div>
                   <div className="p-6 border-t border-gray-200/50 flex justify-end gap-4 bg-gray-50/50">
                     <GlassButton onClick={() => setSelectedIncidentForCase(null)} className="px-6 py-3 text-sm bg-white text-gray-600">Close</GlassButton>
                     <GlassButton onClick={exportLegalDraft} className="px-6 py-3 text-sm bg-[#1ABC9C] text-white flex items-center gap-2"><Download size={16}/> Export Legal Draft</GlassButton>
                   </div>
                 </motion.div>
               </motion.div>
             )}
           </AnimatePresence>

           <AnimatePresence>
             {mapModalIncident && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                 onClick={() => setMapModalIncident(null)}
               >
                 <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                   <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                     <h3 className="text-lg font-bold text-[#2A3F54]">Incident Location: {mapModalIncident.id}</h3>
                     <button onClick={() => setMapModalIncident(null)} className="text-gray-500 hover:text-gray-800">
                       <X size={24} />
                     </button>
                   </div>
                   <div className="h-[60vh] w-full">
                     <MapComponent 
                       center={[mapModalIncident.location.lat, mapModalIncident.location.lng]}
                       zoom={16}
                       markers={[{lat: mapModalIncident.location.lat, lng: mapModalIncident.location.lng, title: mapModalIncident.summary || 'Incident'}]}
                       interactive={false}
                     />
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <AnimatePresence>
             {fullImageModalUrl && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                 onClick={() => setFullImageModalUrl(null)}
               >
                 <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                   <button 
                     onClick={() => setFullImageModalUrl(null)} 
                     className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                   >
                     <X size={32} />
                   </button>
                   <img src={fullImageModalUrl} alt="Full Evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      );
    }

    if (currentPage === 'voice') {
      const [transcription, setTranscription] = useState('');
      const [recording, setRecording] = useState(false);

      const startRecording = () => {
        setRecording(true);
        setTimeout(async () => {
          setRecording(false);
          setTranscription("Reporting from Mercato market. Suspicious activity noticed near the main entrance. Two individuals appearing to scout shop security systems. No immediate threat but requesting additional foot patrol.");
        }, 3000);
      };

      return (
        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl font-black text-[#2A3F54]">{t('voice_report')}</h2>
          <GlassCard className="p-12 flex flex-col items-center text-center">
             <motion.div 
               animate={recording ? { scale: [1, 1.2, 1], opacity: [1, 0.8, 1] } : {}} 
               transition={{ repeat: Infinity, duration: 1.5 }}
               className={`p-10 rounded-full mb-8 shadow-2xl ${recording ? 'bg-red-500/20 shadow-red-500/30' : 'bg-white shadow-black/5'}`}
             >
               <Mic size={64} className={recording ? 'text-red-500' : 'text-[#3498DB]'} />
             </motion.div>
             <GlassButton onClick={startRecording} className={`px-10 py-4 text-lg w-full max-w-md ${recording ? 'bg-red-500 text-white' : 'bg-[#2A3F54] text-white'}`}>
               {recording ? 'Recording... Tap to Stop' : 'Start Voice Report'}
             </GlassButton>
             <p className="mt-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Press to speak. Gemini AI will transcribe and structure your field report.</p>
          </GlassCard>

          <AnimatePresence>
            {transcription && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-8 space-y-6">
                  <label className="text-xs font-black text-[#1ABC9C] uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16}/> Transcribed Report</label>
                  <textarea 
                    value={transcription}
                    readOnly
                    className="w-full h-40 p-6 bg-white/80 rounded-2xl text-gray-800 font-medium italic border-none focus:ring-0 shadow-inner resize-none"
                  />
                  <GlassButton className="w-full bg-[#1ABC9C] text-white py-4 text-lg">File Official Report</GlassButton>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return null;
  };

  const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('kpi');
    const [predicting, setPredicting] = useState(false);
    const [allocations, setAllocations] = useState<any[]>([]);

    const handlePredict = async () => {
      setPredicting(true);
      const res = await predictResourceAllocation(incidents.length);
      setAllocations(res);
      setPredicting(false);
    };

    const chartData = [
      { name: 'Mon', incidents: 40, res: 24 },
      { name: 'Tue', incidents: 30, res: 13 },
      { name: 'Wed', incidents: 20, res: 38 },
      { name: 'Thu', incidents: 27, res: 39 },
      { name: 'Fri', incidents: 18, res: 48 },
      { name: 'Sat', incidents: 23, res: 38 },
      { name: 'Sun', incidents: 34, res: 43 },
    ];

    const tabs = [
      { id: 'kpi', label: t('kpi_overview'), icon: <BarChart3 size={18} /> },
      { id: 'validation', label: t('validation'), icon: <Shield size={18} /> },
      { id: 'planning', label: t('resource_planning'), icon: <Users size={18} /> },
      { id: 'live_map', label: t('live_map'), icon: <MapIcon size={18} /> },
    ];

    const renderTabContent = () => {
      if (activeTab === 'kpi') {
        return (
          <div className="space-y-8 relative z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-[#2A3F54] dark:text-white">{t('kpi_overview')}</h2>
              <GlassButton className="bg-white dark:bg-slate-800 text-[#2A3F54] dark:text-white px-6 py-3 text-sm flex items-center gap-2">
                <Download size={16}/> Export PDF
              </GlassButton>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { label: 'Active Patrols', value: '42', color: 'text-[#3498DB]', bg: 'bg-[#3498DB]/10' },
                { label: 'Pending Reports', value: incidents.filter(i=>i.status === 'Pending').length.toString(), color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
                { label: 'Validated Cases', value: incidents.filter(i=>i.status === 'Validated').length.toString(), color: 'text-[#1ABC9C]', bg: 'bg-[#1ABC9C]/10' },
                { label: 'Critical Zones', value: incidents.filter(i=>i.status === 'Critical').length.toString(), color: 'text-red-600', bg: 'bg-red-500/10' },
              ].map(stat => (
                <GlassCard key={stat.label} className="p-6 flex flex-col justify-between h-36">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <p className={`text-5xl font-black ${stat.color}`}>{stat.value}</p>
                    <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                      <BarChart3 className={stat.color} size={24} />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <GlassCard className="p-8">
                <h3 className="text-lg font-black mb-8 text-[#2A3F54] dark:text-white uppercase tracking-wide">Incident Trends (Weekly)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dx={-10} />
                      <Tooltip cursor={{stroke: '#E5E7EB', strokeWidth: 2}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}} />
                      <Line type="monotone" dataKey="incidents" stroke="#3498DB" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} activeDot={{r: 8}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
              <GlassCard className="p-8">
                <h3 className="text-lg font-black mb-8 text-[#2A3F54] dark:text-white uppercase tracking-wide">Officer Performance</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dx={-10} />
                      <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}} />
                      <Bar dataKey="res" fill="#1ABC9C" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          </div>
        );
      }

      if (activeTab === 'validation') {
        return (
          <GlassCard className="overflow-hidden relative z-10">
             <div className="p-8 border-b border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40">
               <h2 className="text-2xl font-black text-[#2A3F54] dark:text-white">{t('validation')} - Pending Incidents</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-white/30 dark:bg-slate-800/30 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                   <tr>
                     <th className="px-8 py-5">ID</th>
                     <th className="px-8 py-5">Citizen</th>
                     <th className="px-8 py-5">Status</th>
                     <th className="px-8 py-5">Action</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm font-medium">
                   {incidents.filter(i => i.status === 'Pending' || i.status === 'Critical').map(i => (
                     <tr key={i.id} className="border-b border-white/50 dark:border-slate-700/50 last:border-0 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                       <td className="px-8 py-5">
                         <span className="font-black text-[#2A3F54] dark:text-white text-base">{i.id}</span>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{i.summary}</p>
                       </td>
                       <td className="px-8 py-5 text-[#2A3F54] dark:text-white">{i.citizenName}</td>
                       <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            i.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            i.status === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>{i.status}</span>
                       </td>
                       <td className="px-8 py-5 space-x-3">
                         {i.status === 'Pending' && (
                           <GlassButton 
                             onClick={() => updateIncidentStatus(i.id, 'Validated')}
                             className="bg-[#1ABC9C] text-white px-4 py-2 text-xs"
                           >
                             Validate
                           </GlassButton>
                         )}
                         <GlassButton onClick={() => updateIncidentStatus(i.id, 'Resolved')} className="bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-4 py-2 text-xs">Dismiss</GlassButton>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </GlassCard>
        );
      }

      if (activeTab === 'planning') {
         return (
           <div className="space-y-8 relative z-10">
              <h2 className="text-3xl font-black text-[#2A3F54] dark:text-white">{t('resource_planning')}</h2>
              <div className="grid lg:grid-cols-3 gap-8">
                <GlassCard className="lg:col-span-2 h-[600px] p-2 relative">
                   <div className="absolute top-6 right-6 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Predictive Hotspot Heatmap</p>
                      <div className="flex items-center gap-3 mt-2">
                         <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"></div>
                         <span className="text-xs font-bold text-[#2A3F54] dark:text-white">High Probability Zone</span>
                      </div>
                   </div>
                   <div className="w-full h-full rounded-[1.25rem] overflow-hidden">
                     <MapComponent markers={incidents.flatMap(i => {
                       const m = [{ lat: i.location.lat + 0.01, lng: i.location.lng - 0.01, title: 'Predicted Hotspot' }];
                       if (i.officerLocation) {
                         m.push({ lat: i.officerLocation.lat, lng: i.officerLocation.lng, title: `Officer (${i.id})` });
                       }
                       return m;
                     })} />
                   </div>
                </GlassCard>
                <GlassCard className="p-8 flex flex-col">
                   <h3 className="text-xl font-black mb-6 text-[#2A3F54] dark:text-white">Patrol Schedule</h3>
                   <div className="space-y-4 flex-1">
                      {(allocations.length > 0 ? allocations : [
                        { officer: 'Inspector Solomon', zone: 'Sector A', time: '08:00 - 16:00' },
                        { officer: 'Officer Meron', zone: 'Sector D', time: '10:00 - 18:00' },
                        { officer: 'Officer Dawit', zone: 'Sector C', time: '14:00 - 22:00' },
                      ]).map((p, i) => (
                        <div key={i} className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-white/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                           <p className="text-sm font-black text-[#2A3F54] dark:text-white">{p.officer}</p>
                           <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                              <span className="flex items-center gap-1"><MapIcon size={12}/> {p.zone}</span>
                              <span>{p.time || p.shift}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                   <GlassButton 
                     onClick={handlePredict}
                     disabled={predicting}
                     className="w-full mt-6 bg-[#3498DB] text-white py-4 text-sm shadow-lg shadow-[#3498DB]/20"
                   >
                      {predicting ? 'Optimizing...' : 'Optimize with AI'}
                   </GlassButton>
                </GlassCard>
              </div>
           </div>
         );
      }

      if (activeTab === 'live_map') {
        return (
          <div className="space-y-8 relative z-10">
            <h2 className="text-3xl font-black text-[#2A3F54] dark:text-white">{t('live_map')}</h2>
            <GlassCard className="h-[700px] p-2 relative">
              <div className="w-full h-full rounded-[1.25rem] overflow-hidden">
                <MapComponent markers={incidents.flatMap(i => {
                  const m = [{ lat: i.location.lat, lng: i.location.lng, title: `Incident: ${i.summary}` }];
                  if (i.officerLocation) {
                    m.push({ lat: i.officerLocation.lat, lng: i.officerLocation.lng, title: `Officer (${i.id})` });
                  }
                  return m;
                })} />
              </div>
            </GlassCard>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <h2 className="text-3xl font-black text-[#2A3F54] dark:text-white">Admin Panel</h2>
        </div>
        
        {/* Sub-navigation */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id 
                ? 'bg-[#1ABC9C] text-white shadow-md shadow-[#1ABC9C]/20' 
                : 'bg-white/50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    );
  };

  const AlertsFeed = () => (
    <div className="max-w-3xl mx-auto space-y-6 relative z-10">
      <h2 className="text-3xl font-black text-[#2A3F54] mb-8">{t('safety_alerts')}</h2>
      {alerts.map(alert => (
        <GlassCard key={alert.id} className="p-8 flex gap-6">
           <div className={`flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${alert.severity === 'high' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-500'}`}>
             <AlertTriangle size={32} />
           </div>
           <div className="flex-1">
             <div className="flex justify-between items-center mb-2">
               <h3 className="font-black text-xl text-[#2A3F54]">{alert.title}</h3>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-lg">{alert.timestamp}</span>
             </div>
             <p className="text-gray-700 font-medium leading-relaxed">{alert.message}</p>
             <div className="mt-6 flex gap-3">
               <GlassButton className="text-xs font-bold text-[#3498DB] bg-white px-4 py-2">View on Map</GlassButton>
               <GlassButton className="text-xs font-bold text-gray-600 bg-white/50 px-4 py-2">Share via SMS</GlassButton>
             </div>
           </div>
        </GlassCard>
      ))}
      {alerts.length === 0 && (
        <GlassCard className="p-12 text-center text-gray-500 font-medium">
          No active alerts at this time. Stay safe!
        </GlassCard>
      )}
    </div>
  );

  const renderContent = () => {
    if (role === 'Citizen') {
      switch(currentPage) {
        case 'home': return <CitizenHome />;
        case 'report': return <ReportIncident />;
        case 'alerts': return <AlertsFeed />;
        default: return <CitizenHome />;
      }
    } else if (role === 'Officer') {
       return <OfficerDashboard />;
    } else if (role === 'Admin') {
       return <AdminDashboard />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[1000] bg-[#2A3F54] flex flex-col items-center justify-center overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#1ABC9C] blur-[100px] opacity-50 rounded-full"></div>
              <Shield className="text-white relative z-10" size={120} />
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-4xl md:text-6xl font-black text-white mt-8 tracking-tight text-center"
            >
              Ethiopia <span className="text-[#1ABC9C]">AI Police</span>
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="text-gray-400 mt-4 text-lg font-medium tracking-widest uppercase"
            >
              Next-Gen Public Safety
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasSelectedRole ? (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden font-sans">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#3498DB]/20 to-transparent blur-3xl" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#1ABC9C]/20 to-transparent blur-3xl" />
           
           <GlassCard className="max-w-md w-full p-8 relative z-10">
             <div className="flex justify-center mb-6">
               <Shield className="text-[#1ABC9C]" size={48} />
             </div>
             <h2 className="text-2xl font-black text-center text-[#2A3F54] mb-8">Welcome to Smart Police Agent</h2>
             
             {isAuthChecking ? (
               <div className="flex justify-center items-center py-8">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1ABC9C]"></div>
               </div>
             ) : !isAuthReady ? (
               <div className="space-y-4">
                 <p className="text-center text-gray-600 font-medium mb-4">Please sign in to continue.</p>
                 <GlassButton 
                   onClick={async () => {
                     try {
                       const provider = new GoogleAuthProvider();
                       await signInWithPopup(auth, provider);
                     } catch (error: any) {
                       showToast("Sign in failed: " + error.message);
                     }
                   }}
                   className="w-full bg-[#3498DB] text-white py-4 text-lg flex items-center justify-center gap-2"
                 >
                   <User size={20} /> Sign in with Google
                 </GlassButton>
               </div>
             ) : !showAdminCodeInput ? (
               <div className="space-y-4">
                 <GlassButton 
                   onClick={() => { setRole('Citizen'); setCurrentPage('home'); setHasSelectedRole(true); }}
                   className="w-full bg-[#1ABC9C] text-white py-4 text-lg"
                 >
                   I am a Citizen
                 </GlassButton>
                 <GlassButton 
                   onClick={() => setShowAdminCodeInput(true)}
                   className="w-full bg-[#2A3F54] text-white py-4 text-lg"
                 >
                   I am an Admin / Officer
                 </GlassButton>
               </div>
             ) : (
               <div className="space-y-4">
                 <p className="text-sm font-bold text-gray-600 mb-2">Enter your Admin/Officer Authorization Code:</p>
                 <input 
                   type="text" 
                   value={adminCodeInput}
                   onChange={(e) => { setAdminCodeInput(e.target.value); setAdminCodeError(''); }}
                   placeholder="Enter Authorization Code"
                   className="w-full p-4 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-[#1ABC9C] outline-none"
                 />
                 {adminCodeError && <p className="text-red-500 text-sm font-bold">{adminCodeError}</p>}
                 <div className="flex gap-3 mt-4">
                   <GlassButton onClick={() => setShowAdminCodeInput(false)} className="flex-1 bg-gray-200 text-gray-700 py-3">Back</GlassButton>
                   <GlassButton 
                     onClick={() => {
                       if (ADMIN_CODES.includes(adminCodeInput)) {
                         setRole('Admin');
                         setCurrentPage('admin_panel');
                         setHasSelectedRole(true);
                       } else {
                         setAdminCodeError('Invalid authorization code.');
                       }
                     }} 
                     className="flex-1 bg-[#1ABC9C] text-white py-3"
                   >
                     Verify
                   </GlassButton>
                 </div>
               </div>
             )}
           </GlassCard>
        </div>
      ) : (
        <div className="min-h-screen bg-[#F0F4F8] text-[#2A3F54] font-sans selection:bg-[#1ABC9C] selection:text-white overflow-hidden relative">
          {/* Parallax Background Elements */}
          <motion.div style={{ y: backgroundY }} className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#3498DB]/20 to-transparent blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#1ABC9C]/20 to-transparent blur-3xl" />
          </motion.div>

          <motion.div style={{ y: glassY }} className="relative z-10 flex flex-col min-h-screen">
            <Header />
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-8 pb-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage + role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>

          {/* SOS Modal */}
          <AnimatePresence>
            {showSOS && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              >
                <GlassCard className="max-w-md w-full p-8 text-center bg-red-600/90 border-red-500">
                  <div className="w-24 h-24 bg-white text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                    <AlertTriangle size={48} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">EMERGENCY SOS</h2>
                  <p className="text-red-100 font-medium mb-8">This will immediately alert nearby authorities with your exact location. Do not use for false alarms.</p>
                  <div className="flex gap-4">
                    <GlassButton onClick={() => setShowSOS(false)} className="flex-1 bg-white/20 text-white py-4">Cancel</GlassButton>
                    <GlassButton onClick={handleSOS} className="flex-1 bg-white text-red-600 py-4 font-black">TRIGGER SOS</GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/50 dark:border-slate-800/50 lg:hidden z-50 pb-safe">
            <div className="flex justify-around items-center p-2">
              {(role === 'Citizen' ? MENU_ITEMS : role === 'Officer' ? OFFICER_MENU : ADMIN_MENU).map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === item.id ? 'text-[#1ABC9C] dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-[#2A3F54] dark:hover:text-white'}`}
                >
                  <div className={`p-1.5 rounded-full ${currentPage === item.id ? 'bg-[#1ABC9C]/10 dark:bg-teal-400/10' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold mt-1">{t(item.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toast Notifications */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-[#2A3F54] text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3"
              >
                <CheckCircle size={18} className="text-[#1ABC9C]" />
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};

export default App;
