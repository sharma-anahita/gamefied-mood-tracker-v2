import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css'; // Import the new CSS file

// Base URL for the backend API
const API_URL = 'http://localhost:5001/api';

/**
 * Custom Hook to manage authentication state and persist it to localStorage.
 */
function useAuth() {
  const [auth, setAuth] = useState(() => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        return JSON.parse(storedAuth);
      } catch (e) {
        console.error("Failed to parse auth from localStorage", e);
        localStorage.removeItem('auth');
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem('auth', JSON.stringify(auth));
    } else {
      localStorage.removeItem('auth');
    }
  }, [auth]);

  const authFetch = useCallback(async (url, options = {}) => {
    if (!auth || !auth.token) {
      throw new Error('No authentication token found.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      setAuth(null);
      throw new Error('Unauthorized. Please log in again.');
    }
    
    return response;
  }, [auth]);

  const login = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    setAuth(data);
  };

  const register = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    
    const data = await response.json();
    setAuth(data);
  };

  const logout = () => {
    setAuth(null);
  };

  return { auth, authFetch, login, register, logout };
}

/**
 * Main App Component
 */
export default function App() {
  const { auth, authFetch, login, register, logout } = useAuth();
  const [page, setPage] = useState('login'); // 'login', 'register'

  if (auth) {
    return <DashboardScreen auth={auth} authFetch={authFetch} logout={logout} />;
  }

  return (
    <div className="auth-page-container">
      {page === 'login' ? (
        <AuthScreen
          title="Login"
          submitHandler={login}
          switchText="Don't have an account?"
          switchLinkText="Register"
          onSwitch={() => setPage('register')}
        />
      ) : (
        <AuthScreen
          title="Register"
          submitHandler={register}
          switchText="Already have an account?"
          switchLinkText="Login"
          onSwitch={() => setPage('login')}
        />
      )}
    </div>
  );
}

/**
 * Authentication Screen Component (Login/Register)
 */
function AuthScreen({ title, submitHandler, switchText, switchLinkText, onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitHandler(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">{title}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            required
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Submitting...' : title}
          </button>
        </div>
      </form>
      <p className="auth-switch-text">
        {switchText}{' '}
        <button
          onClick={onSwitch}
          className="auth-switch-link"
        >
          {switchLinkText}
        </button>
      </p>
    </div>
  );
}


/**
 * Main Dashboard Screen (The original app)
 */
function DashboardScreen({ auth, authFetch, logout }) {
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [journal, setJournal] = useState('');
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const moodOptions = {
    happy: { emoji: '😊', color: 'mood-color-happy' },
    good: { emoji: '🙂', color: 'mood-color-good' },
    neutral: { emoji: '😐', color: 'mood-color-neutral' },
    sad: { emoji: '😟', color: 'mood-color-sad' },
    upset: { emoji: '😠', color: 'mood-color-upset' },
  };

  useEffect(() => {
    const fetchMoods = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch(`${API_URL}/moods`);
        if (!response.ok) {
          throw new Error('Failed to fetch mood history.');
        }
        const data = await response.json();
        setMoodHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMoods();
  }, [authFetch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    const newEntry = {
      mood: selectedMood,
      journal,
      date: new Date().toISOString(),
    };

    try {
      const response = await authFetch(`${API_URL}/moods`, {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to save mood. Please try again.');
      }

      const savedEntry = await response.json();
      setMoodHistory([savedEntry, ...moodHistory]);
      setSelectedMood('neutral');
      setJournal('');
      setMessage('Mood saved successfully! You earned 10 points.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
    }
  };

  const totalPoints = useMemo(() => moodHistory.length * 10, [moodHistory]);

  const currentStreak = useMemo(() => {
    if (moodHistory.length === 0) return 0;
    const sortedEntries = [...moodHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    const entryDates = new Set(
      sortedEntries.map(entry => {
        const d = new Date(entry.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    if (entryDates.has(today.getTime())) {
      streak++;
    } else {
      let yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (!entryDates.has(yesterday.getTime())) {
        return 0;
      }
      today = yesterday;
      streak++;
    }

    let currentDate = new Date(today);
    while (true) {
      let previousDay = new Date(currentDate);
      previousDay.setDate(currentDate.getDate() - 1);
      if (entryDates.has(previousDay.getTime())) {
        streak++;
        currentDate = previousDay;
      } else {
        break;
      }
    }
    return streak;
  }, [moodHistory]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Mood Tracker</h1>
          <p className="dashboard-subtitle">Welcome, {auth.username}!</p>
        </div>
        <button
          onClick={logout}
          className="logout-button"
        >
          Logout
        </button>
      </header>

      <div className="gamification-grid">
        <div className="stat-card">
          <h3 className="stat-title">Total Points</h3>
          <p className="stat-value-points">{totalPoints}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Current Streak</h3>
          <p className="stat-value-streak">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</p>
        </div>
      </div>

      <div className="main-content-grid">
        <div className="mood-form-container">
          <form onSubmit={handleSubmit} className="mood-form">
            <h2 className="form-title">Log Your Mood</h2>
            
            <fieldset className="form-group">
              <legend className="form-legend">Select your mood:</legend>
              <div className="mood-selection">
                {Object.entries(moodOptions).map(([mood, { emoji }]) => (
                  <label 
                    key={mood} 
                    className={`mood-label ${selectedMood === mood ? 'mood-selected' : ''}`}
                    title={mood.charAt(0).toUpperCase() + mood.slice(1)}
                  >
                    <input
                      type="radio"
                      name="mood"
                      value={mood}
                      checked={selectedMood === mood}
                      onChange={() => setSelectedMood(mood)}
                      className="mood-radio-input"
                    />
                    {emoji}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-group">
              <label htmlFor="journal" className="form-label">
                Add a journal entry (optional)
              </label>
              <textarea
                id="journal"
                rows="4"
                className="form-textarea"
                placeholder="What's on your mind?"
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group">
              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                {loading ? 'Saving...' : 'Save Mood'}
              </button>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </form>
        </div>

        <div className="mood-history-container">
          <h2 className="history-title">Mood History</h2>
          <div className="history-list-card">
            {loading && moodHistory.length === 0 && <p className="loading-text">Loading history...</p>}
            
            <ul className="history-list">
              {moodHistory.length === 0 && !loading && <p className="empty-text">No moods logged yet, {auth.username}. Start by adding one!</p>}
              
              {moodHistory.map((entry) => (
                <li key={entry._id} className="history-item">
                  <div className="history-item-icon-container">
                    <span className={`history-item-icon ${moodOptions[entry.mood]?.color || 'mood-color-neutral'}`}>
                      {moodOptions[entry.mood]?.emoji || '❓'}
                    </span>
                  </div>
                  <div className="history-item-content">
                    <div className="history-item-header">
                      <p className="history-item-mood">
                        {entry.mood}
                      </p>
                      <time dateTime={entry.date} className="history-item-time">
                        {formatDate(entry.date)}
                      </time>
                    </div>
                    {entry.journal && (
                      <p className="history-item-journal">{entry.journal}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

