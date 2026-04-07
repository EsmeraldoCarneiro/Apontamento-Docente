import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, query, orderBy, doc, 
  setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, where 
} from 'firebase/firestore';

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

  const limparTelaTotal = () => {
    setIdEditando(null);
    setIdSelecionado('');
    setNomeTurma('');
    setMateria('');
    setDiasLetivos('');
    setTurno('Manhã');
    setNomeAluno('');
  };

  const salvarTurma = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!nomeTurma || !user) return alert("Preencha o nome da Turma!");
    
    try {
      if (idEditando) {
        await updateDoc(doc(db, "turmas", idEditando), { 
          nomeTurma, materia, turno, diasLetivos: Number(diasLetivos) 
        });
      } else {
        const customId = `${user.uid}_${nomeTurma}-${materia}-${turno}`.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, "turmas", customId), { 
          userId: user.uid, 
          nomeTurma, 
          materia, 
          turno, 
          diasLetivos: Number(diasLetivos), 
          alunos: [] 
        });
      }
      alert("ESTRUTURA SALVA COM SUCESSO!");
      limparTelaTotal();
    } catch (e) { console.error("Erro ao salvar turma:", e); }
  };

  const adicionarAluno = async (e) => {
    e.preventDefault();
    if (!nomeAluno || !idSelecionado) return alert("Selecione uma turma primeiro!");
    try {
      await updateDoc(doc(db, "turmas", idSelecionado), { 
        alunos: arrayUnion(nomeAluno.trim()) 
      });
      setNomeAluno('');
    } catch (e) { console.error(e); }
  };

  // ESTILOS PADRONIZADOS
  const inputModerno = { padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#333', color: '#fff', fontWeight: 'bold', outline: 'none' };
  const cardStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px' };
  const btnRedModern = { padding: '15px', backgroundColor: '#96190c', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 10px rgba(150, 25, 12, 0.2)' };
  const btnBlackModern = { backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '10px 15px' };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#333', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Gerenciamento de Turmas
      </h2>
      
      <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '20px' }}>
        
        {/* COLUNA ESQUERDA: CADASTRO E LISTA DE TURMAS */}
        <section style={{ flex: '1' }}>
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center' }}>
              {idEditando ? 'EDITAR ESTRUTURA' : 'NOVA ESTRUTURA'}
            </h4>
            <form onSubmit={salvarTurma} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="NOME DA TURMA" value={nomeTurma} onChange={e => setNomeTurma(e.target.value)} style={inputModerno} />
              <input type="text" placeholder="MATÉRIA" value={materia} onChange={e => setMateria(e.target.value)} style={inputModerno} />
              <input type="number" placeholder="DIAS LETIVOS" value={diasLetivos} onChange={e => setDiasLetivos(e.target.value)} style={inputModerno} />
              <select value={turno} onChange={e => setTurno(e.target.value)} style={inputModerno}>
                <option value="Manhã">MANHÃ</option>
                <option value="Tarde">TARDE</option>
                <option value="Noite">NOITE</option>
              </select>
              <button type="submit" style={btnRedModern}>
                {idEditando ? '✓ ATUALIZAR DADOS' : '+ SALVAR NOVO CADASTRO'}
              </button>
              {idEditando && <button type="button" onClick={limparTelaTotal} style={{...btnBlackModern, backgroundColor: '#666', marginTop: '5px'}}>CANCELAR EDIÇÃO</button>}
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {turmas.map(t => (
              <div 
                key={t.id} 
                onClick={() => setIdSelecionado(t.id)} 
                style={{ 
                  padding: '15px', borderRadius: '15px', backgroundColor: '#fff', cursor: 'pointer',
                  boxShadow: idSelecionado === t.id ? '0 0 0 3px #96190c' : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: '0.3s'
                }}
              >
                <div style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '0.8rem', color: '#333' }}>
                  {t.nomeTurma} - {t.materia}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', color: '#96190c', fontWeight: '800', marginTop: '5px' }}>
                  <span>{t.turno?.toUpperCase()}</span>
                  <span>|</span>
                  <span>{t.diasLetivos || 0} DIAS</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIdEditando(t.id); 
                      setNomeTurma(t.nomeTurma); 
                      setMateria(t.materia); 
                      setTurno(t.turno); 
                      setDiasLetivos(t.diasLetivos);
                    }} 
                    style={{ background: '#eee', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >EDITAR</button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if(window.confirm("Deseja excluir esta turma?")) deleteDoc(doc(db, "turmas", t.id)); 
                    }} 
                    style={{ color: '#96190c', background: 'none', border: 'none', fontWeight: '900', cursor: 'pointer', marginLeft: 'auto' }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA DIREITA: GESTÃO DE ALUNOS */}
        <section style={{ flex: '1.5' }}>
          {idSelecionado ? (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 20px 0', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center' }}>
                ALUNOS: {turmas.find(t => t.id === idSelecionado)?.nomeTurma}
              </h4>
              <form onSubmit={adicionarAluno} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="NOME COMPLETO DO ALUNO" 
                  value={nomeAluno} 
                  onChange={e => setNomeAluno(e.target.value)} 
                  style={{ ...inputModerno, flex: 1 }} 
                />
                <button type="submit" style={{ ...btnBlackModern, width: '50px' }}>+</button>
              </form>
              
              <div style={{ borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.7rem' }}>NOME DO ESTUDANTE</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.7rem' }}>AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.find(t => t.id === idSelecionado)?.alunos.map((aluno, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '12px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', color: '#444' }}>{aluno}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <button 
                            onClick={() => updateDoc(doc(db, "turmas", idSelecionado), { alunos: arrayRemove(aluno) })} 
                            style={{ color: '#96190c', border: '1px solid #fdeaea', backgroundColor: '#fdeaea', borderRadius: '8px', fontWeight: 'bold', padding: '5px 12px', fontSize: '0.6rem', cursor: 'pointer' }}
                          >REMOVER</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={limparTelaTotal} style={{ ...btnBlackModern, width: '100%', marginTop: '20px', padding: '18px', borderRadius: '15px', fontSize: '0.9rem' }}>
                CONCLUIR E LIMPAR TELA
              </button>
            </div>
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '80px 20px', color: '#bbb', fontWeight: 'bold', border: '2px dashed #eee', boxShadow: 'none', backgroundColor: 'transparent' }}>
              SELECIONE UMA TURMA PARA GERENCIAR OS ALUNOS.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}