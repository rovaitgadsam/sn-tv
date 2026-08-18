import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Sun, Cloud, CloudRain, CloudLightning, Wind, X, Plus, Trash2, Clock, Calendar, Droplets, Quote, Maximize, Minimize, Upload, Monitor } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_zDZ4ahbRRx1Z5mRzs9URRjl4a0FkEcA",
  authDomain: "sn-tv-9fcfc.firebaseapp.com",
  projectId: "sn-tv-9fcfc",
  storageBucket: "sn-tv-9fcfc.firebasestorage.app",
  messagingSenderId: "859825387330",
  appId: "1:859825387330:web:9d2bc4b6e4abfbefbf3adb"
};

// אתחול בטוח של פיירבייס מחוץ לקומפוננטה
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error", error);
}

const appId = 'ort-tv-public';

// Default settings for the app
const DEFAULT_SETTINGS = {
  schoolName: 'אורט שחקים נהריה',
  logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbe48vi05L75mmqOyt03JTyMjrDL0QaVkQSSrwHiGmwg&s=10',
  quoteText: 'החינוך הוא הנשק החזק ביותר שבו תוכלו להשתמש כדי לשנות את העולם.',
  quoteAuthor: 'נלסון מנדלה',
  imgbbApiKey: '',
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
    
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
    const timeout = setTimeout(fetchHebrewDate, msUntilMidnight);
    return () => clearTimeout(timeout);
  }, [date.getDate()]);

  return { date, hebrewDate };
};

