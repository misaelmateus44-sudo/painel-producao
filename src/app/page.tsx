'use client';

import { Play, Square, Plus, MoreHorizontal, Edit2, CheckCircle, RotateCcw, Trash2, X, Clock, Activity, Loader2, FileText, AlertTriangle, Flame, Link as LinkIcon, User, ExternalLink, Copy, Calendar, Target, Hash, CheckSquare, CalendarDays, Lightbulb, Filter } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const formatarTempo = (segundosTotais: number) => {
  if (!segundosTotais || segundosTotais < 0) return "00:00:00";
  const h = Math.floor(segundosTotais / 3600).toString().padStart(2, '0');
  const m = Math.floor((segundosTotais % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(segundosTotais % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const nomesDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const getDiasDosProximos7Dias = () => {
  const dataLocalDeHoje = new Date();
  return Array.from({length: 7}).map((_, i) => {
    const d = new Date(dataLocalDeHoje);
    d.setDate(dataLocalDeHoje.getDate() + i);
    const dataISO = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return { iso: dataISO, nomeDia: nomesDias[d.getDay()], diaMes: `${dataISO.split('-')[2]}/${dataISO.split('-')[1]}` };
  });
};

const redesDisponiveis = ["YouTube", "TikTok", "Instagram", "Shorts"];

export default function Home() {
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState<boolean>(false);
  const [gavetaIdeiasAberta, setGavetaIdeiasAberta] = useState<boolean>(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null);
  
  const [projetos, setProjetos] = useState<any[]>([]);
  const [calendario, setCalendario] = useState<any[]>([]);
  const [ideias, setIdeias] = useState<any[]>([]);
  const [fasesDoSistema, setFasesDoSistema] = useState<string[]>([]);
  
  const [carregando, setCarregando] = useState(true);
  const [nomeNovoProjeto, setNomeNovoProjeto] = useState("");
  const [novaIdeiaTitulo, setNovaIdeiaTitulo] = useState("");
  const [criandoProjeto, setCriandoProjeto] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null);

  const [horaAtual, setHoraAtual] = useState(Date.now());
  const [timersLocais, setTimersLocais] = useState<Record<string, { inicio: number, acumulado: number }>>({});
  
  // ESCUDO ANTI-FANTASMA: Memória que bloqueia dados velhos do Notion por 15 segundos
  const bloqueiosLocais = useRef<Record<string, number>>({});
  
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");

  const [criandoFase, setCriandoFase] = useState(false);
  const [nomeNovaFase, setNomeNovaFase] = useState("");
  const [modalExclusao, setModalExclusao] = useState<{ ativo: boolean; fase: string }>({ ativo: false, fase: "" });

  const [textoObservacao, setTextoObservacao] = useState("");
  const [textoLink, setTextoLink] = useState("");
  const [textoResponsavel, setTextoResponsavel] = useState("");
  const [textoCanal, setTextoCanal] = useState("");
  const [dataAlvoVisivel, setDataAlvoVisivel] = useState("");

  const [addCalendarioDia, setAddCalendarioDia] = useState<string | null>(null);
  const [calRede, setCalRede] = useState("YouTube");
  const [calCanal, setCalCanal] = useState("");
  const [calTitulo, setCalTitulo] = useState("");

  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);

  const listaDias = getDiasDosProximos7Dias();
  const hojeISO = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  useEffect(() => {
    const intervalo = setInterval(() => setHoraAtual(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (projetoSelecionado) {
      setTextoObservacao(projetoSelecionado.properties?.['Observações']?.rich_text?.[0]?.plain_text || "");
      setTextoLink(projetoSelecionado.properties?.['Link']?.url || "");
      setTextoResponsavel(projetoSelecionado.properties?.['Responsável']?.rich_text?.[0]?.plain_text || "");
      setTextoCanal(projetoSelecionado.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text || "");
      
      const alvoBruto = projetoSelecionado.properties?.['Data Alvo']?.date?.start;
      if (alvoBruto) {
        const [ano, mes, dia] = alvoBruto.split('T')[0].split('-');
        setDataAlvoVisivel(`${dia}/${mes}`);
      } else {
        setDataAlvoVisivel("");
      }
    }
  }, [projetoSelecionado]);

  const buscarProjetos = async () => {
    try {
      const resposta = await fetch('/api/notion', { cache: 'no-store' });
      const dados = await resposta.json();
      const agora = Date.now();
      
      // Aplicando o Escudo Anti-Fantasma nas respostas do servidor
      setProjetos(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        return (dados.projetos || []).map((p: any) => {
          const travadoEm = bloqueiosLocais.current[p.id];
          if (travadoEm && (agora - travadoEm < 15000)) return prevMap.get(p.id) || p;
          return p;
        });
      });

      setCalendario(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        return (dados.calendario || []).map((p: any) => {
          const travadoEm = bloqueiosLocais.current[p.id];
          if (travadoEm && (agora - travadoEm < 15000)) return prevMap.get(p.id) || p;
          return p;
        });
      });

      setIdeias(dados.ideias || []);
      setFasesDoSistema(dados.fases || []);
      
      setProjetoSelecionado((prev: any) => {
        if (!prev) return null;
        const travadoEm = bloqueiosLocais.current[prev.id];
        const incoming = (dados.projetos || []).find((p: any) => p.id === prev.id);
        if (travadoEm && (agora - travadoEm < 15000)) return prev;
        return incoming || prev;
      });

    } catch (erro) {} finally { setCarregando(false); }
  };

  useEffect(() => { buscarProjetos(); }, []);

  const atualizarPropriedade = async (propriedade: string, tipo: string, valor: any, projId?: string) => {
    const idAlvo = projId || (projetoSelecionado ? projetoSelecionado.id : null);
    if (!idAlvo) return;
    
    bloqueiosLocais.current[idAlvo] = Date.now(); // Ativando o escudo

    const atualizaLocal = (p: any) => {
      const pClone = JSON.parse(JSON.stringify(p));
      if (!pClone.properties[propriedade]) pClone.properties[propriedade] = {};
      if (tipo === 'rich_text') pClone.properties[propriedade] = { rich_text: [{ plain_text: valor, text: { content: valor } }] };
      if (tipo === 'title') pClone.properties[propriedade] = { title: [{ plain_text: valor, text: { content: valor } }] };
      if (tipo === 'url') pClone.properties[propriedade] = { url: valor || null };
      if (tipo === 'select') pClone.properties[propriedade] = valor ? { select: { name: valor } } : null;
      if (tipo === 'date') pClone.properties[propriedade] = valor ? { date: { start: valor } } : null;
      return pClone;
    };
    
    setProjetos(prev => prev.map(p => p.id === idAlvo ? atualizaLocal(p) : p));
    if (projetoSelecionado && projetoSelecionado.id === idAlvo) setProjetoSelecionado(atualizaLocal(projetoSelecionado));

    let formatacaoNotion: any = {};
    if (tipo === 'rich_text') formatacaoNotion = { rich_text: [{ text: { content: valor } }] };
    if (tipo === 'title') formatacaoNotion = { title: [{ text: { content: valor } }] };
    if (tipo === 'url') formatacaoNotion = valor ? { url: valor } : null;
    if (tipo === 'select') formatacaoNotion = valor ? { select: { name: valor } } : null;
    if (tipo === 'date') formatacaoNotion = valor ? { date: { start: valor } } : null;

    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: idAlvo, properties: { [propriedade]: formatacaoNotion } }) }); } catch (erro) {}
  };

  const handleCriarProjeto = async () => {
    if (!nomeNovoProjeto.trim()) return;
    setCriandoProjeto(true);
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nomeNovoProjeto, isCalendar: false, fase: fasesDoSistema[0] }) });
      setNomeNovoProjeto("");
      await buscarProjetos();
    } catch (erro) {} finally { setCriandoProjeto(false); }
  };

  const handleCriarIdeia = async () => {
    if (!novaIdeiaTitulo.trim()) return;
    setProcessandoAcao('add_ideia');
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novaIdeiaTitulo, isIdea: true }) });
      setNovaIdeiaTitulo("");
      await buscarProjetos();
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handlePromoverIdeia = async (ideia: any) => {
    setIdeias(prev => prev.filter(i => i.id !== ideia.id));
    setProcessandoAcao(ideia.id);
    try {
      await fetch('/api/notion', { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ pageId: ideia.id, properties: { "Categoria do Card": { rich_text: [{ text: { content: "PRODUCAO" } }] }, "Fase Atual": { select: { name: fasesDoSistema[0] || "Pesquisa" } } } }) 
      });
      await buscarProjetos();
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleAdicionarCalendario = async (data: string) => {
    if (!calTitulo.trim()) return;
    const novoAgendamentoFake = { id: `temp_${Date.now()}`, properties: { 'Nome': { title: [{ plain_text: calTitulo }] }, 'Plataforma de Lançamento': { rich_text: [{ plain_text: calRede }] }, 'Canal de Postagem': { rich_text: [{ plain_text: calCanal }] }, 'Data Alvo': { date: { start: data } }, 'Categoria do Card': { rich_text: [{ plain_text: 'AGENDAMENTO' }] } } };
    setCalendario(prev => [...prev, novoAgendamentoFake]);
    setProcessandoAcao(`add_cal_${data}`);
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCalendar: true, dataAlvo: data, rede: calRede, canal: calCanal, nome: calTitulo }) });
      setAddCalendarioDia(null); setCalCanal(""); setCalTitulo("");
      await buscarProjetos(); 
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleDeletarCard = async (id: string, isIdeia: boolean = false) => {
    if (isIdeia) setIdeias(prev => prev.filter(i => i.id !== id));
    else setCalendario(prev => prev.filter(c => c.id !== id));
    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: id, archived: true }) }); } catch (erro) {}
  };

  const handleAlternarRelogio = async (e: React.MouseEvent, projetoId: string, statusAtual: string, fase: string, ultimoInicioISO: string | null, tempoAcumuladoAnterior: number) => {
    e.stopPropagation();
    const vaiRodar = statusAtual === "Parado";
    const nomeColunaTempo = `Tempo ${fase}`;
    const agora = Date.now();
    let novoTempoTotal = tempoAcumuladoAnterior;
    
    bloqueiosLocais.current[projetoId] = agora; // Ativando o escudo

    if (vaiRodar) { 
      setTimersLocais(prev => ({ ...prev, [projetoId]: { inicio: agora, acumulado: tempoAcumuladoAnterior } })); 
    } else {
      const inicioReal = timersLocais[projetoId]?.inicio || (ultimoInicioISO ? new Date(ultimoInicioISO).getTime() : agora);
      const decorrido = Math.floor((agora - inicioReal) / 1000);
      novoTempoTotal = tempoAcumuladoAnterior + (decorrido > 0 ? decorrido : 0);
      setTimersLocais(prev => { const copy = { ...prev }; delete copy[projetoId]; return copy; });
    }

    setProjetos(prev => prev.map(p => {
      if (p.id === projetoId) {
        const pClone = JSON.parse(JSON.stringify(p));
        pClone.properties["Status do Relógio"] = { select: { name: vaiRodar ? "Rodando" : "Parado" } };
        pClone.properties["Último Início"] = vaiRodar ? { date: { start: new Date(agora).toISOString() } } : null;
        if (!vaiRodar) pClone.properties[nomeColunaTempo] = { number: novoTempoTotal };
        return pClone;
      } return p;
    }));

    try { 
      await fetch('/api/notion', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          pageId: projetoId, 
          properties: { 
            "Status do Relógio": { select: { name: vaiRodar ? "Rodando" : "Parado" } }, 
            "Último Início": vaiRodar ? { date: { start: new Date(agora).toISOString() } } : null,
            ...( !vaiRodar && { [nomeColunaTempo]: { number: novoTempoTotal } } ) 
          } 
        }) 
      }); 
    } catch (erro) {}
  };

  const handleDuplicarProjeto = async (e: React.MouseEvent, projeto: any) => {
    e.stopPropagation(); setMenuAberto(null); setProcessandoAcao(projeto.id);
    const nomeAtual = projeto.properties?.Nome?.title[0]?.plain_text || "Projeto";
    try {
      await fetch('/api/notion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: `${nomeAtual} (Cópia)`, fase: projeto.properties?.['Fase Atual']?.select?.name || fasesDoSistema[0],
          prioridade: projeto.properties?.['Prioridade']?.select?.name, link: projeto.properties?.['Link']?.url,
          responsavel: projeto.properties?.['Responsável']?.rich_text?.[0]?.plain_text, observacoes: projeto.properties?.['Observações']?.rich_text?.[0]?.plain_text,
          canal: projeto.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text, dataAlvo: projeto.properties?.['Data Alvo']?.date?.start, isCalendar: false
        })
      });
      await buscarProjetos();
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleZerarTempo = async (e: React.MouseEvent, projetoId: string, fase: string) => {
    e.stopPropagation(); setMenuAberto(null); setProcessandoAcao(projetoId);
    const nomeColunaTempo = `Tempo ${fase}`;
    
    bloqueiosLocais.current[projetoId] = Date.now(); // Ativando o escudo

    setProjetos(prev => prev.map(p => {
      if (p.id === projetoId) {
        const pClone = JSON.parse(JSON.stringify(p));
        pClone.properties["Status do Relógio"] = { select: { name: "Parado" } }; 
        pClone.properties["Último Início"] = null; 
        pClone.properties[nomeColunaTempo] = { number: 0 }; 
        return pClone;
      } return p;
    }));
    
    setTimersLocais(prev => { const copy = { ...prev }; delete copy[projetoId]; return copy; });
    
    try { 
      await fetch('/api/notion', { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          pageId: projetoId, 
          properties: { 
            "Status do Relógio": { select: { name: "Parado" } }, 
            "Último Início": null, 
            [nomeColunaTempo]: { number: 0 } 
          } 
        }) 
      }); 
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleDeletarProjeto = async (e: React.MouseEvent, projetoId: string) => {
    e.stopPropagation(); setMenuAberto(null); setProjetos(prev => prev.filter(p => p.id !== projetoId));
    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: projetoId, archived: true }) }); } catch (erro) {}
  };

  const salvarNovaFase = async () => {
    if (!nomeNovaFase.trim()) return;
    const faseFormatada = nomeNovaFase.trim();
    setFasesDoSistema(prev => [...prev, faseFormatada]);
    setCriandoFase(false); setNomeNovaFase("");
    try { await fetch('/api/notion', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novaFase: faseFormatada }) }); } catch (erro) {}
  };

  const toggleMenu = (id: string) => { setMenuAberto(menuAberto === id ? null : id); };
  const iniciarEdicaoNome = (e: React.MouseEvent, projetoId: string, nomeAtual: string) => { e.stopPropagation(); setMenuAberto(null); setEditandoId(projetoId); setNomeEditado(nomeAtual); };
  const salvarEdicaoNome = (projetoId: string) => { setEditandoId(null); if (!nomeEditado.trim()) return; atualizarPropriedade('Nome', 'title', nomeEditado, projetoId); };
  const abrirPainel = (projeto: any) => { setProjetoSelecionado(projeto); setPainelAberto(true); };

  const confirmarExclusaoFase = async () => {
    const faseParaDeletar = modalExclusao.fase;
    setModalExclusao({ ativo: false, fase: "" });
    setFasesDoSistema(prev => prev.filter(f => f !== faseParaDeletar));
    if (projetoSelecionado && projetoSelecionado.properties['Fase Atual']?.select?.name === faseParaDeletar) { atualizarPropriedade("Fase Atual", "select", fasesDoSistema[0] || "Pesquisa"); }
    try { await fetch('/api/notion', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faseParaDeletar }) }); } catch (erro) {}
  };

  const canaisAtivos = Array.from(new Set(projetos.map(p => p.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text).filter(Boolean)));
  const responsaveisAtivos = Array.from(new Set(projetos.map(p => p.properties?.['Responsável']?.rich_text?.[0]?.plain_text).filter(Boolean)));
  
  const projetosFiltrados = projetos.filter(p => {
    if (!filtroAtivo) return true;
    const canal = p.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text;
    const resp = p.properties?.['Responsável']?.rich_text?.[0]?.plain_text;
    return canal === filtroAtivo || resp === filtroAtivo;
  });

  const videosAtivos = projetos.length;
  const videosUrgentes = projetos.filter(p => {
    const alvoBruto = p.properties?.['Data Alvo']?.date?.start;
    return p.properties?.['Prioridade']?.select?.name === 'Urgente' || (alvoBruto && alvoBruto.split('T')[0] <= hojeISO);
  }).length;
  const faseFinal = fasesDoSistema.length > 0 ? fasesDoSistema[fasesDoSistema.length - 1] : "";
  const videosConcluidos = projetos.filter(p => p.properties?.['Fase Atual']?.select?.name === faseFinal).length;

  const renderizarPainel = () => {
    if (!projetoSelecionado) return null;
    const nome = projetoSelecionado.properties?.Nome?.title[0]?.plain_text || "Projeto Sem Nome";
    const faseAtual = projetoSelecionado.properties?.['Fase Atual']?.select?.name || fasesDoSistema[0];
    const prioridadeAtual = projetoSelecionado.properties?.['Prioridade']?.select?.name || "Normal";
    const tempoTotal = fasesDoSistema.reduce((acc, fase) => acc + (projetoSelecionado.properties?.[`Tempo ${fase}`]?.number || 0), 0);

    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4 overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Detalhes da Produção</p>
          <h3 className="text-xl font-extrabold text-white leading-tight break-words">{nome}</h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Canal</p>
            <input type="text" value={textoCanal} onChange={(e) => setTextoCanal(e.target.value)} onBlur={() => atualizarPropriedade('Canal de Postagem', 'rich_text', textoCanal)} placeholder="Ex: YouTube..." className="w-full bg-black/40 rounded p-1.5 text-xs font-bold text-indigo-300 focus:outline-none border border-transparent focus:border-indigo-500/50" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Prazo (DD/MM)</p>
            <input 
              type="text" 
              maxLength={5}
              placeholder="DD/MM"
              value={dataAlvoVisivel} 
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                setDataAlvoVisivel(val);
              }} 
              onBlur={() => {
                if (dataAlvoVisivel.length === 5) {
                  const [d, m] = dataAlvoVisivel.split('/');
                  const anoAtual = new Date().getFullYear();
                  atualizarPropriedade('Data Alvo', 'date', `${anoAtual}-${m}-${d}`);
                } else if (!dataAlvoVisivel) {
                  atualizarPropriedade('Data Alvo', 'date', null);
                }
              }}
              className="w-full bg-black/40 rounded p-1.5 text-xs font-bold text-gray-300 focus:outline-none border border-transparent focus:border-indigo-500/50 text-center" 
            />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Responsável</p>
            <input type="text" value={textoResponsavel} onChange={(e) => setTextoResponsavel(e.target.value)} onBlur={() => atualizarPropriedade('Responsável', 'rich_text', textoResponsavel)} placeholder="Ex: João" className="w-full bg-black/40 rounded p-1.5 text-xs font-bold text-gray-300 focus:outline-none border border-transparent focus:border-indigo-500/50" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Flame className="w-3 h-3"/> Prioridade</p>
            <div className="flex bg-black/50 rounded p-0.5">
              {['Normal', 'Urgente'].map(pri => (
                <button key={pri} onClick={() => atualizarPropriedade('Prioridade', 'select', pri)} className={`flex-1 text-[10px] py-1 rounded font-bold transition-all ${prioridadeAtual === pri ? (pri === 'Urgente' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400') : 'text-gray-500 hover:text-gray-300'}`}>{pri}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-gray-500 shrink-0"/>
          <input type="url" value={textoLink} onChange={(e) => setTextoLink(e.target.value)} onBlur={() => atualizarPropriedade('Link', 'url', textoLink)} placeholder="Link do Roteiro / Drive..." className="flex-1 bg-black/40 rounded p-1.5 text-xs font-semibold text-gray-300 focus:outline-none border border-transparent focus:border-indigo-500/50" />
          {textoLink && <a href={textoLink} target="_blank" rel="noreferrer" className="p-1.5 bg-indigo-500/20 rounded-md text-indigo-400 hover:bg-indigo-500/40"><ExternalLink className="w-3.5 h-3.5"/></a>}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 uppercase font-bold mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Diretrizes / Observações</p>
          <textarea value={textoObservacao} onChange={(e) => setTextoObservacao(e.target.value)} onBlur={() => atualizarPropriedade('Observações', 'rich_text', textoObservacao)} placeholder="Anotações importantes só para este vídeo..." className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-gray-300 min-h-[70px] focus:outline-none focus:border-indigo-500/50 resize-y" />
        </div>
        
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Mudar Fase</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {fasesDoSistema.map(fase => (
              <div key={fase} className={`group relative flex items-center pl-2.5 pr-1 py-1 border rounded-lg transition-colors cursor-pointer ${faseAtual === fase ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}>
                <button onClick={() => atualizarPropriedade('Fase Atual', 'select', fase)} className={`text-xs font-bold mr-1 ${faseAtual === fase ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white'}`}>{fase}</button>
                <button onClick={(e) => { e.stopPropagation(); setModalExclusao({ ativo: true, fase }); }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {criandoFase ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/50">
                <input autoFocus value={nomeNovaFase} onChange={e => setNomeNovaFase(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvarNovaFase()} placeholder="Nome..." className="bg-transparent text-xs font-bold text-emerald-100 outline-none w-20" />
                <button onClick={salvarNovaFase} className="text-emerald-400"><CheckCircle className="w-3.5 h-3.5"/></button>
              </div>
            ) : (<button onClick={() => setCriandoFase(true)} className="px-2 py-1 text-[10px] uppercase font-bold border border-dashed border-gray-600 rounded-lg flex items-center gap-1 text-gray-400 hover:text-white hover:border-gray-400"><Plus className="w-3 h-3"/> Nova Fase</button>)}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Auditoria de Tempo</p>
          <div className="bg-black/40 border border-white/10 rounded-xl p-1.5">
            {fasesDoSistema.map(fase => (
              <div key={fase} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                <span className={`text-[10px] font-bold uppercase ${faseAtual === fase ? 'text-indigo-400' : 'text-gray-500'}`}>{fase}</span>
                <span className="font-mono text-xs text-gray-400">{formatarTempo(projetoSelecionado.properties?.[`Tempo ${fase}`]?.number || 0)}</span>
              </div>
            ))}
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="flex justify-between items-center p-2"><span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Total Gasto</span><span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{formatarTempo(tempoTotal)}</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#050505] text-gray-100 p-4 md:p-6 font-sans overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505]" onClick={() => {setMenuAberto(null);}}>
      
      {/* MODAL DO CALENDÁRIO */}
      {addCalendarioDia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => setAddCalendarioDia(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1a1a1a] border border-white/20 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 max-w-[300px] w-full">
            <p className="text-xs font-bold text-indigo-400 uppercase mb-4 tracking-widest">Agendar Lançamento</p>
            <div className="space-y-3">
                <select value={calRede} onChange={e => setCalRede(e.target.value)} className="w-full bg-black/50 text-sm font-bold text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500 transition-colors cursor-pointer">
                  {redesDisponiveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="text" placeholder="Nome do Canal (ex: Edu)" value={calCanal} onChange={e => setCalCanal(e.target.value)} className="w-full bg-black/50 text-sm text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500 transition-colors" />
                <input autoFocus type="text" placeholder="Tema/Título do Vídeo" value={calTitulo} onChange={e => setCalTitulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && calTitulo.trim() && handleAdicionarCalendario(addCalendarioDia)} className="w-full bg-black/50 text-sm text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500 transition-colors" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddCalendarioDia(null)} className="flex-1 text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 py-2.5 rounded-lg transition-colors">Cancelar</button>
              <button 
                disabled={!calTitulo.trim() || processandoAcao !== null}
                onClick={() => handleAdicionarCalendario(addCalendarioDia)} 
                className={`flex-1 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center transition-all ${calTitulo.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-indigo-600/30 text-white/50 cursor-not-allowed'}`}
              >
                {processandoAcao === `add_cal_${addCalendarioDia}` ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExclusao.ativo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20"><AlertTriangle className="w-5 h-5 text-red-500" /></div><h3 className="text-lg font-bold text-white">Excluir Fase?</h3></div>
            <p className="text-sm text-gray-400 mb-6">Apagar a fase <strong className="text-white">"{modalExclusao.fase}"</strong> vai excluir o tempo dela em todos os projetos.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalExclusao({ ativo: false, fase: "" })} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5">Cancelar</button>
              <button onClick={confirmarExclusaoFase} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Target className="w-3.5 h-3.5 text-white"/></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Mesa de Comando</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm flex items-center gap-3">
              Time Tracking Elite
              <button onClick={() => setGavetaIdeiasAberta(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors ml-2">
                <Lightbulb className="w-3.5 h-3.5" /> Ideias
              </button>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-1.5">
              <div className="flex flex-col items-center px-1"><span className="text-[9px] text-gray-500 font-bold uppercase">Ativos</span><span className="text-base font-bold text-white mt-0.5">{videosAtivos}</span></div>
              <div className="w-px bg-white/10"></div>
              <div className="flex flex-col items-center px-1"><span className="text-[9px] text-red-400/80 font-bold uppercase">Atenção</span><span className="text-base font-bold text-red-400 mt-0.5">{videosUrgentes}</span></div>
              <div className="w-px bg-white/10"></div>
              <div className="flex flex-col items-center px-1"><span className="text-[9px] text-emerald-500/80 font-bold uppercase">Feitos</span><span className="text-base font-bold text-emerald-400 mt-0.5">{videosConcluidos}</span></div>
            </div>
          </div>
        </header>

        <section className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 shadow-inner">
          <h2 className="text-[10px] font-bold text-indigo-400 mb-4 uppercase tracking-widest flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Vitrine de Lançamentos (Próximos 7 Dias)</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {listaDias.map((diaObj, i) => {
              const isHoje = diaObj.iso === hojeISO;
              const itensDoDia = calendario.filter(c => {
                const alvoBruto = c.properties?.['Data Alvo']?.date?.start;
                return alvoBruto ? alvoBruto.split('T')[0] === diaObj.iso : false;
              });
              
              return (
                <div key={diaObj.iso} onClick={(e) => {e.stopPropagation(); setAddCalendarioDia(diaObj.iso);}} className={`relative flex flex-col rounded-xl p-2.5 transition-all cursor-pointer min-h-[120px] ${isHoje ? 'bg-indigo-500/10 border border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.15)]' : 'bg-black/50 border border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[11px] font-black ${isHoje ? 'text-indigo-400' : 'text-gray-500'}`}>{isHoje ? "HOJE" : diaObj.nomeDia}</span>
                    <span className={`text-[9px] font-bold ${isHoje ? 'text-indigo-300/50' : 'text-gray-600'}`}>{diaObj.diaMes}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 flex-1 justify-start overflow-y-auto overflow-x-hidden max-h-[140px] pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {itensDoDia.map(item => {
                      const rede = item.properties?.['Plataforma de Lançamento']?.rich_text?.[0]?.plain_text || "YouTube";
                      const canalCal = item.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text || "";
                      const titulo = item.properties?.Nome?.title[0]?.plain_text || "Vídeo";
                      const corRede = rede === "YouTube" ? "text-red-400 bg-red-500/10 border-red-500/20" : rede === "TikTok" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20";
                      
                      return (
                        <div key={item.id} className="group/cal bg-black/60 rounded border border-white/10 p-1.5 relative hover:border-white/30 transition-colors shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); handleDeletarCard(item.id); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/cal:opacity-100 shadow-lg z-10"><X className="w-2.5 h-2.5"/></button>
                          <div className={`text-[8px] font-black uppercase tracking-wider mb-0.5 w-fit px-1 rounded border ${corRede}`}>{rede}</div>
                          {canalCal && <div className="text-[9px] font-bold text-gray-300 truncate">{canalCal}</div>}
                          <div className="text-[9px] text-gray-500 truncate" title={titulo}>{titulo}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-white/5 backdrop-blur-xl p-2 pr-2 md:p-2.5 md:pr-2.5 rounded-xl border border-white/10 flex gap-2 w-full md:w-2/3 lg:w-1/2 shadow-lg focus-within:border-indigo-500/50 transition-all">
          <input type="text" value={nomeNovoProjeto} onChange={(e) => setNomeNovoProjeto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCriarProjeto()} placeholder="Criar novo vídeo (Fila de Produção)..." disabled={criandoProjeto} className="flex-1 bg-transparent px-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:ring-0 text-sm disabled:opacity-50" />
          <button onClick={handleCriarProjeto} disabled={criandoProjeto || !nomeNovoProjeto.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 min-w-[100px] shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
            {criandoProjeto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /><span>Criar</span></>}
          </button>
        </section>

        <section>
          {/* FILTROS A LASER COM ROLAGEM MODERNA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Linha de Montagem</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
              <button onClick={() => setFiltroAtivo(null)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${!filtroAtivo ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Todos</button>
              {responsaveisAtivos.map(r => (
                <button key={`resp_${r}`} onClick={() => setFiltroAtivo(r)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${filtroAtivo === r ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}><User className="w-3 h-3"/> {r}</button>
              ))}
              {canaisAtivos.map(c => (
                <button key={`canal_${c}`} onClick={() => setFiltroAtivo(c)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${filtroAtivo === c ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}># {c}</button>
              ))}
            </div>
          </div>
          
          {carregando ? (
             <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : projetosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600 border border-dashed border-white/5 rounded-2xl bg-white/5">
              <CheckSquare className="w-10 h-10 mb-2 text-gray-700"/>
              <p className="font-bold text-sm">{filtroAtivo ? `Nenhum projeto encontrado para o filtro.` : `Pronto para criar.`}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projetosFiltrados.map((projeto) => {
                const nome = projeto.properties?.Nome?.title[0]?.plain_text || "Projeto";
                const faseAtual = projeto.properties?.['Fase Atual']?.select?.name || "Pesquisa";
                const statusRelogio = projeto.properties?.['Status do Relógio']?.select?.name || "Parado";
                const prioridade = projeto.properties?.['Prioridade']?.select?.name;
                const canal = projeto.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text;
                const alvoBruto = projeto.properties?.['Data Alvo']?.date?.start;
                const alvo = alvoBruto ? alvoBruto.split('T')[0] : null;
                const temObservacao = !!projeto.properties?.['Observações']?.rich_text?.[0]?.plain_text;
                const link = projeto.properties?.['Link']?.url;
                const responsavel = projeto.properties?.['Responsável']?.rich_text?.[0]?.plain_text;
                
                const rodando = statusRelogio === "Rodando";
                const isFinalPhase = faseAtual === (fasesDoSistema.length > 0 ? fasesDoSistema[fasesDoSistema.length -1] : "");
                const isAtrasado = alvo && alvo < hojeISO && !isFinalPhase;
                const isHoje = alvo && alvo === hojeISO && !isFinalPhase;
                const alerta = isAtrasado || isHoje;
                const urgente = prioridade === "Urgente" || alerta;
                
                const nomeColunaTempo = `Tempo ${faseAtual}`;
                const tempoAcumulado = projeto.properties?.[nomeColunaTempo]?.number || 0;
                const ultimoInicio = projeto.properties?.['Último Início']?.date?.start;
                
                let tempoParaExibir = tempoAcumulado;
                if (timersLocais[projeto.id]) {
                  const decorrido = Math.floor((horaAtual - timersLocais[projeto.id].inicio) / 1000);
                  tempoParaExibir = timersLocais[projeto.id].acumulado + (decorrido > 0 ? decorrido : 0);
                } else if (rodando && ultimoInicio) {
                  const decorrido = Math.floor((horaAtual - new Date(ultimoInicio).getTime()) / 1000);
                  if (decorrido > 0) tempoParaExibir += decorrido;
                }

                const totalFases = fasesDoSistema.length || 1;
                const indiceFase = fasesDoSistema.indexOf(faseAtual);
                let porcentagem = 10;
                if (isFinalPhase) porcentagem = 100;
                else if (indiceFase >= 0) porcentagem = Math.max(10, ((indiceFase + 1) / totalFases) * 100);
                
                return (
                  <div key={projeto.id} onClick={() => abrirPainel(projeto)} className={`group relative flex flex-col bg-[#111] bg-opacity-80 backdrop-blur-xl border rounded-2xl aspect-[4/3] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden ${rodando ? 'border-indigo-500/50 shadow-[0_10px_30px_rgba(79,70,229,0.15)]' : urgente ? 'border-red-500/50 shadow-[0_10px_30px_rgba(239,68,68,0.15)]' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5">
                      <div className={`h-full transition-all duration-500 ease-out ${isFinalPhase ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`} style={{ width: `${porcentagem}%` }}></div>
                    </div>
                    <div className="p-4 flex flex-col h-full z-10">
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="flex items-center gap-1.5">
                          {responsavel && (
                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                              <User className="w-3 h-3 text-indigo-300"/>
                              <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{responsavel}</span>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); toggleMenu(projeto.id); }} className="text-gray-500 hover:text-white p-1 bg-white/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuAberto === projeto.id && (
                            <div className="absolute right-0 top-8 w-44 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 flex flex-col animate-in fade-in zoom-in duration-200">
                              <button onClick={(e) => iniciarEdicaoNome(e, projeto.id, nome)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /> Renomear</button>
                              <button onClick={(e) => handleDuplicarProjeto(e, projeto)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg"><Copy className="w-3.5 h-3.5" /> Duplicar</button>
                              <button onClick={(e) => handleZerarTempo(e, projeto.id, faseAtual)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"><RotateCcw className="w-3.5 h-3.5" /> Zerar Relógio</button>
                              <div className="h-[1px] bg-white/10 my-1"></div>
                              <button onClick={(e) => handleDeletarProjeto(e, projeto.id)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Deletar</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mb-2 flex items-start gap-1.5">
                        {urgente && <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isAtrasado ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />}
                        {editandoId === projeto.id ? (
                          <input type="text" autoFocus value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} onBlur={() => salvarEdicaoNome(projeto.id)} onKeyDown={(e) => { if(e.key === 'Enter') salvarEdicaoNome(projeto.id) }} onClick={(e) => e.stopPropagation()} className="w-full bg-black/50 text-white text-sm font-bold border border-indigo-500/50 rounded px-1.5 py-0.5 outline-none shadow-lg" />
                        ) : (
                          <h3 className={`font-bold text-sm md:text-base leading-tight line-clamp-2 ${isFinalPhase ? 'text-gray-400' : 'text-gray-100'}`}>{nome}</h3>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 my-auto">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isFinalPhase ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : rodando ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                             {rodando && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]"></span>} {faseAtual}
                          </span>
                          {canal && <span className="text-[9px] font-black text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[80px]">#{canal}</span>}
                        </div>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                           {temObservacao && <div title="Anotações" className="p-1 rounded bg-amber-500/10 text-amber-500/80 border border-amber-500/20"><FileText className="w-3 h-3" /></div>}
                           {link && <a href={link} target="_blank" rel="noreferrer" title="Material" onClick={e => e.stopPropagation()} className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/20 transition-colors"><LinkIcon className="w-3 h-3" /></a>}
                           {alvo && <div title={`Prazo: ${alvo}`} className={`p-1 rounded border flex items-center gap-1 px-1.5 ${alerta ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}><Calendar className="w-3 h-3"/> <span className="text-[9px] font-bold">{alvo.split('-').reverse().slice(0,2).join('/')}</span></div>}
                        </div>
                      </div>
                      <div className="flex items-end justify-between mt-auto pt-3 pb-1">
                        <div className={`text-2xl font-mono tracking-tighter font-light ${rodando ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'text-gray-500'}`}>{formatarTempo(tempoParaExibir)}</div>
                        {!isFinalPhase && (
                          <button onClick={(e) => handleAlternarRelogio(e, projeto.id, statusRelogio, faseAtual, ultimoInicio, tempoAcumulado)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all transform active:scale-95 z-20 ${rodando ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:bg-indigo-600' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
                            {rodando ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-1 fill-current" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      
      {painelAberto && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setPainelAberto(false)}></div>}
      <aside className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-[#0c0c0c]/95 backdrop-blur-2xl border-l border-white/10 z-40 transform transition-transform duration-300 shadow-[-30px_0_60px_rgba(0,0,0,0.7)] flex flex-col ${painelAberto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500"/> Visão Tática</h2>
          <button onClick={() => setPainelAberto(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {renderizarPainel()}
      </aside>

      {/* GAVETA DE IDEIAS COM ROLAGEM MODERNA */}
      {gavetaIdeiasAberta && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setGavetaIdeiasAberta(false)}></div>}
      <aside className={`fixed top-0 right-0 h-full w-full md:w-[350px] bg-[#0f0f0f] border-l border-white/10 z-50 transform transition-transform duration-300 shadow-[-30px_0_60px_rgba(0,0,0,0.7)] flex flex-col ${gavetaIdeiasAberta ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-amber-500/5">
          <h2 className="text-base font-bold text-amber-400 tracking-tight flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Banco de Ideias</h2>
          <button onClick={() => setGavetaIdeiasAberta(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-2">
            <input type="text" value={novaIdeiaTitulo} onChange={(e) => setNovaIdeiaTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCriarIdeia()} placeholder="Ideia de vídeo..." className="flex-1 bg-black/50 px-3 py-2 text-white text-sm rounded-lg border border-white/10 focus:outline-none focus:border-amber-500/50" />
            <button onClick={handleCriarIdeia} disabled={!novaIdeiaTitulo.trim() || processandoAcao === 'add_ideia'} className="bg-amber-600 hover:bg-amber-500 text-white px-3 rounded-lg disabled:opacity-50 transition-colors">
              {processandoAcao === 'add_ideia' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          {ideias.map(ideia => (
            <div key={ideia.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-3 group relative">
              <button onClick={() => handleDeletarCard(ideia.id, true)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5"/></button>
              <h4 className="text-sm font-bold text-gray-200 pr-5">{ideia.properties?.Nome?.title[0]?.plain_text}</h4>
              <button onClick={() => handlePromoverIdeia(ideia)} disabled={processandoAcao === ideia.id} className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                 {processandoAcao === ideia.id ? 'Promovendo...' : 'Produzir Vídeo'}
              </button>
            </div>
          ))}
          {ideias.length === 0 && <div className="text-center text-gray-600 text-sm font-medium mt-10">Sua gaveta está vazia.</div>}
        </div>
      </aside>
    </main>
  );
}