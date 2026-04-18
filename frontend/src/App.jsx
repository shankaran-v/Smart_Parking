import React, { useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import Register from './components/Register';
import OwnerDashboard from './components/OwnerDashboard';
import UserDashboard from './components/UserDashboard';
import Navbar from './components/Navbar';
import './App.css';

export const AuthContext = createContext();

function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        return {
          isAuthenticated: true,
          user: userData,
          token: userData.token || null
        };
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('user');
    }
    return {
      isAuthenticated: false,
      user: null,
      token: null
    };
  });

  const login = (userData) => {
    const normalizedUser = {
      ...userData,
      id: userData.id || userData.user_id,
      user_id: userData.user_id || userData.id,
      token: userData.token || null
    };

    setAuth({
      isAuthenticated: true,
      user: normalizedUser,
      token: normalizedUser.token
    });
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null
    });
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      <Router>
        <div className="App">
          {/* Floating Parking Icons */}
          <div className="parking-icon">🚗</div>
          <div className="parking-icon">🅿️</div>
          <div className="parking-icon">🚙</div>
          <div className="parking-icon">🅿️</div>
          <div className="parking-icon">🚗</div>

          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/owner-dashboard"
                element={auth.isAuthenticated && auth.user?.role === 'owner' ?
                  <OwnerDashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="/user-dashboard"
                element={auth.isAuthenticated && auth.user?.role === 'user' ?
                  <UserDashboard /> : <Navigate to="/login" />}
              />
              <Route path="/" element={
                <Navigate to={auth.isAuthenticated ?
                  (auth.user?.role === 'owner' ? '/owner-dashboard' : '/user-dashboard') : '/login'} />}
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;