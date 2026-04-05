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

  // 1. Monitorar turmas em tempo real
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

  // 2. Limpar todos os campos da tela
  const limparTelaTotal = () => {
    setIdEditando(null);
    setIdSelecionado('');
    setNomeTurma('');
    setMateria('');
    setDiasLetivos('');
    setTurno('Manhã');
    setNomeAluno('');
  };

  // 3. Salvar Turma com ID Único (Nome + Matéria + Turno)
  const salvarTurma = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!nomeTurma || !user) return alert("Preencha o nome da Turma!");
    
    try {
      if (idEditando) {
        // Atualiza a turma existente
        await updateDoc(doc(db, "turmas", idEditando), { 
          nomeTurma, materia, turno, diasLetivos: Number(diasLetivos) 
        });
      } else {
        // GERAÇÃO DO ID COMPLETO: Inclui o turno para evitar duplicidade no Firestore
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

  // 4. Adicionar Aluno
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

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '900', borderLeft: '8px solid #96190c', paddingLeft: '10px', textTransform: 'uppercase' }}>
        Gerenciamento de Turmas
      </h2>
      
      <div className="grid-layout">
        {/* FORMULÁRIO DE CADASTRO */}
        <section className="col-sidebar" style={sectionStyle}>
          <h4 style={titleStyle}>{idEditando ? 'EDITAR ESTRUTURA' : 'NOVA ESTRUTURA'}</h4>
          <form onSubmit={salvarTurma} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="NOME DA TURMA (Ex: 2º Ano A)" value={nomeTurma} onChange={e => setNomeTurma(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="MATÉRIA (Ex: Programação)" value={materia} onChange={e => setMateria(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="DIAS LETIVOS" value={diasLetivos} onChange={e => setDiasLetivos(e.target.value)} style={inputStyle} />
            <select value={turno} onChange={e => setTurno(e.target.value)} style={inputStyle}>
              <option value="Manhã">MANHÃ</option>
              <option value="Tarde">TARDE</option>
              <option value="Noite">NOITE</option>
            </select>
            <button type="submit" style={btnRedStyle}>
              {idEditando ? '✓ ATUALIZAR DADOS' : '+ SALVAR NOVO CADASTRO'}
            </button>
            {idEditando && <button type="button" onClick={limparTelaTotal} style={{...btnBlackStyle, backgroundColor: '#444'}}>CANCELAR EDIÇÃO</button>}
          </form>

          {/* LISTAGEM DE TURMAS COM DETALHES VISÍVEIS */}
          <div style={{ marginTop: '20px' }}>
            {turmas.map(t => (
              <div 
                key={t.id} 
                onClick={() => setIdSelecionado(t.id)} 
                style={{ 
                  ...itemStyle, 
                  borderLeft: idSelecionado === t.id ? '5px solid #96190c' : '1px solid #000' 
                }}
              >
                <div style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                  {t.nomeTurma} - {t.materia}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#96190c', fontWeight: '900', marginTop: '3px' }}>
                  <span>TURNO: {t.turno?.toUpperCase()}</span>
                  <span>|</span>
                  <span>{t.diasLetivos || 0} DIAS LETIVOS</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIdEditando(t.id); 
                      setNomeTurma(t.nomeTurma); 
                      setMateria(t.materia); 
                      setTurno(t.turno); 
                      setDiasLetivos(t.diasLetivos);
                    }} 
                    style={btnEditSmall}
                  >EDITAR</button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if(window.confirm("Deseja excluir esta turma?")) deleteDoc(doc(db, "turmas", t.id)); 
                    }} 
                    style={{ color: '#96190c', background: 'none', border: 'none', fontWeight: '900', cursor: 'pointer' }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GESTÃO DE ALUNOS DA TURMA SELECIONADA */}
        <section className="col-main" style={sectionStyle}>
          {idSelecionado ? (
            <>
              <h4 style={titleStyle}>LISTA DE ALUNOS: {turmas.find(t => t.id === idSelecionado)?.nomeTurma}</h4>
              <form onSubmit={adicionarAluno} className="form-group-responsive" style={{ marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="NOME DO ALUNO" 
                  value={nomeAluno} 
                  onChange={e => setNomeAluno(e.target.value)} 
                  className="input-flex" 
                  style={inputStyle} 
                />
                <button type="submit" style={{ ...btnBlackStyle, padding: '12px 20px' }}>+</button>
              </form>
              
              <div className="table-responsive-alt">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#000', color: '#fff' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>ESTUDANTE</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.find(t => t.id === idSelecionado)?.alunos.map((aluno, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>{aluno}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => updateDoc(doc(db, "turmas", idSelecionado), { alunos: arrayRemove(aluno) })} 
                            className="btn-acao-mobile" 
                            style={{ color: '#96190c', border: '1px solid #96190c', background: 'none', fontWeight: 'bold', padding: '5px 10px', cursor: 'pointer' }}
                          >REMOVER</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={limparTelaTotal} style={{ ...btnBlackStyle, width: '100%', marginTop: '20px', padding: '15px' }}>
                CONCLUIR E LIMPAR TELA
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#bbb', fontWeight: 'bold' }}>
              SELECIONE UMA ESTRUTURA PARA GERENCIAR ESTUDANTES.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Estilos padronizados
const sectionStyle = { backgroundColor: '#fff', padding: '15px', border: '2px solid #000' };
const titleStyle = { margin: '0 0 15px 0', fontSize: '0.85rem', fontWeight: '900', textAlign: 'center', color: '#000' };
const inputStyle = { padding: '12px', border: '1px solid #000', fontWeight: 'bold', outline: 'none', fontSize: '1rem' };
const btnRedStyle = { padding: '15px', backgroundColor: '#96190c', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const btnBlackStyle = { backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const itemStyle = { padding: '15px', marginBottom: '10px', border: '1px solid #000', cursor: 'pointer', display: 'flex', flexDirection: 'column' };
const btnEditSmall = { backgroundColor: '#000', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' };