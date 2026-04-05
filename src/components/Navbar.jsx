import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Se estiver no login ou na raiz, a barra não aparece
  if (location.pathname === '/login' || location.pathname === '/') return null;

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair?")) {
      await auth.signOut();
      navigate('/login');
    }
  };

  return (
    <nav className="nav-container">
      <Link to="/cadastro-alunos" className="nav-link">Turmas</Link>
      <Link to="/chamada" className="nav-link">Chamada</Link>
      <Link to="/gestao-notas" className="nav-link">Notas</Link>
      <button onClick={handleLogout} className="nav-link btn-sair">
        Sair ✕
      </button>
    </nav>
  );
}