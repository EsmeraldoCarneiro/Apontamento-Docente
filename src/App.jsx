import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Login from './pages/Login';
import CadastroAlunos from './pages/CadastroAlunos';
import Chamada from './pages/Chamada';
import GestaoNotas from './pages/GestaoNotas';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (carregando) return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'Arial' }}>
      <div style={{ color: '#96190c', fontWeight: 'bold' }}>CARREGANDO SISTEMA...</div>
    </div>
  );

  return (
    <Router>
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
        {usuario && (
          <nav className="nav-container" style={{
            padding: '10px 1rem', backgroundColor: '#000000', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '10px', borderBottom: '4px solid #96190c'
          }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px' }}>
                DOCENTE <span style={{ color: '#96190c' }}>PRO</span>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <Link to="/" style={navLinkStyle}>TURMAS</Link>
                <Link to="/chamada" style={navLinkStyle}>CHAMADA</Link>
                <Link to="/notas" style={navLinkStyle}>NOTAS</Link>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <small style={{ color: '#fff', fontSize: '0.7rem' }}>{usuario.email}</small>
              <button onClick={handleLogout} style={btnLogoutStyle}>SAIR</button>
            </div>
          </nav>
        )}

        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '10px', boxSizing: 'border-box' }}>
          <Routes>
            <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={usuario ? <CadastroAlunos /> : <Navigate to="/login" />} />
            <Route path="/chamada" element={usuario ? <Chamada /> : <Navigate to="/login" />} />
            <Route path="/notas" element={usuario ? <GestaoNotas /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const navLinkStyle = { color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' };
const btnLogoutStyle = { backgroundColor: '#96190c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' };

export default App;