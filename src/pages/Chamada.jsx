import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, query, where, doc, addDoc, 
  getDocs, updateDoc, deleteDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

export default function Chamada() {
  const obterDataHoje = () => new Date().toISOString().split('T')[0];
  const [turmas, setTurmas] = useState([]);
  const [idTurmaSelecionada, setIdTurmaSelecionada] = useState('');
  const [dataAula, setDataAula] = useState(obterDataHoje());
  const [conteudo, setConteudo] = useState('');
  const [presencas, setPresencas] = useState({});
  const [idChamadaExistente, setIdChamadaExistente] = useState(null);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "turmas"), where("userId", "==", user.uid), orderBy("nomeTurma", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setTurmas(lista);
    });
    return () => unsubscribe();
  }, []);

  const buscarChamada = async () => {
    const user = auth.currentUser;
    if (!idTurmaSelecionada || !user) return alert("Selecione a Turma.");
    const q = query(collection(db, "historico_chamadas"), 
      where("userId", "==", user.uid), 
      where("idTurma", "==", idTurmaSelecionada), 
      where("dataAula", "==", dataAula)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setIdChamadaExistente(snap.docs[0].id);
        setConteudo(d.conteudo || '');
        setPresencas(d.listaPresenca || {});
      } else { 
        setIdChamadaExistente(null); setConteudo(''); setPresencas({}); 
      }
      setMostrarTabela(true);
    } catch (e) { console.error(e); }
  };

  const salvarChamada = async () => {
    const user = auth.currentUser;
    if (!idTurmaSelecionada || !user) return;
    const turma = turmas.find(t => t.id === idTurmaSelecionada);
    const dados = { 
      userId: user.uid, 
      idTurma: idTurmaSelecionada, 
      nomeTurma: turma.nomeTurma, 
      materia: turma.materia || '',
      turno: turma.turno || '',
      dataAula, 
      conteudo, 
      listaPresenca: presencas, 
      timestamp: serverTimestamp() 
    };
    try {
      if (idChamadaExistente) { await updateDoc(doc(db, "historico_chamadas", idChamadaExistente), dados); } 
      else { await addDoc(collection(db, "historico_chamadas"), dados); }
      alert("CHAMADA SALVA!");
      resetar();
    } catch (e) { console.error(e); }
  };

  const resetar = () => {
    setIdChamadaExistente(null); setConteudo(''); setPresencas({}); setIdTurmaSelecionada(''); setDataAula(obterDataHoje()); setMostrarTabela(false);
  };

  const turmaAtiva = mostrarTabela ? turmas.find(t => t.id === idTurmaSelecionada) : null;

  return (
    <div style={{ padding: '10px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#000', fontWeight: '900', textTransform: 'uppercase' }}>Diário de Classe</h2>
      
      {/* CONTAINER DE BUSCA RESPONSIVO */}
      <div style={containerBuscaStyle}>
        <select 
          value={idTurmaSelecionada} 
          onChange={e => { setIdTurmaSelecionada(e.target.value); setMostrarTabela(false); }} 
          style={inputResponsivoStyle}
        >
          <option value="">TURMA</option>
          {turmas.map(t => (
            <option key={t.id} value={t.id}>
              {t.nomeTurma} - {t.materia} ({t.turno?.toUpperCase()})
            </option>
          ))}
        </select>
        
        <input 
          type="date" 
          value={dataAula} 
          onChange={e => { setDataAula(e.target.value); setMostrarTabela(false); }} 
          style={inputResponsivoStyle} 
        />
        
        <button onClick={buscarChamada} style={btnPesquisarStyle}>PESQUISAR</button>
      </div>

      {turmaAtiva && (
        <div style={{ border: '2px solid #000', padding: '15px', backgroundColor: '#fff' }}>
          <div style={{ marginBottom: '15px', borderBottom: '2px solid #f4f4f4', paddingBottom: '10px' }}>
             <strong style={{ fontSize: '0.85rem', color: '#96190c', textTransform: 'uppercase' }}>
                {turmaAtiva.nomeTurma} | {turmaAtiva.materia} | {turmaAtiva.turno}
             </strong>
          </div>

          <label style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>CONTEÚDO DA AULA:</label>
          <textarea 
            value={conteudo} 
            onChange={e => setConteudo(e.target.value)} 
            placeholder="Resumo da aula..."
            style={{ width: '100%', height: '100px', marginTop: '10px', padding: '10px', border: '1px solid #000', fontWeight: 'bold', boxSizing: 'border-box' }} 
          />
          
          <div className="table-container" style={{ marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#000', color: '#fff' }}>
                <tr>
                  <th style={thStyle}>ESTUDANTE</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>PRESENÇA</th>
                </tr>
              </thead>
              <tbody>
                {turmaAtiva.alunos.map(n => (
                  <tr key={n} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>{n}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!presencas[n]} 
                        onChange={() => setPresencas(p => ({ ...p, [n]: !p[n] }))} 
                        style={{ width: '25px', height: '25px', accentColor: '#96190c' }} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={salvarChamada} style={btnRedStyle}>SALVAR DIÁRIO</button>
            <button onClick={resetar} style={btnBlackStyle}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ESTILOS DE RESPONSIVIDADE (CSS-IN-JS)
const containerBuscaStyle = {
  display: 'flex',
  flexWrap: 'wrap', // Permite quebrar linha no mobile
  gap: '10px',
  marginBottom: '20px',
  padding: '15px',
  border: '2px solid #000',
  backgroundColor: '#fff'
};

const inputResponsivoStyle = {
  flex: '1 1 200px', // Cresce para ocupar espaço, mas quebra se tiver menos de 200px
  padding: '12px',
  border: '1px solid #000',
  fontWeight: 'bold',
  outline: 'none',
  minWidth: '0' // Evita que o select estoure o container
};

const btnPesquisarStyle = {
  flex: '1 1 100%', // No mobile tenta ocupar a linha toda
  padding: '12px 25px',
  backgroundColor: '#000',
  color: '#fff',
  border: 'none',
  fontWeight: 'bold',
  cursor: 'pointer'
};

// Outros estilos
const btnBlackStyle = { padding: '15px', backgroundColor: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: '1' };
const btnRedStyle = { padding: '15px', backgroundColor: '#96190c', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '900', flex: '2' };
const thStyle = { padding: '15px', textAlign: 'left', fontSize: '0.65rem' };