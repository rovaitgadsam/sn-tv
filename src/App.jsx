import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Sun, Cloud, CloudRain, CloudLightning, Wind, X, Plus, Trash2, Clock, Calendar, Droplets, Quote, Maximize, Minimize } from 'lucide-react';


// Default settings for the app
const DEFAULT_SETTINGS = {
  schoolName: 'אורט שחקים נהריה',
  logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbe48vi05L75mmqOyt03JTyMjrDL0QaVkQSSrwHiGmwg&s=10',
  quoteText: 'החינוך הוא הנשק החזק ביותר שבו תוכלו להשתמש כדי לשנות את העולם.',
  quoteAuthor: 'נלסון מנדלה',
  driveFolderUrl: '',
  driveApiKey: '',
  tickerMessages: [
    'ברוכים הבאים לבית הספר אורט שחקים נהריה!',
    'ההרשמה לשנת הלימודים הבאה בעיצומה - פנו למזכירות לפרטים נוספים.',
    'תלמידים יקרים, נא לשמור על הניקיון בסביבת בית הספר.',
    'נבחרת הרובוטיקה העפילה לגמר הארצי! כל הכבוד והמון בהצלחה.'
  ],
  images: [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200'
  ],
  imageInterval: 8, // seconds
};

// Helper to convert standard Google Drive share links to direct image links
const getDirectImageUrl = (url) => {
  if (!url) return '';
  // Check for standard drive share link: /d/ID/view
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${dMatch[1]}`;
  }
  // Check for open?id=ID
  const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }
  return url; // Return as is if not a recognized Drive link
};

// Hook to fetch images from a public Google Drive folder
const useDriveFolderImages = (folderUrl, apiKey) => {
  const [folderImages, setFolderImages] = useState([]);
  const [folderError, setFolderError] = useState(null);

  useEffect(() => {
    if (!folderUrl || !apiKey) {
      setFolderImages([]);
      setFolderError(null);
      return;
    }

    const extractId = (url) => {
      const match = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    };

    const folderId = extractId(folderUrl);
    if (!folderId) {
      setFolderError('קישור לתיקייה אינו תקין');
      return;
    }

    const fetchImages = async () => {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${apiKey}&fields=files(id)`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        
        if (data.files) {
          const urls = data.files.map(f => `https://drive.google.com/uc?export=view&id=${f.id}`);
          setFolderImages(urls);
          setFolderError(null);
        }
      } catch (e) {
        console.error('Failed to fetch folder images', e);
        setFolderError('שגיאה במשיכת תמונות. ודא שהתיקייה פתוחה לכל מי שברשותו הקישור והמפתח תקין.');
      }
    };

    fetchImages();
    // Refresh folder contents every hour
    const interval = setInterval(fetchImages, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [folderUrl, apiKey]);

  return { folderImages, folderError };
};

// WMO Weather code mapping to Lucide Icons & Hebrew Text
const getWeatherDetails = (code) => {
  if (code === 0) return { icon: <Sun className="text-yellow-400" size={32} />, text: 'בהיר' };
  if (code >= 1 && code <= 3) return { icon: <Cloud className="text-gray-400" size={32} />, text: 'מעונן חלקית' };
  if (code === 45 || code === 48) return { icon: <Wind className="text-gray-300" size={32} />, text: 'ערפל' };
  if (code >= 51 && code <= 67) return { icon: <Droplets className="text-blue-400" size={32} />, text: 'גשם קל' };
  if (code >= 71 && code <= 77) return { icon: <Cloud className="text-white" size={32} />, text: 'שלג' };
  if (code >= 80 && code <= 82) return { icon: <CloudRain className="text-blue-500" size={32} />, text: 'גשום' };
  if (code >= 95) return { icon: <CloudLightning className="text-purple-500" size={32} />, text: 'סופות רעמים' };
  return { icon: <Sun className="text-yellow-400" size={32} />, text: 'בהיר' };
};


