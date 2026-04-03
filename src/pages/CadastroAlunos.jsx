import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';

export default function CadastroAlunos() {
  const [turmas, setTurmas] = useState([]);
  const [idSelecionado, setIdSelecionado] = useState('');
  const [nomeTurma, setNomeTurma] = useState(''); 
  const [materia, setMateria] = useState('');   
  const [turno, setTurno] = useState('Manhã');   
  const [diasLetivos, setDiasLetivos] = useState(''); 
  const [nomeAluno, setNomeAluno] = useState('');
  const [idEditando, setIdEditando] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "turmas"), where("userId", "==", user.uid), orderBy("nomeTurma", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = [];
      snap.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
      setTurmas(lista);
    });
    return () => unsubscribe();
  }, []);

  const limparFormulario = () => {
    setIdEditando(null); setNomeTurma(''); setMateria(''); setDiasLetivos(''); setTurno('Manhã');
  };

  const salvarTurma = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!nomeTurma || !materia || !diasLetivos || !user) return alert("Preencha todos os campos!");
    try {
      if (idEditando) {
        await updateDoc(doc(db, "turmas", idEditando), { nomeTurma, materia, turno, diasLetivos: Number(diasLetivos) });
      } else {
        const customId = `${user.uid}_${nomeTurma}-${materia}-${turno}`.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, "turmas", customId), { userId: user.uid, nomeTurma, materia, turno, diasLetivos: Number(diasLetivos), alunos: [], dataCriacao: new Date() });
      }
      limparFormulario();
    } catch (error) { console.error(error); }
  };

  const adicionarAluno = async (e) => {
    e.preventDefault();
    if (!nomeAluno || !idSelecionado) return alert("Selecione a turma!");
    try {
      await updateDoc(doc(db, "turmas", idSelecionado), { alunos: arrayUnion(nomeAluno.trim()) });
      setNomeAluno('');
    } catch (error) { console.error(error); }
  };

  return (
    <div style={{ padding: '15px' }}>
      <h2 style={{ borderLeft: '8px solid #96190c', paddingLeft: '15px', fontWeight: '900', textAlign: 'center' }}>GERENCIAMENTO DE TURMAS</h2>
      
      <div className="grid-layout">
        <section className="col-sidebar" style={sectionStyle}>
          <h4 style={titleStyle}>{idEditando ? 'EDITAR ESTRUTURA' : 'NOVA ESTRUTURA'}</h4>
          <form onSubmit={salvarTurma} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="TURMA" value={nomeTurma} onChange={e => setNomeTurma(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="MATÉRIA" value={materia} onChange={e => setMateria(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="DIAS LETIVOS" value={diasLetivos} onChange={e => setDiasLetivos(e.target.value)} style={inputStyle} />
            <select value={turno} onChange={e => setTurno(e.target.value)} style={inputStyle}>
              <option value="Manhã">MANHÃ</option><option value="Tarde">TARDE</option><option value="Noite">NOITE</option>
            </select>
            <button type="submit" style={btnRedStyle}>{idEditando ? '✓ ATUALIZAR' : '+ CADASTRAR'}</button>
            {idEditando && <button type="button" onClick={limparFormulario} style={btnCancelStyle}>CANCELAR</button>}
          </form>

          <div style={{ marginTop: '20px' }}>
            {turmas.map(t => (
              <div key={t.id} onClick={() => setIdSelecionado(t.id)} style={{ ...itemStyle, borderLeft: idSelecionado === t.id ? '5px solid #96190c' : '1px solid #000' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ fontWeight: 'bold' }}>{t.nomeTurma} - {t.materia}</div>
                  <small style={{ color: '#96190c', fontWeight: 'bold' }}>{t.turno.toUpperCase()} | Dias: {t.diasLetivos}</small>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', borderTop: '1px solid #eee', paddingTop: '10px', justifyContent: 'space-between' }}>
                  <button onClick={(e) => { e.stopPropagation(); setIdEditando(t.id); setNomeTurma(t.nomeTurma); setMateria(t.materia); setTurno(t.turno); setDiasLetivos(t.diasLetivos); }} style={btnEditSmall}>EDITAR</button>
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm("EXCLUIR?")) deleteDoc(doc(db, "turmas", t.id)); }} style={{ color: '#96190c', background: 'none', border: 'none', fontWeight: '900', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="col-main" style={sectionStyle}>
          {idSelecionado ? (
            <>
              <h4 style={titleStyle}>ALUNOS: {turmas.find(t => t.id === idSelecionado)?.nomeTurma}</h4>
              <form onSubmit={adicionarAluno} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" placeholder="NOME DO ALUNO" value={nomeAluno} onChange={e => setNomeAluno(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button type="submit" style={btnBlackStyle}>+</button>
              </form>
              <div className="table-container">
                <table>
                  <thead style={{ backgroundColor: '#000', color: '#fff' }}>
                    <tr><th style={thStyle}>ESTUDANTE</th><th style={thStyle}>AÇÕES</th></tr>
                  </thead>
                  <tbody>
                    {turmas.find(t => t.id === idSelecionado)?.alunos.map((aluno, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px', fontWeight: 'bold' }}>{aluno}</td><td style={{ textAlign: 'center' }}><button onClick={() => updateDoc(doc(db, "turmas", idSelecionado), { alunos: arrayRemove(aluno) })} style={{ color: '#96190c', border: 'none', background: 'none', fontWeight: 'bold' }}>REMOVER</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p style={{ textAlign: 'center', marginTop: '50px', fontWeight: 'bold', color: '#ccc' }}>SELECIONE UMA TURMA</p>}
        </section>
      </div>
    </div>
  );
}

const sectionStyle = { backgroundColor: '#fff', padding: '20px', border: '2px solid #000' };
const titleStyle = { margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center' };
const inputStyle = { padding: '12px', border: '1px solid #000', fontWeight: 'bold', outline: 'none' };
const btnRedStyle = { padding: '15px', backgroundColor: '#96190c', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const btnBlackStyle = { padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const btnCancelStyle = { padding: '10px', backgroundColor: '#000', color: '#96190c', border: '1px solid #000', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' };
const btnEditSmall = { backgroundColor: '#000', color: '#96190c', border: 'none', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' };
const itemStyle = { padding: '15px', marginBottom: '10px', border: '1px solid #000', display: 'flex', flexDirection: 'column', cursor: 'pointer' };
const thStyle = { padding: '12px', textAlign: 'left' };