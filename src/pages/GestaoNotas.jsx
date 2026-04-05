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
        const listaAlunos = turmaRef.alunos || [];
        listaAlunos.forEach(a => faltasContagem[a] = 0);
        
        snapChamadas.forEach(d => {
          const lp = d.data().listaPresenca || {};
          listaAlunos.forEach(a => { if (lp[a] !== true) faltasContagem[a]++; });
        });

        const totalDias = Number(turmaRef.diasLetivos) || 1;
        let cFreq = {};
        listaAlunos.forEach(a => {
          const perc = Math.round(((totalDias - faltasContagem[a]) / totalDias) * 100);
          cFreq[a] = { percentual: Math.max(0, perc), faltasAtuais: faltasContagem[a] };
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
      } catch (e) { console.error(e); }
    };
    carregarInformacoes();
  }, [idTurmaSelecionada, semestreAtivo, turmas]);

  const limparTela = () => {
    setIdTurmaSelecionada('');
    setQtdProvas('');
    setConfigProvas([]);
    setNotasAlunos({});
  };

  const obterResultadoCompleto = (nome, alunoData) => {
    const turmaRef = turmas.find(t => t.id === idTurmaSelecionada);
    const totalDias = Number(turmaRef?.diasLetivos) || 0;
    const freqData = frequencias[nome] || { percentual: 100, faltasAtuais: 0 };
    
    const maxFaltasPermitidas = Math.floor(totalDias * 0.25);
    const faltasRestantes = Math.max(0, maxFaltasPermitidas - freqData.faltasAtuais);

    const notasRaw = alunoData.notas || [];
    const pesosRaw = configProvas || [];
    const rec = Number(alunoData.recuperacao) || 0;
    const nProvas = Number(qtdProvas);
    
    const notas = Array.from({ length: nProvas }, (_, i) => Number(notasRaw[i]) || 0);
    const pesos = Array.from({ length: nProvas }, (_, i) => Number(pesosRaw[i]?.peso) || 0);

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

    let status = "";
    let cor = "";
    const emRecuperacao = mediaParcial < 6;

    if (freqData.percentual < 75) { status = "RETIDO/FALTA"; cor = "#000000"; }
    else if (mediaFinal >= 6) { status = "APROVADO"; cor = "#27ae60"; }
    else if (emRecuperacao && rec === 0) { status = "REC. OBRIGATÓRIA"; cor = "#f39c12"; }
    else { status = "REPROVADO"; cor = "#96190c"; }

    return { mediaFinal, status, freq: freqData.percentual, cor, emRecuperacao, faltasRestantes };
  };

  const salvar = async () => {
    const soma = configProvas.reduce((a, b) => a + Number(b.peso || 0), 0);
    if (soma !== 10 && qtdProvas > 0) return alert("A SOMA DOS PESOS DEVE SER 10!");
    
    const dadosParaSalvar = { ...notasAlunos };
    Object.keys(dadosParaSalvar).forEach(nome => {
      const calc = obterResultadoCompleto(nome, dadosParaSalvar[nome]);
      dadosParaSalvar[nome].mediaFinal = calc.mediaFinal;
      dadosParaSalvar[nome].situacao = calc.status;
    });

    try {
      const docId = `${idTurmaSelecionada}_sem${semestreAtivo}`;
      await setDoc(doc(db, "lancamento_notas", docId), { 
        docId, idTurma: idTurmaSelecionada, semestre: semestreAtivo, 
        qtdProvas: Number(qtdProvas), configProvas, notasDetalhadas: dadosParaSalvar, 
        ultimaAtualizacao: new Date() 
      });
      alert("DADOS SALVOS!");
      limparTela();
    } catch (e) { console.error(e); }
  };

  const somaAtualPesos = configProvas.reduce((acc, p) => acc + Number(p.peso || 0), 0);

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '900' }}>GESTOR DE NOTAS</h2>
      
      <div style={{ display: 'flex', border: '2px solid #000', marginBottom: '15px' }}>
        {[1, 2].map(s => (
          <button key={s} onClick={() => setSemestreAtivo(s)} style={{ flex: 1, padding: '15px', fontWeight: '900', border: 'none', backgroundColor: semestreAtivo === s ? '#96190c' : '#000', color: '#fff' }}>
            {s}º SEM
          </button>
        ))}
      </div>

      <div style={{ padding: '15px', border: '2px solid #000', backgroundColor: '#fff', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select value={idTurmaSelecionada} onChange={e => { setQtdProvas(''); setConfigProvas([]); setIdTurmaSelecionada(e.target.value); }} style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold' }}>
            <option value="">TURMA</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nomeTurma} - {t.materia} ({t.turno?.toUpperCase()})</option>)}
          </select>
          <input type="number" placeholder="AVS" value={qtdProvas} onChange={e => {
            const n = Number(e.target.value);
            setQtdProvas(e.target.value);
            setConfigProvas(Array.from({ length: n || 0 }, () => ({ peso: '' })));
          }} style={{ width: '70px', padding: '12px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold', textAlign: 'center' }} />
        </div>

        {/* RESTAUREI O CAMPO DE PESOS AQUI EMBAIXO */}
        {configProvas.length > 0 && (
          <div style={{ marginTop: '15px', border: '2px solid #96190c', padding: '10px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.7rem', fontWeight: 'bold', color: '#96190c' }}>PESOS (SOMA 10):</p>
            <div style={{ display: 'flex', overflowX: 'auto', gap: '5px' }}>
              {configProvas.map((cfg, i) => (
                <div key={i} style={{ flex: '1', minWidth: '70px', border: '1px solid #000', backgroundColor: '#f9f9f9' }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', textAlign: 'center', padding: '3px', fontWeight: 'bold', backgroundColor: '#000', color: '#fff' }}>P{i+1}</label>
                  <input type="number" value={cfg.peso} onChange={e => { 
                    const nc = [...configProvas]; nc[i].peso = e.target.value; setConfigProvas(nc); 
                  }} style={{ width: '100%', border: 'none', textAlign: 'center', padding: '10px', fontWeight: 'bold', outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: '900', fontSize: '0.8rem', color: somaAtualPesos === 10 ? '#27ae60' : '#96190c' }}>
              SOMA: {somaAtualPesos} / 10
            </div>
          </div>
        )}
      </div>

      {idTurmaSelecionada && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {turmas.find(t => t.id === idTurmaSelecionada)?.alunos.map(nome => {
            const d = notasAlunos[nome] || { notas: [], recuperacao: '' };
            const res = obterResultadoCompleto(nome, d);
            return (
              <div key={nome} style={{ border: '2px solid #000', backgroundColor: '#fff', padding: '15px' }}>
                <div style={{ borderBottom: '2px solid #eee', marginBottom: '10px', paddingBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '900', fontSize: '0.9rem', textTransform: 'uppercase' }}>{nome}</span>
                  <span style={{ backgroundColor: res.cor, color: '#fff', padding: '3px 8px', fontSize: '0.65rem', fontWeight: 'bold' }}>{res.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                  <div style={cardInfoStyle}><label>FREQ</label><span>{res.freq}%</span></div>
                  <div style={cardInfoStyle}><label>PODE FALTAR</label><span style={{ color: res.faltasRestantes <= 2 ? 'red' : 'inherit' }}>{res.faltasRestantes}</span></div>
                  <div style={cardInfoStyle}><label>MÉDIA</label><span style={{ fontWeight: '900' }}>{res.mediaFinal.toFixed(2)}</span></div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {configProvas.map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>AV{i+1}</label>
                      <input type="number" value={d.notas[i] || ''} onChange={e => {
                        const n = [...d.notas]; n[i] = e.target.value;
                        setNotasAlunos(p => ({ ...p, [nome]: { ...d, notas: n } }));
                      }} style={notaInputStyle} />
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#96190c' }}>REC</label>
                    <input type="number" value={d.recuperacao || ''} disabled={!res.emRecuperacao} onChange={e => setNotasAlunos(p => ({ ...p, [nome]: { ...d, recuperacao: e.target.value } }))} 
                      style={{ ...notaInputStyle, backgroundColor: res.emRecuperacao ? '#333' : '#eee', border: res.emRecuperacao ? '2px solid #96190c' : 'none' }} />
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={salvar} style={{ padding: '20px', backgroundColor: '#96190c', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }}>
            SALVAR TUDO E LIMPAR
          </button>
        </div>
      )}
    </div>
  );
}

const cardInfoStyle = { display: 'flex', flexDirection: 'column', backgroundColor: '#f4f4f4', padding: '8px 5px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #ddd' };
const notaInputStyle = { width: '55px', padding: '10px 2px', backgroundColor: '#333', color: '#fff', textAlign: 'center', fontWeight: 'bold', border: 'none', outline: 'none' };