// Hook for current time & date
const useDateTime = () => {
  const [date, setDate] = useState(new Date());
  const [hebrewDate, setHebrewDate] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch Hebrew Date (Updates once a day or on load)
    const fetchHebrewDate = async () => {
      try {
        const isoDate = date.toISOString().split('T')[0];
        const res = await fetch(`https://www.hebcal.com/converter?cfg=json&date=${isoDate}&g2h=1&lg=h`);
        const data = await res.json();
        setHebrewDate(data.hebrew);
      } catch (e) {
        console.error('Failed to fetch Hebrew date', e);
        setHebrewDate('לא זמין');
      }
    };
    fetchHebrewDate();
    
    // Refresh Hebrew date exactly at midnight
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
    const timeout = setTimeout(fetchHebrewDate, msUntilMidnight);
    return () => clearTimeout(timeout);
  }, [date.getDate()]); // Re-run when the day changes

  return { date, hebrewDate };
};

// Hook for fetching Open-Meteo weather (Nahariya Coordinates)
const useWeather = () => {
  const [forecast, setForecast] = useState([]);
  
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Nahariya Coordinates: Lat 33.0081, Lon 35.0955
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.0081&longitude=35.0955&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto');
        const data = await res.json();
        
        const days = data.daily.time.slice(0, 3).map((time, index) => {
          const dateObj = new Date(time);
          const dayName = index === 0 ? 'היום' : index === 1 ? 'מחר' : dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
          return {
            day: dayName,
            maxTemp: Math.round(data.daily.temperature_2m_max[index]),
            minTemp: Math.round(data.daily.temperature_2m_min[index]),
            code: data.daily.weathercode[index],
            isCurrent: index === 0,
            currentTemp: index === 0 ? Math.round(data.current_weather.temperature) : null
          };
        });
        
        setForecast(days);
      } catch (e) {
        console.error('Failed to fetch weather', e);
      }
    };

    fetchWeather();
    // Refresh weather every hour
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return forecast;
};


const TopoHexBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none opacity-20" style={{
    backgroundColor: '#e0f2fe',
    backgroundImage: `
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230284c7' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 25, 50 50 T 100 50' fill='none' stroke='%2338bdf8' stroke-width='0.5' stroke-opacity='0.3'/%3E%3Cpath d='M0 60 Q 30 20, 60 60 T 100 60' fill='none' stroke='%2338bdf8' stroke-width='0.5' stroke-opacity='0.3'/%3E%3Cpath d='M0 40 Q 20 70, 40 40 T 100 40' fill='none' stroke='%2338bdf8' stroke-width='0.5' stroke-opacity='0.3'/%3E%3C/svg%3E")
    `,
    backgroundSize: '60px 60px, 200px 200px'
  }} />
);

