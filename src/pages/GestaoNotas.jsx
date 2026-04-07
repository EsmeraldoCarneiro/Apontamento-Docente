import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDocs, where } from 'firebase/firestore';

export default function GestaoNotas() {
  const [turmas, setTurmas] = useState([]);
  const [idTurmaSelecionada, setIdTurmaSelecionada] = useState('');
  const [semestreAtivo, setSemestreAtivo] = useState(1);
  const [qtdProvas, setQtdProvas] = useState('');
  const [configProvas, setConfigProvas] = useState([]);
  const [notasAlunos, setNotasAlunos] = useState({}); 
  const [frequencias, setFrequencias] = useState({}); 

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

  useEffect(() => {
    const carregarInformacoes = async () => {
      const user = auth.currentUser;
      if (!idTurmaSelecionada || !user || turmas.length === 0) return;
      
      try {
        const turmaRef = turmas.find(t => t.id === idTurmaSelecionada);
        if (!turmaRef) return;

        const qChamadas = query(collection(db, "historico_chamadas"), where("idTurma", "==", idTurmaSelecionada));
        const snapChamadas = await getDocs(qChamadas);
        
        let faltasContagem = {};
        let totalAulasDadas = 0;
        const listaAlunos = turmaRef.alunos || [];
        listaAlunos.forEach(a => faltasContagem[a] = 0);
        
        snapChamadas.forEach(d => {
          const dadosChamada = d.data();
          const lp = dadosChamada.listaPresenca || {};
          const qtdAulasNoDia = Number(dadosChamada.qtdAulasDoDia) || 1;
          totalAulasDadas += qtdAulasNoDia;

          listaAlunos.forEach(a => {
            const registro = lp[a];
            if (Array.isArray(registro)) {
              // Se for o novo formato Multi-Aula (Array)
              registro.forEach(presenca => { if (presenca !== true) faltasContagem[a]++; });
            } else {
              // Se for o formato antigo (Boolean)
              if (registro !== true) faltasContagem[a] += qtdAulasNoDia;
            }
          });
        });

        // Cálculo da Frequência baseado no Total de Aulas do Semestre
        let cFreq = {};
        listaAlunos.forEach(a => {
          const divisor = totalAulasDadas || 1;
          const perc = Math.round(((divisor - faltasContagem[a]) / divisor) * 100);
          const maxFaltasPermitidas = Math.floor(divisor * 0.25);
          cFreq[a] = { 
            percentual: Math.max(0, perc), 
            faltasAtuais: faltasContagem[a],
            maxFaltasPermitidas
          };
        });
        setFrequencias(cFreq);

        const docId = `${idTurmaSelecionada}_sem${semestreAtivo}`;
        const qNotas = query(collection(db, "lancamento_notas"), where("docId", "==", docId));
        const snapNotas = await getDocs(qNotas);
        if (!snapNotas.empty) {
          const d = snapNotas.docs[0].data();
          setQtdProvas(d.qtdProvas || ''); 
          setConfigProvas(d.configProvas || []); 
          setNotasAlunos(d.notasDetalhadas || {});
        } else {
          setQtdProvas(''); setConfigProvas([]); setNotasAlunos({});
        }
      } catch (e) { console.error("Erro no carregamento:", e); }
    };
    carregarInformacoes();
  }, [idTurmaSelecionada, semestreAtivo, turmas]);

  const obterResultadoCompleto = (nome, alunoData) => {
    const freqData = frequencias[nome] || { percentual: 100, faltasAtuais: 0, maxFaltasPermitidas: 0 };
    const faltasRestantes = Math.max(0, freqData.maxFaltasPermitidas - freqData.faltasAtuais);

    const notasRaw = alunoData.notas || [];
    const pesosRaw = configProvas || [];
    const rec = Number(alunoData.recuperacao) || 0;
    const nProvas = Number(qtdProvas);
    
    const notas = Array.from({ length: nProvas }, (_, i) => Number(notasRaw[i]) || 0);
    const pesos = Array.from({ length: nProvas }, (_, i) => Number(pesosRaw[i]?.peso) || 0);

    // Condição de preenchimento total solicitado
    const todasNotasPreenchidas = notasRaw.length === nProvas && notasRaw.every(n => n !== "" && n !== null);

    let indexMenor = 0;
    let menorImpacto = notas[0] * (pesos[0] || 0);
    notas.forEach((n, i) => { 
      if ((n * (pesos[i] || 0)) < menorImpacto) { menorImpacto = n * (pesos[i] || 0); indexMenor = i; } 
    });

    let somaSemRec = 0;
    notas.forEach((n, i) => somaSemRec += (n * (pesos[i] || 0)));
    const mediaParcial = Number((somaSemRec / 10).toFixed(2));

    let somaComRec = 0;
    notas.forEach((n, i) => {
      if (i === indexMenor && rec > n) somaComRec += (rec * (pesos[i] || 0));
      else somaComRec += (n * (pesos[i] || 0));
    });
    const mediaFinal = Number((somaComRec / 10).toFixed(2));

    let precisa = "---";
    const pesoMenor = pesos[indexMenor];
    if (mediaParcial < 6 && pesoMenor > 0) {
      const v = (60 - (somaSemRec - (notas[indexMenor] * pesoMenor))) / pesoMenor;
      precisa = v > 10 ? "DIFÍCIL" : v.toFixed(2).replace('.', ',');
    }

    let status = "";
    let cor = "";
    const emRecuperacao = todasNotasPreenchidas && mediaParcial < 6;

    if (freqData.percentual < 75) { status = "RETIDO/FALTA"; cor = "#2d3436"; }
    else if (mediaFinal >= 6) { status = "APROVADO"; cor = "#27ae60"; }
    else if (emRecuperacao && rec === 0) { status = "REC. OBRIGATÓRIA"; cor = "#f39c12"; }
    else { status = "REPROVADO"; cor = "#96190c"; }

    return { mediaFinal, precisa, status, freq: freqData.percentual, cor, emRecuperacao, todasNotasPreenchidas, faltasRestantes };
  };

  const salvar = async () => {
    const user = auth.currentUser;
    const soma = configProvas.reduce((acc, p) => acc + Number(p.peso || 0), 0);
    if (qtdProvas > 0 && soma !== 10) return alert("A SOMA DOS PESOS DEVE SER 10!");
    
    const dadosParaSalvar = {};
    Object.keys(notasAlunos).forEach(nome => {
      const calc = obterResultadoCompleto(nome, notasAlunos[nome]);
      dadosParaSalvar[nome] = {
        notas: notasAlunos[nome].notas || [],
        recuperacao: notasAlunos[nome].recuperacao || '',
        mediaFinal: calc.mediaFinal,
        situacao: calc.status
      };
    });

    try {
      const docId = `${idTurmaSelecionada}_sem${semestreAtivo}`;
      await setDoc(doc(db, "lancamento_notas", docId), { 
        docId, userId: user.uid, idTurma: idTurmaSelecionada, semestre: semestreAtivo, 
        qtdProvas: Number(qtdProvas), configProvas, notasDetalhadas: dadosParaSalvar, ultimaAtualizacao: new Date() 
      });
      alert("DADOS SALVOS COM SUCESSO!");
      setIdTurmaSelecionada(''); setQtdProvas(''); setConfigProvas([]); setNotasAlunos({});
    } catch (e) { alert("Erro ao salvar: " + e.message); }
  };

  const thStyle = { padding: '15px 10px', textAlign: 'center', fontSize: '0.65rem', whiteSpace: 'nowrap', fontWeight: '800' };
  const tdStyle = { padding: '12px 8px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap', fontSize: '0.8rem' };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#333', marginBottom: '20px' }}>GESTOR DE NOTAS</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#e0e0e0', padding: '5px', borderRadius: '15px' }}>
        {[1, 2].map(s => (
          <button key={s} onClick={() => setSemestreAtivo(s)} style={{ flex: 1, padding: '12px', fontWeight: 'bold', border: 'none', borderRadius: '12px', backgroundColor: semestreAtivo === s ? '#96190c' : 'transparent', color: semestreAtivo === s ? '#fff' : '#666', cursor: 'pointer' }}>
            {s}º SEMESTRE
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <select value={idTurmaSelecionada} onChange={e => { setNotasAlunos({}); setIdTurmaSelecionada(e.target.value); }} style={{ padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', backgroundColor: '#333', color: '#fff', flex: '1', outline: 'none' }}>
            <option value="">TURMA</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nomeTurma} - {t.materia}</option>)}
          </select>
          <input type="number" placeholder="AVS" value={qtdProvas} onChange={e => { 
            const n = Number(e.target.value); setQtdProvas(e.target.value); setConfigProvas(Array.from({ length: n || 0 }, () => ({ peso: '' }))); 
          }} style={{ padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', backgroundColor: '#333', color: '#fff', width: '80px', textAlign: 'center' }} />
        </div>

        {configProvas.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            {configProvas.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>P{i+1}:</span>
                <input type="number" value={p.peso} onChange={e => {
                  const newConfig = [...configProvas]; newConfig[i].peso = e.target.value; setConfigProvas(newConfig);
                }} style={{ width: '45px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {idTurmaSelecionada && (
        <div style={{ width: '100%', overflowX: 'auto', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: '#fff', marginBottom: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1050px' }}>
            <thead style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '20px' }}>ALUNO</th>
                <th style={thStyle}>FREQ %</th>
                <th style={{ ...thStyle, backgroundColor: '#333' }}>FALTAS</th>
                {configProvas.map((_, i) => <th key={i} style={{ ...thStyle, backgroundColor: '#222' }}>AV{i+1}</th>)}
                <th style={{ ...thStyle, backgroundColor: '#96190c' }}>REC</th>
                <th style={{ ...thStyle, backgroundColor: '#222' }}>PRECISA</th>
                <th style={{ ...thStyle, backgroundColor: '#96190c' }}>MÉDIA</th>
                <th style={thStyle}>SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {turmas.find(t => t.id === idTurmaSelecionada)?.alunos.map(nome => {
                const d = notasAlunos[nome] || { notas: [], recuperacao: '' };
                const res = obterResultadoCompleto(nome, d);
                return (
                  <tr key={nome}>
                    <td style={{ ...tdStyle, fontWeight: '800', paddingLeft: '20px' }}>{nome}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{res.freq}%</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{res.faltasRestantes}</td>
                    {configProvas.map((_, i) => (
                      <td key={i} style={{ ...tdStyle, textAlign: 'center' }}>
                        <input type="number" value={d.notas[i] || ''} onChange={e => {
                          const n = [...d.notas]; n[i] = e.target.value;
                          setNotasAlunos(p => ({ ...p, [nome]: { ...d, notas: n } }));
                        }} style={{ width: '55px', padding: '10px 0', backgroundColor: '#333', color: '#fff', textAlign: 'center', border: 'none', fontWeight: 'bold', borderRadius: '8px', outline: 'none' }} />
                      </td>
                    ))}

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {res.emRecuperacao ? (
                        <input type="number" value={d.recuperacao || ''} 
                          onChange={e => setNotasAlunos(p => ({ ...p, [nome]: { ...d, recuperacao: e.target.value } }))} 
                          style={{ width: '55px', padding: '10px 0', textAlign: 'center', fontWeight: 'bold', borderRadius: '8px', backgroundColor: '#96190c', color: '#fff', border: 'none' }} 
                        />
                      ) : <span style={{ color: '#eee' }}>--</span>}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#96190c' }}>{res.precisa}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '900' }}>{res.mediaFinal.toFixed(2).replace('.',',')}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {res.todasNotasPreenchidas ? (
                        <span style={{ backgroundColor: res.cor, color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold' }}>{res.status}</span>
                      ) : <span style={{ color: '#ccc', fontSize: '0.6rem' }}>PENDENTE</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={salvar} style={{ width: '100%', padding: '20px', backgroundColor: '#96190c', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>SALVAR E FINALIZAR</button>
        </div>
      )}
    </div>
  );
}