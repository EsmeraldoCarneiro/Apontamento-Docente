import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, query, where, doc, addDoc, 
  getDocs, updateDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

export default function Chamada() {
  const obterDataHoje = () => new Date().toISOString().split('T')[0];
  const [turmas, setTurmas] = useState([]);
  const [idTurmaSelecionada, setIdTurmaSelecionada] = useState('');
  const [dataAula, setDataAula] = useState(obterDataHoje());
  const [qtdAulasDoDia, setQtdAulasDoDia] = useState(1);
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
        setQtdAulasDoDia(d.qtdAulasDoDia || 1);
      } else { 
        setIdChamadaExistente(null); 
        setConteudo(''); 
        setPresencas({}); 
        setQtdAulasDoDia(1);
      }
      setMostrarTabela(true);
    } catch (e) { console.error(e); }
  };

  const alternarPresenca = (nomeAluno, indexAula) => {
    setPresencas(prev => {
      const atual = prev[nomeAluno] ? [...prev[nomeAluno]] : Array(qtdAulasDoDia).fill(false);
      while(atual.length < qtdAulasDoDia) atual.push(false);
      atual[indexAula] = !atual[indexAula];
      return { ...prev, [nomeAluno]: atual };
    });
  };

  const salvarChamada = async () => {
    const user = auth.currentUser;
    const turma = turmas.find(t => t.id === idTurmaSelecionada);
    
    const dados = { 
      userId: user.uid, 
      idTurma: idTurmaSelecionada, 
      nomeTurma: turma.nomeTurma, 
      materia: turma.materia || '',
      turno: turma.turno || '',
      dataAula, 
      qtdAulasDoDia, 
      conteudo, 
      listaPresenca: presencas, 
      timestamp: serverTimestamp() 
    };

    try {
      if (idChamadaExistente) { 
        await updateDoc(doc(db, "historico_chamadas", idChamadaExistente), dados); 
      } else { 
        await addDoc(collection(db, "historico_chamadas"), dados); 
      }
      alert("CHAMADA MULTI-AULA SALVA!");
      resetar();
    } catch (e) { console.error(e); }
  };

  const resetar = () => {
    setIdChamadaExistente(null); setConteudo(''); setPresencas({}); 
    setIdTurmaSelecionada(''); setDataAula(obterDataHoje()); setMostrarTabela(false);
  };

  const turmaAtiva = mostrarTabela ? turmas.find(t => t.id === idTurmaSelecionada) : null;

  // ESTILOS PADRONIZADOS
  const thStyle = { padding: '15px 10px', fontSize: '0.65rem', textAlign: 'center', fontWeight: '800' };
  const tdStyle = { padding: '12px 10px', borderBottom: '1px solid #f0f0f0', fontWeight: '800', fontSize: '0.8rem', color: '#333' };
  const inputEstiloModerno = { padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#333', color: '#fff', fontWeight: 'bold', outline: 'none', flex: 1, minWidth: '140px' };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#333', marginBottom: '20px' }}>DIÁRIO MULTI-AULA</h2>
      
      {/* Container de Filtros */}
      <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <select value={idTurmaSelecionada} onChange={e => { setIdTurmaSelecionada(e.target.value); setMostrarTabela(false); }} style={inputEstiloModerno}>
          <option value="">TURMA</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nomeTurma} - {t.materia}</option>)}
        </select>
        
        <input type="date" value={dataAula} onChange={e => { setDataAula(e.target.value); setMostrarTabela(false); }} style={inputEstiloModerno} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#333', padding: '0 15px', borderRadius: '12px', color: '#fff' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '800' }}>AULAS:</label>
            <select value={qtdAulasDoDia} onChange={e => setQtdAulasDoDia(Number(e.target.value))} style={{ background: 'none', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v} style={{color:'#000'}}>{v}</option>)}
            </select>
        </div>

        <button onClick={buscarChamada} style={{ padding: '12px 25px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: '0.5' }}>PESQUISAR</button>
      </div>

      {turmaAtiva && (
        <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <textarea 
            value={conteudo} 
            onChange={e => setConteudo(e.target.value)} 
            placeholder="Conteúdo das aulas..."
            style={{ width: '100%', height: '90px', marginBottom: '20px', padding: '15px', borderRadius: '15px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }} 
          />
          
          <div style={{ overflowX: 'auto', borderRadius: '15px', border: '1px solid #f0f0f0', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '20px' }}>ESTUDANTE</th>
                  {Array.from({ length: qtdAulasDoDia }).map((_, i) => (
                    <th key={i} style={thStyle}>{i + 1}ª AULA</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turmaAtiva.alunos.map(n => (
                  <tr key={n}>
                    <td style={{ ...tdStyle, paddingLeft: '20px' }}>{n}</td>
                    {Array.from({ length: qtdAulasDoDia }).map((_, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={!!presencas[n]?.[i]} 
                          onChange={() => alternarPresenca(n, i)} 
                          style={{ width: '24px', height: '24px', accentColor: '#96190c', cursor: 'pointer' }} 
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={salvarChamada} style={{ flex: 2, padding: '18px', backgroundColor: '#96190c', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(150, 25, 12, 0.2)' }}>SALVAR CHAMADA</button>
            <button onClick={resetar} style={{ flex: 1, padding: '18px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}