const WeatherWidget = ({ forecast }) => {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-sky-200/50 flex flex-col gap-4 border border-sky-100">
      <h2 className="text-xl font-bold text-sky-900 border-b border-sky-200 pb-2">תחזית מזג אוויר</h2>
      <div className="flex flex-col gap-4">
        {forecast.map((day, idx) => {
          const { icon, text } = getWeatherDetails(day.code);
          return (
            <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl ${day.isCurrent ? 'bg-sky-100/80 shadow-inner' : 'hover:bg-sky-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  {icon}
                </div>
                <div>
                  <div className="font-bold text-sky-950 text-lg">{day.day}</div>
                  <div className="text-sm text-sky-700">{text}</div>
                </div>
              </div>
              <div className="text-left flex flex-col items-end">
                {day.isCurrent && day.currentTemp !== null ? (
                  <div className="text-2xl font-black text-sky-900">{day.currentTemp}°</div>
                ) : null}
                <div className="text-sm font-medium text-sky-800">
                  <span className="text-red-500/80">{day.maxTemp}°</span> / <span className="text-blue-500/80">{day.minTemp}°</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ImageCarousel = ({ images, intervalSecs }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalSecs * 1000);
    return () => clearInterval(interval);
  }, [images, intervalSecs]);

  if (!images || images.length === 0) {
    return (
      <div className="flex-1 bg-white/60 backdrop-blur-md rounded-3xl shadow-xl shadow-sky-200/50 flex items-center justify-center border border-sky-100 min-h-[400px]">
        <p className="text-2xl text-sky-600 font-medium">לא הוגדרו תמונות. אנא הוסף תמונות בהגדרות.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden rounded-3xl shadow-2xl shadow-sky-200/60 border-4 border-white/80 bg-white min-h-[400px]">
      {images.map((src, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            opacity: idx === currentIndex ? 1 : 0,
            backgroundImage: `url(${getDirectImageUrl(src)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      ))}
      {/* Overlay gradient for aesthetics */}
      <div className="absolute inset-0 bg-gradient-to-t from-sky-900/40 via-transparent to-transparent pointer-events-none" />
      
      {/* Image Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
        {images.map((_, idx) => (
          <div 
            key={idx} 
            className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};


const AdminPanel = ({ settings, setSettings, onClose }) => {
  const [formData, setFormData] = useState({ ...settings });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, index) => {
    const newArray = [...formData[field]];
    newArray.splice(index, 1);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleSave = () => {
    // Filter out empty strings from arrays
    const cleanedData = {
      ...formData,
      tickerMessages: formData.tickerMessages.filter(m => m.trim() !== ''),
      images: formData.images.filter(img => img.trim() !== '')
    };
    setSettings(cleanedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-sky-900 flex items-center gap-2">
            <Settings className="text-sky-500" /> הגדרות מסך תצוגה
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
          
          {/* General Settings */}
          <section className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
            <h3 className="text-lg font-bold text-sky-800 mb-4">הגדרות כלליות</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם בית הספר / כותרת</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כתובת לוגו (URL)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 outline-none"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Quote Settings */}
          <section className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
            <h3 className="text-lg font-bold text-sky-800 mb-4">ציטוט / מסר קבוע (הריבוע השמאלי)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תוכן הציטוט / המסר</label>
                <textarea 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 outline-none resize-none"
                  rows="2"
                  value={formData.quoteText || ''}
                  onChange={(e) => handleChange('quoteText', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מקור / מחבר (אופציונלי)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 outline-none"
                  value={formData.quoteAuthor || ''}
                  onChange={(e) => handleChange('quoteAuthor', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Images Settings */}
          <section className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-sky-800">תמונות מתחלפות</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">זמן החלפה (שניות):</label>
                <input 
                  type="number" 
                  min="3" max="60"
                  className="w-20 p-1 border border-slate-300 rounded-lg text-center"
                  value={formData.imageInterval}
                  onChange={(e) => handleChange('imageInterval', parseInt(e.target.value) || 8)}
                />
              </div>
            </div>
            
            {/* Google Drive Folder Sync */}
            <div className="mb-6 bg-white p-4 rounded-xl border border-sky-200 shadow-sm">
              <h4 className="font-bold text-sky-700 mb-2 flex items-center gap-2">
                <Cloud size={18} /> משיכה אוטומטית מתיקיית Google Drive
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                הזן קישור לתיקייה (שמוגדרת כ"פתוחה לכולם") ומפתח API של גוגל כדי להציג אוטומטית את כל התמונות שבתוכה. התמונות יתווספו לאלו שהוגדרו ידנית.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">קישור לתיקיית גוגל דרייב</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-400 text-sm text-left"
                    dir="ltr"
                    value={formData.driveFolderUrl || ''}
                    onChange={(e) => handleChange('driveFolderUrl', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Google Drive API Key (חובה)</label>
                  <input 
                    type="text" 
                    placeholder="AIzaSy..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-400 text-sm font-mono text-left"
                    dir="ltr"
                    value={formData.driveApiKey || ''}
                    onChange={(e) => handleChange('driveApiKey', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <h4 className="font-bold text-sky-800 mb-2">תמונות בודדות (ידני)</h4>
            <p className="text-xs text-slate-500 mb-4">
              הדבק כאן קישורים ישירים לתמונות, או קישורי שיתוף רגילים מגוגל דרייב (ללא צורך במפתח API).
            </p>
            
            <div className="flex flex-col gap-3">
              {formData.images.map((img, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://..."
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-400"
                    value={img}
                    onChange={(e) => handleArrayChange('images', idx, e.target.value)}
                  />
                  <button onClick={() => removeArrayItem('images', idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('images')}
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium py-2 px-4 bg-sky-100/50 hover:bg-sky-100 rounded-lg w-fit transition-colors"
              >
                <Plus size={18} /> הוסף תמונה
              </button>
            </div>
          </section>

          {/* Ticker Settings */}
          <section className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
            <h3 className="text-lg font-bold text-sky-800 mb-4">הודעות רצות (Ticker)</h3>
            <div className="flex flex-col gap-3">
              {formData.tickerMessages.map((msg, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="הכנס הודעה..."
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-400"
                    value={msg}
                    onChange={(e) => handleArrayChange('tickerMessages', idx, e.target.value)}
                  />
                  <button onClick={() => removeArrayItem('tickerMessages', idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('tickerMessages')}
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium py-2 px-4 bg-sky-100/50 hover:bg-sky-100 rounded-lg w-fit transition-colors"
              >
                <Plus size={18} /> הוסף הודעה
              </button>
            </div>
          </section>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors">
            ביטול
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-lg shadow-sky-600/30 transition-colors">
            שמור והצג
          </button>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const appRef = useRef(null);
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('ort_tv_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const { date, hebrewDate } = useDateTime();
  const forecast = useWeather();
  
  // Fetch folder images dynamically
  const { folderImages } = useDriveFolderImages(settings.driveFolderUrl, settings.driveApiKey);

  // Combine manual images with dynamic folder images
  const allImages = useMemo(() => {
    const combined = [...(settings.images || []), ...(folderImages || [])];
    return combined.filter(img => img && img.trim() !== '');
  }, [settings.images, folderImages]);

  // Save settings to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ort_tv_settings', JSON.stringify(settings));
  }, [settings]);

  // Format Time and Date
  const timeString = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // CSS for Ticker
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes ticker-rtl {
        0% { transform: translateX(100vw); }
        100% { transform: translateX(-100%); }
      }
      .animate-ticker {
        display: inline-block;
        white-space: nowrap;
        animation: ticker-rtl 35s linear infinite;
        will-change: transform;
      }
      .animate-ticker:hover {
        animation-play-state: paused;
      }
      /* Ensure fullscreen container takes full height */
      :fullscreen {
        background-color: #f0f9ff; /* sky-50 fallback */
      }
      /* Safari fallback */
      :-webkit-full-screen {
        background-color: #f0f9ff;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    // If we are in fallback/pseudo fullscreen mode, exit it
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      setIsFullscreen(false);
      return;
    }

    const elem = document.documentElement; // More reliable than appRef.current
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.warn(`Native fullscreen blocked: ${err.message}. Using pseudo-fullscreen fallback.`);
          setIsPseudoFullscreen(true);
          setIsFullscreen(true);
          showToast('עבר למסך מלא מדומה (בטלוויזיה זה יעבוד רגיל)');
        });
      } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
        setIsFullscreen(true);
      } else {
        // Fallback for environments lacking the API
        setIsPseudoFullscreen(true);
        setIsFullscreen(true);
        showToast('עבר למסך מלא מדומה');
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Listen to fullscreen changes (e.g. if user exits with ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('msfullscreenchange', handleFullscreenChange); // IE11
    
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      ref={appRef} 
      className={`bg-sky-50 text-slate-800 font-sans overflow-hidden flex flex-col relative selection:bg-sky-200 ${
        isPseudoFullscreen ? 'fixed inset-0 z-[9999] w-full h-full' : 'min-h-screen'
      }`} 
      dir="rtl"
    >
      
      {/* Background Layer */}
      <TopoHexBackground />

      {/* Control Buttons (Hidden in top corner) */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        <div className="flex gap-2">
          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white/40 hover:bg-white/80 backdrop-blur-md rounded-full text-sky-700/50 hover:text-sky-700 shadow-sm transition-all"
            title={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button 
            onClick={() => setIsAdminOpen(true)}
            className="p-3 bg-white/40 hover:bg-white/80 backdrop-blur-md rounded-full text-sky-700/50 hover:text-sky-700 shadow-sm transition-all"
            title="פתיחת ממשק ניהול"
          >
            <Settings size={20} />
          </button>
        </div>
        
        {/* Fallback Toast Message */}
        {toastMsg && (
          <div className="bg-sky-900/80 text-white px-3 py-2 rounded-xl backdrop-blur-md text-xs text-center shadow-lg animate-pulse">
            {toastMsg}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 gap-6 z-10 h-screen pb-20">
        
        {/* Header Area */}
        <header className="bg-white/70 backdrop-blur-lg rounded-3xl p-4 px-8 shadow-xl shadow-sky-200/40 flex items-center justify-between border border-white">
          <div className="flex items-center gap-6">
            {settings.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt="לוגו בית הספר" 
                className="h-20 w-auto object-contain drop-shadow-md"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <h1 className="text-4xl font-black text-sky-900 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {settings.schoolName}
            </h1>
          </div>

          <div className="flex items-center gap-10">
            {/* Date Display */}
            <div className="flex flex-col items-end border-r-2 border-sky-200/50 pr-8">
              <div className="flex items-center gap-2 text-sky-800 font-semibold text-lg">
                <span>{hebrewDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sky-600 text-sm">
                <span>{dateString}</span>
              </div>
            </div>

            {/* Clock Display */}
            <div className="text-6xl font-black text-sky-900 tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {timeString}
            </div>
          </div>
        </header>

        {/* Content Area (Carousel + Weather) */}
        <main className="flex-1 grid grid-cols-3 gap-6 min-h-0">
          {/* Main Image Carousel - 2/3 of the screen */}
          <div className="col-span-2 flex flex-col min-w-0 h-full">
             <ImageCarousel images={allImages} intervalSecs={settings.imageInterval} />
          </div>

          {/* Weather Sidebar - 1/3 of the screen */}
          <div className="col-span-1 flex flex-col h-full">
            <WeatherWidget forecast={forecast} />
            
            {/* Quote / Info Widget */}
            <div className="mt-6 flex-1 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl shadow-xl shadow-sky-300/50 p-6 flex flex-col justify-center items-center text-white border border-sky-300/50 text-center">
                <Quote size={40} className="mb-4 opacity-80" />
                <p className="text-white text-lg font-medium px-2 leading-relaxed">
                  "{settings.quoteText}"
                </p>
                {settings.quoteAuthor && (
                  <p className="text-sky-100 mt-3 text-sm font-semibold">
                    - {settings.quoteAuthor} -
                  </p>
                )}
            </div>
          </div>
        </main>

      </div>

      {/* News Ticker Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-sky-900 text-white z-20 flex items-center shadow-[0_-10px_40px_rgba(2,132,199,0.3)] border-t-4 border-sky-400">
        <div className="bg-sky-500 h-full flex items-center px-6 font-bold text-xl shrink-0 z-10 shadow-[10px_0_20px_rgba(0,0,0,0.2)]">
          מבזקי ביה"ס
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div className="animate-ticker text-2xl font-medium flex gap-32 px-10 whitespace-nowrap">
            {settings.tickerMessages.length > 0 ? (
              // Duplicate the messages a few times to ensure a smooth continuous loop if there are few messages
              [...settings.tickerMessages, ...settings.tickerMessages, ...settings.tickerMessages].map((msg, idx) => (
                <span key={idx} className="flex items-center gap-4">
                  <span className="w-2 h-2 rounded-full bg-sky-300 inline-block" />
                  {msg}
                </span>
              ))
            ) : (
              <span>אין הודעות כרגע.</span>
            )}
          </div>
        </div>
      </footer>

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <AdminPanel 
          settings={settings} 
          setSettings={setSettings} 
          onClose={() => setIsAdminOpen(false)} 
        />
      )}

    </div>
  );
}
