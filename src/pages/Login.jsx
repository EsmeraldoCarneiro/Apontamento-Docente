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

  return (
    <div style={containerLogin}>
      <div style={cardLogin}>
        <h2 style={{ textAlign: 'center', color: '#000', margin: '0 0 10px 0', letterSpacing: '2px', fontWeight: '900' }}>
          {isLogin ? 'ACESSO' : 'CADASTRO'}
        </h2>
        <p style={{ textAlign: 'center', color: '#96190c', fontWeight: 'bold', marginBottom: '30px', fontSize: '0.8rem' }}>
          DOCENTE PRO SYSTEM
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input type="email" placeholder="E-MAIL" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="SENHA" value={senha} onChange={(e) => setSenha(e.target.value)} required style={inputStyle} />
          <button type="submit" style={btnSubmit}>
            {isLogin ? 'ENTRAR' : 'FINALIZAR'}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} style={btnSwitch}>
          {isLogin ? 'CRIAR NOVA CONTA' : 'JÁ TENHO ACESSO'}
        </button>
      </div>
    </div>
  );
}

// Estilos Responsivos
const containerLogin = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90vh', padding: '20px' };
const cardLogin = { 
  padding: '40px 30px', 
  border: '5px solid #000', 
  backgroundColor: '#fff', 
  width: '100%', 
  maxWidth: '350px', 
  boxShadow: '10px 10px 0px #96190c',
  boxSizing: 'border-box' 
};
const inputStyle = { padding: '12px', border: '2px solid #000', outline: 'none', fontWeight: 'bold', color: '#000', fontSize: '1rem' };
const btnSubmit = { padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' };
const btnSwitch = { background: 'none', border: 'none', color: '#96190c', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '20px', textDecoration: 'underline', fontSize: '0.8rem' };