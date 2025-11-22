import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Home, ArrowLeft, ArrowRight, RotateCw, X, Plus, Star, 
  Clock, Download, Settings, Maximize, Search, BookMarked,
  Timer, Zap, Columns, PictureInPicture2, FileText, Activity,
  Moon, Shield, Save, Trash2, Grid3x3, Menu
} from 'lucide-react';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');
  
  // Browser state
  const [tabs, setTabs] = useState([{ id: 1, url: 'https://www.google.com', title: 'New Tab', loading: false }]);
  const [activeTab, setActiveTab] = useState(1);
  const [urlInput, setUrlInput] = useState('https://www.google.com');
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('white-gold');
  const [sessions, setSessions] = useState([]);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarNotes, setSidebarNotes] = useState('');
  
  // Feature states
  const [studyMode, setStudyMode] = useState(false);
  const [pomodoroTimer, setPomodoroTimer] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const [splitScreen, setSplitScreen] = useState(false);
  const [floatingPlayer, setFloatingPlayer] = useState(null);
  const [resourceMonitor, setResourceMonitor] = useState({ ram: 45, cpu: 23 });
  const [adBlocker, setAdBlocker] = useState(true);
  const [nightMode, setNightMode] = useState(false);
  
  const iframeRefs = useRef({});

  // Login handler
  const handleLogin = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/auth/login`, { username: username.trim() });
      if (response.data.success) {
        setCurrentUser(response.data.username);
        setShowLogin(false);
        loadUserData(response.data.username);
        toast.success(`Welcome, ${response.data.username}!`);
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  // Load user data
  const loadUserData = async (user) => {
    try {
      const [bookmarksRes, historyRes, prefsRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/bookmarks?user=${user}`),
        axios.get(`${API}/history?user=${user}`),
        axios.get(`${API}/preferences?user=${user}`),
        axios.get(`${API}/sessions?user=${user}`)
      ]);
      
      setBookmarks(bookmarksRes.data);
      setHistory(historyRes.data);
      setTheme(prefsRes.data.theme || 'white-gold');
      setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Navigation
  const navigateToUrl = (url, tabId = activeTab) => {
    let finalUrl = url;
    
    // Handle search shortcuts
    if (url.startsWith('/yt ')) {
      finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(url.slice(4))}`;
    } else if (url.startsWith('/wiki ')) {
      finalUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(url.slice(6))}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.')) {
        finalUrl = `https://${url}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, url: finalUrl, loading: true } : tab
    ));
    
    if (currentUser) {
      addToHistory(finalUrl, new URL(finalUrl).hostname);
    }
    
    setTimeout(() => {
      setTabs(tabs => tabs.map(tab => 
        tab.id === tabId ? { ...tab, loading: false } : tab
      ));
    }, 1000);
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    navigateToUrl(urlInput);
  };

  // Tab management
  const addNewTab = () => {
    const newTab = {
      id: Date.now(),
      url: 'https://www.google.com',
      title: 'New Tab',
      loading: false
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
    setUrlInput(newTab.url);
  };

  const closeTab = (tabId) => {
    if (tabs.length === 1) {
      addNewTab();
    }
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[0].id);
      setUrlInput(newTabs[0].url);
    }
  };

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setUrlInput(tab.url);
    }
  };

  // Bookmarks
  const addBookmark = async () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    if (!currentTab || !currentUser) return;
    
    try {
      await axios.post(`${API}/bookmarks?user=${currentUser}`, {
        url: currentTab.url,
        title: currentTab.title || new URL(currentTab.url).hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(currentTab.url).hostname}`
      });
      
      const response = await axios.get(`${API}/bookmarks?user=${currentUser}`);
      setBookmarks(response.data);
      toast.success('Bookmark added!');
    } catch (error) {
      toast.error('Failed to add bookmark');
    }
  };

  const removeBookmark = async (bookmarkId) => {
    try {
      await axios.delete(`${API}/bookmarks/${bookmarkId}?user=${currentUser}`);
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      toast.success('Bookmark removed');
    } catch (error) {
      toast.error('Failed to remove bookmark');
    }
  };

  // History
  const addToHistory = async (url, title) => {
    if (!currentUser) return;
    
    try {
      await axios.post(`${API}/history?user=${currentUser}`, { url, title });
    } catch (error) {
      console.error('Failed to add history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/history?user=${currentUser}`);
      setHistory([]);
      toast.success('History cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  // Sessions
  const saveSession = async () => {
    if (!currentUser) return;
    
    const sessionName = prompt('Enter session name:');
    if (!sessionName) return;
    
    try {
      await axios.post(`${API}/sessions?user=${currentUser}`, {
        name: sessionName,
        tabs: tabs.map(t => ({ url: t.url, title: t.title }))
      });
      
      const response = await axios.get(`${API}/sessions?user=${currentUser}`);
      setSessions(response.data);
      toast.success('Session saved!');
    } catch (error) {
      toast.error('Failed to save session');
    }
  };

  const loadSession = (session) => {
    const newTabs = session.tabs.map((tab, index) => ({
      id: Date.now() + index,
      url: tab.url,
      title: tab.title,
      loading: false
    }));
    setTabs(newTabs);
    setActiveTab(newTabs[0].id);
    setUrlInput(newTabs[0].url);
    setShowSessions(false);
    toast.success('Session restored!');
  };

  const deleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API}/sessions/${sessionId}?user=${currentUser}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  // Theme change
  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    if (currentUser) {
      try {
        await axios.put(`${API}/preferences?user=${currentUser}`, { theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  // Pomodoro timer
  useEffect(() => {
    let interval;
    if (timerRunning && pomodoroTimer > 0) {
      interval = setInterval(() => {
        setPomodoroTimer(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTimer === 0) {
      toast.success('Pomodoro session complete!');
      setTimerRunning(false);
      setPomodoroTimer(25 * 60);
    }
    return () => clearInterval(interval);
  }, [timerRunning, pomodoroTimer]);

  // Resource monitor simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setResourceMonitor({
        ram: Math.floor(Math.random() * 30) + 40,
        cpu: Math.floor(Math.random() * 20) + 15
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  if (showLogin) {
    return (
      <div className={`browser-container theme-${theme}`}>
        <div className="login-overlay">
          <div className="login-box">
            <h1 className="login-title">VoltX Browser</h1>
            <p className="login-subtitle">Enter your username to continue</p>
            <Input
              data-testid="username-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="login-input"
            />
            <Button data-testid="login-button" onClick={handleLogin} className="login-button">
              Start Browsing
            </Button>
          </div>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className={`browser-container theme-${theme}`}>
      <Toaster position="top-center" />
      
      {/* Browser Chrome */}
      <div className="browser-chrome">
        {/* Tab Bar */}
        <div className="tab-bar">
          <div className="tabs-container">
            {tabs.map(tab => (
              <div
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                className={`browser-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="tab-title">{tab.title}</span>
                <button
                  data-testid={`close-tab-${tab.id}`}
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button data-testid="new-tab-button" className="new-tab-button" onClick={addNewTab}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="nav-bar">
          <div className="nav-controls">
            <button data-testid="back-button" className="nav-button" onClick={() => toast.info('Back navigation')}>
              <ArrowLeft size={18} />
            </button>
            <button data-testid="forward-button" className="nav-button" onClick={() => toast.info('Forward navigation')}>
              <ArrowRight size={18} />
            </button>
            <button data-testid="refresh-button" className="nav-button" onClick={() => navigateToUrl(currentTab?.url || '')}>
              <RotateCw size={18} />
            </button>
            <button data-testid="home-button" className="nav-button" onClick={() => navigateToUrl('https://www.google.com')}>
              <Home size={18} />
            </button>
          </div>

          <form onSubmit={handleUrlSubmit} className="address-bar-form">
            <div className="address-bar">
              <Search size={16} className="address-icon" />
              <Input
                data-testid="address-bar"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Search or enter URL (try /yt or /wiki)"
                className="address-input"
              />
            </div>
          </form>

          <div className="toolbar-buttons">
            <button data-testid="bookmark-button" className="toolbar-button" onClick={addBookmark}>
              <Star size={18} />
            </button>
            <button data-testid="bookmarks-list-button" className="toolbar-button" onClick={() => setShowBookmarks(true)}>
              <BookMarked size={18} />
            </button>
            <button data-testid="history-button" className="toolbar-button" onClick={() => setShowHistory(true)}>
              <Clock size={18} />
            </button>
            <button data-testid="downloads-button" className="toolbar-button" onClick={() => setShowDownloads(true)}>
              <Download size={18} />
            </button>
            <button data-testid="settings-button" className="toolbar-button" onClick={() => setShowSettings(true)}>
              <Settings size={18} />
            </button>
            <button data-testid="fullscreen-button" className="toolbar-button" onClick={toggleFullscreen}>
              <Maximize size={18} />
            </button>
          </div>
        </div>

        {/* Bookmarks Bar */}
        {bookmarks.length > 0 && (
          <div className="bookmarks-bar">
            {bookmarks.slice(0, 10).map(bookmark => (
              <button
                key={bookmark.id}
                data-testid={`bookmark-${bookmark.id}`}
                className="bookmark-item"
                onClick={() => navigateToUrl(bookmark.url)}
              >
                {bookmark.favicon && <img src={bookmark.favicon} alt="" className="bookmark-favicon" />}
                <span>{bookmark.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Feature Bar */}
        <div className="feature-bar">
          <button
            data-testid="study-mode-button"
            className={`feature-button ${studyMode ? 'active' : ''}`}
            onClick={() => {
              setStudyMode(!studyMode);
              toast.info(studyMode ? 'Study mode disabled' : 'Study mode enabled');
            }}
          >
            <Timer size={16} />
            <span>Study Mode</span>
          </button>
          
          <button
            data-testid="game-mode-button"
            className={`feature-button ${gameMode ? 'active' : ''}`}
            onClick={() => {
              setGameMode(!gameMode);
              toast.success(gameMode ? 'Game mode disabled' : 'Game mode optimized!');
            }}
          >
            <Zap size={16} />
            <span>Game Mode</span>
          </button>

          <button
            data-testid="split-screen-button"
            className={`feature-button ${splitScreen ? 'active' : ''}`}
            onClick={() => setSplitScreen(!splitScreen)}
          >
            <Columns size={16} />
            <span>Split View</span>
          </button>

          <button data-testid="notes-button" className="feature-button" onClick={() => setShowSidebar(!showSidebar)}>
            <FileText size={16} />
            <span>Notes</span>
          </button>

          <button data-testid="sessions-button" className="feature-button" onClick={() => setShowSessions(true)}>
            <Save size={16} />
            <span>Sessions</span>
          </button>

          <div className="resource-monitor">
            <Activity size={16} />
            <span>RAM: {resourceMonitor.ram}%</span>
            <span>CPU: {resourceMonitor.cpu}%</span>
          </div>

          {studyMode && (
            <div className="pomodoro-timer">
              <Timer size={16} />
              <span>{Math.floor(pomodoroTimer / 60)}:{(pomodoroTimer % 60).toString().padStart(2, '0')}</span>
              <button
                data-testid="timer-toggle"
                onClick={() => setTimerRunning(!timerRunning)}
                className="timer-control"
              >
                {timerRunning ? 'Pause' : 'Start'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-area">
        {showSidebar && (
          <div className="notes-sidebar">
            <div className="sidebar-header">
              <FileText size={18} />
              <h3>Quick Notes</h3>
              <button onClick={() => setShowSidebar(false)}>
                <X size={18} />
              </button>
            </div>
            <textarea
              data-testid="notes-textarea"
              className="notes-textarea"
              value={sidebarNotes}
              onChange={(e) => setSidebarNotes(e.target.value)}
              placeholder="Take notes while browsing..."
            />
          </div>
        )}

        <div className={`iframe-container ${splitScreen ? 'split' : ''}`}>
          {splitScreen ? (
            <>
              <div className="iframe-pane">
                <iframe
                  key={currentTab?.id}
                  ref={el => iframeRefs.current[currentTab?.id] = el}
                  src={currentTab?.url}
                  title={currentTab?.title}
                  className="browser-iframe"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  onError={() => toast.error('Failed to load this page (CORS restriction)')}
                />
              </div>
              <div className="iframe-pane">
                <iframe
                  src="https://www.google.com"
                  title="Split view"
                  className="browser-iframe"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            </>
          ) : (
            currentTab && (
              <iframe
                key={currentTab.id}
                data-testid="main-iframe"
                ref={el => iframeRefs.current[currentTab.id] = el}
                src={currentTab.url}
                title={currentTab.title}
                className="browser-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                onError={() => toast.error('Failed to load this page (CORS restriction)')}
              />
            )
          )}
          
          {currentTab?.loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="settings-dialog" data-testid="settings-dialog">
          <DialogHeader>
            <DialogTitle>Browser Settings</DialogTitle>
            <DialogDescription>Customize your browsing experience</DialogDescription>
          </DialogHeader>
          
          <div className="settings-content">
            <div className="setting-section">
              <h3>Theme</h3>
              <div className="theme-grid">
                {[
                  { id: 'white-gold', name: 'White Gold', preview: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)' },
                  { id: 'black-gold', name: 'Black Gold', preview: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' },
                  { id: 'tech-dark', name: 'Tech Dark', preview: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)' },
                  { id: 'space-dark', name: 'Space Dark', preview: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
                  { id: 'eco-green', name: 'Eco Green', preview: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' }
                ].map(t => (
                  <button
                    key={t.id}
                    data-testid={`theme-${t.id}`}
                    className={`theme-option ${theme === t.id ? 'active' : ''}`}
                    onClick={() => changeTheme(t.id)}
                  >
                    <div className="theme-preview" style={{ background: t.preview }} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="setting-section">
              <div className="setting-row">
                <div>
                  <h4>Ad Blocker</h4>
                  <p className="text-sm text-muted">Block ads for faster browsing</p>
                </div>
                <Switch checked={adBlocker} onCheckedChange={setAdBlocker} data-testid="ad-blocker-switch" />
              </div>

              <div className="setting-row">
                <div>
                  <h4>Night Reading Mode</h4>
                  <p className="text-sm text-muted">Enhanced dark mode with warm colors</p>
                </div>
                <Switch checked={nightMode} onCheckedChange={setNightMode} data-testid="night-mode-switch" />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="setting-section">
              <h3>Logged in as: {currentUser}</h3>
              <Button
                data-testid="save-session-button"
                onClick={saveSession}
                className="w-full"
              >
                <Save size={16} className="mr-2" />
                Save Current Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookmarks Dialog */}
      <Dialog open={showBookmarks} onOpenChange={setShowBookmarks}>
        <DialogContent data-testid="bookmarks-dialog">
          <DialogHeader>
            <DialogTitle>Bookmarks</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {bookmarks.length === 0 ? (
              <p className="text-center text-muted py-8">No bookmarks yet</p>
            ) : (
              <div className="bookmark-list">
                {bookmarks.map(bookmark => (
                  <div key={bookmark.id} className="bookmark-list-item">
                    {bookmark.favicon && <img src={bookmark.favicon} alt="" className="bookmark-favicon" />}
                    <div className="bookmark-info" onClick={() => {
                      navigateToUrl(bookmark.url);
                      setShowBookmarks(false);
                    }}>
                      <div className="bookmark-title">{bookmark.title}</div>
                      <div className="bookmark-url">{bookmark.url}</div>
                    </div>
                    <button
                      data-testid={`delete-bookmark-${bookmark.id}`}
                      onClick={() => removeBookmark(bookmark.id)}
                      className="delete-button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent data-testid="history-dialog">
          <DialogHeader>
            <DialogTitle>Browsing History</DialogTitle>
            <Button
              data-testid="clear-history-button"
              onClick={clearHistory}
              variant="destructive"
              size="sm"
            >
              Clear History
            </Button>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {history.length === 0 ? (
              <p className="text-center text-muted py-8">No history</p>
            ) : (
              <div className="history-list">
                {history.map((entry, index) => (
                  <div
                    key={index}
                    className="history-item"
                    onClick={() => {
                      navigateToUrl(entry.url);
                      setShowHistory(false);
                    }}
                  >
                    <Clock size={16} />
                    <div>
                      <div className="history-title">{entry.title}</div>
                      <div className="history-url">{entry.url}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Downloads Dialog */}
      <Dialog open={showDownloads} onOpenChange={setShowDownloads}>
        <DialogContent data-testid="downloads-dialog">
          <DialogHeader>
            <DialogTitle>Downloads</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted">
            <Download size={48} className="mx-auto mb-4 opacity-50" />
            <p>No downloads yet</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sessions Dialog */}
      <Dialog open={showSessions} onOpenChange={setShowSessions}>
        <DialogContent data-testid="sessions-dialog">
          <DialogHeader>
            <DialogTitle>Saved Sessions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {sessions.length === 0 ? (
              <p className="text-center text-muted py-8">No saved sessions</p>
            ) : (
              <div className="session-list">
                {sessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div className="session-info" onClick={() => loadSession(session)}>
                      <div className="session-name">{session.name}</div>
                      <div className="session-meta">{session.tabs.length} tabs</div>
                    </div>
                    <button
                      data-testid={`delete-session-${session.id}`}
                      onClick={() => deleteSession(session.id)}
                      className="delete-button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;