// Hook for fetching Open-Meteo weather
const useWeather = () => {
  const [forecast, setForecast] = useState([]);
  
  useEffect(() => {
    const fetchWeather = async () => {
      try {
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
  const [shuffledImages, setShuffledImages] = useState([]);

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  useEffect(() => {
    if (images && images.length > 0) {
      setShuffledImages(shuffleArray(images));
      setCurrentIndex(0);
    } else {
      setShuffledImages([]);
    }
  }, [images]);

  useEffect(() => {
    if (!shuffledImages || shuffledImages.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= shuffledImages.length) {
          setShuffledImages(shuffleArray(images));
          return 0;
        }
        return nextIndex;
      });
    }, intervalSecs * 1000);
    
    return () => clearInterval(interval);
  }, [shuffledImages, intervalSecs, images]);

  if (!shuffledImages || shuffledImages.length === 0) {
    return (
      <div className="flex-1 bg-white/60 backdrop-blur-md rounded-3xl shadow-xl shadow-sky-200/50 flex items-center justify-center border border-sky-100 min-h-[400px]">
        <p className="text-2xl text-sky-600 font-medium">לא הוגדרו תמונות. אנא הוסף תמונות בהגדרות.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden rounded-3xl shadow-2xl shadow-sky-200/60 border-4 border-white/80 bg-white min-h-[400px]">
      {shuffledImages.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            opacity: idx === currentIndex ? 1 : 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-sky-900/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

const AdminPanel = ({ settings, setSettings, onClose, isStandaloneMode = false }) => {
  const [formData, setFormData] = useState({ ...settings });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

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

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!formData.imgbbApiKey) {
      setUploadError('נא להזין מפתח API של ImgBB למעלה לפני העלאת תמונות.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const newImageUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = new FormData();
      data.append('image', file);

      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${formData.imgbbApiKey}`, {
          method: 'POST',
          body: data
        });
        
        const result = await res.json();
        if (result.success) {
          newImageUrls.push(result.data.url);
        } else {
          throw new Error(result.error?.message || 'שגיאה בהעלאה');
        }
      } catch (error) {
        console.error('Upload failed', error);
        setUploadError(`שגיאה בהעלאת התמונה ${file.name}: ${error.message}`);
      }
    }

    if (newImageUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImageUrls]
      }));
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    const cleanedData = {
      ...formData,
      tickerMessages: formData.tickerMessages.filter(m => m.trim() !== ''),
      images: formData.images.filter(img => img.trim() !== '')
    };
    setSettings(cleanedData);
    if (!isStandaloneMode && onClose) {
      onClose();
    } else {
      alert('ההגדרות נשמרו בענן בהצלחה! המסך בטלוויזיה יתעדכן כעת מיד.');
    }
  };

  const navigateToDisplay = () => {
    window.location.hash = ''; // Remove the hash to go to display mode
  };

  const adminContent = (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col mx-auto h-[90vh] lg:h-auto lg:max-h-[90vh]">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white rounded-t-3xl sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-sky-900 flex items-center gap-2">
          <Settings className="text-sky-500" /> הגדרות מסך תצוגה
        </h2>
        {isStandaloneMode ? (
          <button onClick={navigateToDisplay} className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl transition-colors font-medium">
            <Monitor size={18} /> מעבר לתצוגת הטלוויזיה
          </button>
        ) : (
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-500" />
          </button>
        )}
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

        {/* Images Settings - Gallery View */}
        <section className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-sky-800">גלריית תמונות מתחלפות</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">זמן החלפה (שניות):</label>
              <input 
                type="number" 
                min="3" max="60"
                className="w-20 p-1 border border-slate-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-sky-400"
                value={formData.imageInterval}
                onChange={(e) => handleChange('imageInterval', parseInt(e.target.value) || 8)}
              />
            </div>
          </div>
          
          {/* ImgBB Setup & Upload */}
          <div className="mb-6 bg-white p-5 rounded-xl border border-sky-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-sky-700 flex items-center gap-2">
                  <Upload size={18} /> העלאת תמונות ישירה מהמחשב
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  1. הירשם בחינם ל- <a href="https://api.imgbb.com/" target="_blank" className="text-sky-600 underline">api.imgbb.com</a> <br/>
                  2. הדבק כאן את מפתח ה-API שקיבלת כדי לאפשר העלאה ישירה. (ניתן לבחור מספר תמונות יחד!)
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <input 
                  type="text" 
                  placeholder="הכנס את ה-API Key של ImgBB כאן..."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-400 text-sm font-mono text-left bg-slate-50"
                  dir="ltr"
                  value={formData.imgbbApiKey || ''}
                  onChange={(e) => handleChange('imgbbApiKey', e.target.value)}
                />
              </div>

              <div className="relative">
                <input 
                  type="file" 
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                  disabled={isUploading || !formData.imgbbApiKey}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !formData.imgbbApiKey}
                  className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${
                    !formData.imgbbApiKey ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' :
                    isUploading ? 'border-sky-300 bg-sky-50 text-sky-500 cursor-wait' : 
                    'border-sky-300 hover:border-sky-500 hover:bg-sky-50 text-sky-600 cursor-pointer'
                  }`}
                >
                  {isUploading ? (
                    <span className="font-medium animate-pulse">מעלה תמונות, אנא המתן...</span>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span className="font-medium">לחץ כאן לבחירת תמונה (או מספר תמונות) מהמחשב</span>
                    </>
                  )}
                </button>
                {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
              </div>
            </div>
          </div>

          <h4 className="font-bold text-sky-800 mb-4 border-b border-sky-200 pb-2">התמונות שבאוויר</h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.images.map((img, idx) => (
              <div key={idx} className="group relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={img} alt={`תמונה ${idx+1}`} className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=שגיאה+בטעינה'} />
                
                {/* Delete Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => removeArrayItem('images', idx)} 
                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all"
                    title="מחק תמונה"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Manual Add URL option as a card */}
            <div className="aspect-video bg-white border-2 border-dashed border-sky-300 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-sky-50 transition-colors">
              <button 
                onClick={() => addArrayItem('images')}
                className="flex flex-col items-center gap-2 text-sky-600 w-full h-full justify-center"
              >
                <Plus size={24} />
                <span className="text-sm font-medium text-center">הוסף מקישור ידני</span>
              </button>
            </div>
          </div>
          
          {/* Invisible inputs for manual links if added */}
          {formData.images.some(img => img === '') && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-sky-700">הזן קישור לתמונה החדשה שהוספת:</p>
              {formData.images.map((img, idx) => img === '' ? (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://...קישור לתמונה"
                    className="flex-1 p-2 border border-sky-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-400 bg-sky-50"
                    value={img}
                    onChange={(e) => handleArrayChange('images', idx, e.target.value)}
                  />
                  <button onClick={() => removeArrayItem('images', idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : null)}
            </div>
          )}

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

      <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 sticky bottom-0">
        {!isStandaloneMode && (
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors">
            ביטול
          </button>
        )}
        <button onClick={handleSave} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-lg shadow-sky-600/30 transition-colors">
          שמור הגדרות
        </button>
      </div>
    </div>
  );

  if (isStandaloneMode) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8" dir="rtl">
        {adminContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      {adminContent}
    </div>
  );
};


export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const appRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const { date, hebrewDate } = useDateTime();
  const forecast = useWeather();

  useEffect(() => {
    // Only attempt auth if Firebase was successfully initialized
    if (!auth) {
        showToast('שגיאה בחיבור למסד הנתונים. ודא שקוד ה-Firebase הוזן כראוי.');
        return;
    }
    
    const initAuth = async () => {
      try {
         await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth init error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Wait until user is authenticated anonymously and db is ready
    if (!user || !db) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'tv_settings');
    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snapshot.data() });
        } else {
          // If document doesn't exist yet, create it with defaults
          setDoc(docRef, DEFAULT_SETTINGS).catch(e => console.error("Error creating initial doc", e));
        }
      }, 
      (error) => {
        console.error("Error fetching settings:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveSettingsToCloud = async (newSettings) => {
    if (!user || !db) {
        showToast('אין חיבור לענן. ודא שהגדרות ה-Firebase תקינות.');
        return;
    }
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'tv_settings');
    try {
      await setDoc(docRef, newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast('שגיאה בשמירת נתונים לענן.');
    }
  };

  // Listen to hash changes for routing
  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Format Time and Date
  const timeString = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // CSS for Ticker (Speed modified to 60s)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes ticker-ltr {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100vw); }
      }
      .animate-ticker {
        display: flex;
        width: max-content;
        animation: ticker-ltr 60s linear infinite;
        will-change: transform;
      }
      .animate-ticker:hover {
        animation-play-state: paused;
      }
      :fullscreen {
        background-color: #f0f9ff;
      }
      :-webkit-full-screen {
        background-color: #f0f9ff;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      setIsFullscreen(false);
      return;
    }

    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
          setIsPseudoFullscreen(true);
          setIsFullscreen(true);
        });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Router Logic: If URL ends with #admin, show ONLY the Admin Panel
  if (currentHash === '#admin') {
    return (
      <AdminPanel 
        settings={settings} 
        setSettings={saveSettingsToCloud} 
        isStandaloneMode={true} 
      />
    );
  }

  // Otherwise, show the TV Display
  return (
    <div 
      ref={appRef} 
      className={`bg-sky-50 text-slate-800 font-sans overflow-hidden flex flex-col relative selection:bg-sky-200 ${
        isPseudoFullscreen ? 'fixed inset-0 z-[9999] w-full h-full' : 'min-h-screen'
      }`} 
      dir="rtl"
    >
      <TopoHexBackground />

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
            title="פתיחת ממשק ניהול מקומי"
          >
            <Settings size={20} />
          </button>
        </div>
        
        {toastMsg && (
          <div className="bg-sky-900/80 text-white px-3 py-2 rounded-xl backdrop-blur-md text-xs text-center shadow-lg animate-pulse">
            {toastMsg}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-6 gap-6 z-10 h-screen pb-20">
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
            <div className="flex flex-col items-end border-r-2 border-sky-200/50 pr-8">
              <div className="flex items-center gap-2 text-sky-800 font-semibold text-lg">
                <span>{hebrewDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sky-600 text-sm">
                <span>{dateString}</span>
              </div>
            </div>

            <div className="text-6xl font-black text-sky-900 tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {timeString}
            </div>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-3 gap-6 min-h-0">
          <div className="col-span-2 flex flex-col min-w-0 h-full">
             <ImageCarousel images={settings.images} intervalSecs={settings.imageInterval} />
          </div>

          <div className="col-span-1 flex flex-col h-full">
            <WeatherWidget forecast={forecast} />
            
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

      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-sky-900 text-white z-20 flex items-center shadow-[0_-10px_40px_rgba(2,132,199,0.3)] border-t-4 border-sky-400" dir="ltr">
        <div className="bg-sky-500 h-full flex items-center px-6 font-bold text-xl shrink-0 z-10 shadow-[10px_0_20px_rgba(0,0,0,0.2)]" dir="rtl">
          מבזקי ביה"ס
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div className="animate-ticker flex gap-32 px-10" dir="rtl">
            {settings.tickerMessages.length > 0 ? (
              [...settings.tickerMessages, ...settings.tickerMessages, ...settings.tickerMessages].map((msg, idx) => (
                <span key={idx} className="flex items-center gap-4 text-2xl font-medium shrink-0 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-sky-300 inline-block shrink-0" />
                  {msg}
                </span>
              ))
            ) : (
              <span className="text-2xl font-medium shrink-0">אין הודעות כרגע.</span>
            )}
          </div>
        </div>
      </footer>

      {isAdminOpen && (
        <AdminPanel 
          settings={settings} 
          setSettings={saveSettingsToCloud} 
          onClose={() => setIsAdminOpen(false)} 
        />
      )}

    </div>
  );
}
