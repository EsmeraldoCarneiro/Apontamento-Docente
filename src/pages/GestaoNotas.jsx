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
        const qChamadas = query(collection(db, "historico_chamadas"), where("idTurma", "==", idTurmaSelecionada));
        const snapChamadas = await getDocs(qChamadas);
        let faltas = {};
        turmaRef.alunos.forEach(a => faltas[a] = 0);
        snapChamadas.forEach(d => {
          const lp = d.data().listaPresenca || {};
          turmaRef.alunos.forEach(a => { if (lp[a] !== true) faltas[a]++; });
        });
        const totalDias = Number(turmaRef.diasLetivos) || 1;
        let cFreq = {};
        turmaRef.alunos.forEach(a => cFreq[a] = Math.max(0, Math.round(((totalDias - faltas[a]) / totalDias) * 100)));
        setFrequencias(cFreq);

        const docId = `${idTurmaSelecionada}_sem${semestreAtivo}`;
        const qNotas = query(collection(db, "lancamento_notas"), where("docId", "==", docId));
        const snapNotas = await getDocs(qNotas);
        if (!snapNotas.empty) {
          const d = snapNotas.docs[0].data();
          setQtdProvas(d.qtdProvas || ''); setConfigProvas(d.configProvas || []); setNotasAlunos(d.notasDetalhadas || {});
        } else { setQtdProvas(''); setConfigProvas([]); setNotasAlunos({}); }
      } catch (e) { console.error(e); }
    };
    carregarInformacoes();
  }, [idTurmaSelecionada, semestreAtivo, turmas]);

  const calcularResultado = (nome, alunoData) => {
    const freq = frequencias[nome] ?? 100;
    const notasRaw = alunoData.notas || [];
    const pesosRaw = configProvas || [];
    const rec = Number(alunoData.recuperacao) || 0;
    const notas = Array.from({ length: Number(qtdProvas) }, (_, i) => Number(notasRaw[i]) || 0);
    const pesos = Array.from({ length: Number(qtdProvas) }, (_, i) => Number(pesosRaw[i]?.peso) || 0);

    let indexMenor = 0;
    let menorImpacto = notas[0] * pesos[0];
    notas.forEach((n, i) => { if ((n * pesos[i]) < menorImpacto) { menorImpacto = n * pesos[i]; indexMenor = i; } });

    let somaSemRec = 0;
    notas.forEach((n, i) => somaSemRec += (n * pesos[i]));
    const mediaAtual = somaSemRec / 10;

    let somaComRec = 0;
    notas.forEach((n, i) => {
      if (i === indexMenor && rec > n) somaComRec += (rec * pesos[i]);
      else somaComRec += (n * pesos[i]);
    });
    const mediaFinal = somaComRec / 10;

    let precisa = "---";
    const pesoMenor = pesos[indexMenor];
    if (mediaAtual < 6 && pesoMenor > 0) {
      const v = (60 - (somaSemRec - (notas[indexMenor] * pesoMenor))) / pesoMenor;
      precisa = v > 10 ? "DIFÍCIL" : v.toFixed(2).replace('.', ',');
    }

    const status = Number(mediaFinal.toFixed(2)) >= 6 && freq >= 75 ? "APROVADO" : freq < 75 ? "RETIDO/FALTA" : "REC. OBRIGATÓRIA";
    const cor = status === "APROVADO" ? "#27ae60" : status === "RETIDO/FALTA" ? "#000" : "#f39c12";

    return { media: mediaFinal.toFixed(2).replace('.', ','), precisa, status, freq, cor };
  };

  const salvar = async () => {
    const soma = configProvas.reduce((a, b) => a + Number(b.peso || 0), 0);
    if (soma !== 10) return alert("A soma dos pesos deve ser 10!");
    try {
      const docId = `${idTurmaSelecionada}_sem${semestreAtivo}`;
      await setDoc(doc(db, "lancamento_notas", docId), { docId, idTurma: idTurmaSelecionada, semestre: semestreAtivo, qtdProvas: Number(qtdProvas), configProvas, notasDetalhadas: notasAlunos, ultimaAtualizacao: new Date() });
      alert("SALVO!"); setIdTurmaSelecionada('');
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: '15px' }}>
      <h2 style={{ textAlign: 'center', fontWeight: '900' }}>GESTOR DE NOTAS</h2>
      <div style={{ display: 'flex', border: '2px solid #000', marginBottom: '20px' }}>
        {[1, 2].map(s => <button key={s} onClick={() => setSemestreAtivo(s)} style={{ flex: 1, padding: '15px', fontWeight: '900', border: 'none', backgroundColor: semestreAtivo === s ? '#96190c' : '#000', color: '#fff', cursor: 'pointer' }}>{s}º SEMESTRE</button>)}
      </div>

      <div style={{ padding: '20px', border: '2px solid #000', backgroundColor: '#fff', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <select value={idTurmaSelecionada} onChange={e => setIdTurmaSelecionada(e.target.value)} style={{ ...inputStyle, flex: '2 1 200px' }}>
            <option value="">SELECIONE TURMA</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nomeTurma} - {t.materia}</option>)}
          </select>
          <input type="number" placeholder="AVS" value={qtdProvas} onChange={e => { setQtdProvas(e.target.value); setConfigProvas(Array.from({ length: Number(e.target.value) || 0 }, () => ({ peso: '' }))); }} style={{ ...inputStyle, flex: '1 1 100px' }} />
        </div>

        {configProvas.length > 0 && (
          <div style={{ marginTop: '15px', border: '1px dashed #000', padding: '10px' }}>
            <div style={{ display: 'flex', overflowX: 'auto', border: '1px solid #000' }}>
              {configProvas.map((cfg, i) => (
                <div key={i} style={{ flex: 1, minWidth: '80px', borderRight: '1px solid #000' }}>
                  <label style={{ display: 'block', fontSize: '0.6rem', textAlign: 'center', padding: '5px' }}>P{i+1}</label>
                  <input type="number" value={cfg.peso} onChange={e => { const nc = [...configProvas]; nc[i].peso = e.target.value; setConfigProvas(nc); }} style={{ width: '100%', border: 'none', borderTop: '1px solid #000', textAlign: 'center', padding: '10px', fontWeight: 'bold' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {idTurmaSelecionada && (
        <div className="table-container">
          <table>
            <thead style={{ backgroundColor: '#000', color: '#fff' }}>
              <tr><th style={thStyle}>ALUNO</th>{configProvas.map((_, i) => <th key={i}>AV{i+1}</th>)}<th style={{ backgroundColor: '#96190c' }}>REC</th><th style={{ backgroundColor: '#222' }}>PRECISA</th><th style={{ backgroundColor: '#96190c' }}>MÉDIA</th><th>SITUAÇÃO</th></tr>
            </thead>
            <tbody>
              {turmas.find(t => t.id === idTurmaSelecionada)?.alunos.map(nome => {
                const d = notasAlunos[nome] || { notas: [], recuperacao: '' }; const res = calcularResultado(nome, d);
                return (
                  <tr key={nome} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', fontWeight: '900' }}>{nome}</td>
                    {configProvas.map((_, i) => <td key={i} style={{ textAlign: 'center' }}><input type="number" value={d.notas[i] || ''} onChange={e => { const n = [...d.notas]; n[i] = e.target.value; setNotasAlunos(p => ({ ...p, [nome]: { ...d, notas: n } })); }} style={notaInput} /></td>)}
                    <td style={{ textAlign: 'center' }}><input type="number" value={d.recuperacao || ''} onChange={e => setNotasAlunos(p => ({ ...p, [nome]: { ...d, recuperacao: e.target.value } }))} style={{ ...notaInput, border: '2px solid #96190c' }} /></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#96190c' }}>{res.precisa}</td>
                    <td style={{ textAlign: 'center', fontWeight: '900' }}>{res.media}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ backgroundColor: res.cor, color: '#fff', padding: '5px 10px', fontSize: '0.7rem', fontWeight: 'bold' }}>{res.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={salvar} style={btnSave}>SALVAR SEMESTRE {semestreAtivo}</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: '12px', border: '1px solid #000', fontWeight: 'bold', backgroundColor: '#333', color: '#fff', outline: 'none' };
const btnSave = { width: '100%', padding: '25px', backgroundColor: '#96190c', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' };
const thStyle = { padding: '15px', textAlign: 'center', fontSize: '0.7rem' };
const notaInput = { width: '65px', padding: '10px 5px', backgroundColor: '#333', color: '#fff', textAlign: 'center', fontWeight: 'bold', border: 'none' };