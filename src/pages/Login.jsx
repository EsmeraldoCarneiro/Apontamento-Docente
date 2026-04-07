import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) { await signInWithEmailAndPassword(auth, email, senha); } 
      else { await createUserWithEmailAndPassword(auth, email, senha); }
      navigate('/');
    } catch { alert("Erro na autenticação. Verifique os dados."); }
  };

  // ESTILOS PADRONIZADOS
  const containerStyle = { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundColor: '#f8f9fa',
    padding: '20px',
    boxSizing: 'border-box'
  };

  const cardStyle = { 
    padding: '40px 30px', 
    borderRadius: '25px', 
    backgroundColor: '#fff', 
    width: '100%', 
    maxWidth: '400px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    textAlign: 'center'
  };

  const inputModerno = { 
    padding: '15px', 
    borderRadius: '12px', 
    border: 'none', 
    backgroundColor: '#333', 
    color: '#fff', 
    fontWeight: 'bold', 
    outline: 'none',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  const btnSubmitModern = { 
    padding: '15px', 
    backgroundColor: '#96190c', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '15px', 
    fontWeight: '900', 
    cursor: 'pointer', 
    fontSize: '1rem',
    letterSpacing: '1px',
    boxShadow: '0 4px 15px rgba(150, 25, 12, 0.3)',
    marginTop: '10px'
  };

  const btnSwitchModern = { 
    background: 'none', 
    border: 'none', 
    color: '#666', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    marginTop: '25px', 
    fontSize: '0.85rem',
    textDecoration: 'none'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: '#333', margin: '0 0 5px 0', letterSpacing: '1px', fontWeight: '900', fontSize: '1.8rem' }}>
          {isLogin ? 'ACESSO' : 'CADASTRO'}
        </h2>
        <p style={{ color: '#96190c', fontWeight: '800', marginBottom: '35px', fontSize: '0.9rem', textTransform: 'uppercase' }}>
          Docente Pro System
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="E-MAIL" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={inputModerno} 
          />
          <input 
            type="password" 
            placeholder="SENHA" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)} 
            required 
            style={inputModerno} 
          />
          <button type="submit" style={btnSubmitModern}>
            {isLogin ? 'ENTRAR NO SISTEMA' : 'CRIAR MINHA CONTA'}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} style={btnSwitchModern}>
          {isLogin ? (
            <span>Não tem conta? <strong style={{color: '#96190c'}}>Cadastre-se</strong></span>
          ) : (
            <span>Já possui acesso? <strong style={{color: '#96190c'}}>Faça Login</strong></span>
          )}
        </button>
      </div>
    </div>
  );
}