'use client';

import { Play, Square, Plus, MoreHorizontal, Edit2, CheckCircle, RotateCcw, Trash2, X, Clock, Activity, Loader2, FileText, AlertTriangle, Flame, Link as LinkIcon, User, ExternalLink, Copy, Calendar, Target, Hash, CheckSquare, CalendarDays, Lightbulb, FolderKanban, ArrowLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const formatarTempo = (segundosTotais: number) => {
  if (!segundosTotais || segundosTotais < 0) return "00:00:00";
  const h = Math.floor(segundosTotais / 3600).toString().padStart(2, '0');
  const m = Math.floor((segundosTotais % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(segundosTotais % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const getDiasDosProximos7Dias = () => {
  const nomesDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
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
  const [workspaceAtual, setWorkspaceAtual] = useState<string | null>(null);
  const [novoWorkspaceNome, setNovoWorkspaceNome] = useState("");

  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState<boolean>(false);
  const [gavetaIdeiasAberta, setGavetaIdeiasAberta] = useState<boolean>(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null);
  
  const [projetosIniciais, setProjetosIniciais] = useState<any[]>([]);
  const [calendarioInicial, setCalendarioInicial] = useState<any[]>([]);
  const [ideiasIniciais, setIdeiasIniciais] = useState<any[]>([]);
  const [fasesDoSistema, setFasesDoSistema] = useState<string[]>([]);
  
  const [carregando, setCarregando] = useState(true);
  const [nomeNovoProjeto, setNomeNovoProjeto] = useState("");
  const [novaIdeiaTitulo, setNovaIdeiaTitulo] = useState("");
  const [criandoProjeto, setCriandoProjeto] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null);

  const [horaAtual, setHoraAtual] = useState(Date.now());
  const [timersLocais, setTimersLocais] = useState<Record<string, { inicio: number, acumulado: number }>>({});
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
    const intervaloRelogio = setInterval(() => setHoraAtual(Date.now()), 1000);
    const intervaloSincronizacao = setInterval(() => buscarProjetos(true), 8000);
    return () => { clearInterval(intervaloRelogio); clearInterval(intervaloSincronizacao); };
  }, []);

  const buscarProjetos = async (modoSilencioso = false) => {
    if (!modoSilencioso) setCarregando(true);
    try {
      const resposta = await fetch('/api/notion', { cache: 'no-store' });
      const dados = await resposta.json();
      const agora = Date.now();
      
      const aplicarEscudo = (prev: any[], novos: any[]) => {
        const prevMap = new Map(prev.map((p: any) => [p.id, p]));
        return (novos || []).map((p: any) => {
          const travadoEm = bloqueiosLocais.current[p.id];
          // Escudo de 20s para garantir que o Notion salvou o pause
          if (travadoEm && (agora - travadoEm < 20000)) return prevMap.get(p.id) || p;
          return p;
        });
      };

      setProjetosIniciais(prev => aplicarEscudo(prev, dados.projetos));
      setCalendarioInicial(prev => aplicarEscudo(prev, dados.calendario));
      setIdeiasIniciais(dados.ideias || []);
      setFasesDoSistema(dados.fases || []);
      
      setProjetoSelecionado((prev: any) => {
        if (!prev) return null;
        const incoming = (dados.projetos || []).find((p: any) => p.id === prev.id);
        const travadoEm = bloqueiosLocais.current[prev.id];
        return (travadoEm && (agora - travadoEm < 20000)) ? prev : (incoming || prev);
      });
    } catch (erro) {} finally { 
      if (!modoSilencioso) setCarregando(false); 
    }
  };

  useEffect(() => { buscarProjetos(); }, []);

  const workspacesSet = new Set<string>();
  projetosIniciais.forEach((p: any) => p.properties?.Workspace?.select?.name && workspacesSet.add(p.properties.Workspace.select.name));
  calendarioInicial.forEach((c: any) => c.properties?.Workspace?.select?.name && workspacesSet.add(c.properties.Workspace.select.name));
  ideiasIniciais.forEach((i: any) => i.properties?.Workspace?.select?.name && workspacesSet.add(i.properties.Workspace.select.name));
  const workspacesDisponiveis = Array.from(workspacesSet).sort();

  const projetos = workspaceAtual ? projetosIniciais.filter((p: any) => p.properties?.Workspace?.select?.name === workspaceAtual || (!p.properties?.Workspace?.select?.name && workspaceAtual === "Geral")) : [];
  const calendario = workspaceAtual ? calendarioInicial.filter((c: any) => c.properties?.Workspace?.select?.name === workspaceAtual || (!c.properties?.Workspace?.select?.name && workspaceAtual === "Geral")) : [];
  const ideias = workspaceAtual ? ideiasIniciais.filter((i: any) => i.properties?.Workspace?.select?.name === workspaceAtual || (!i.properties?.Workspace?.select?.name && workspaceAtual === "Geral")) : [];

  const lidarComEntradaWorkspace = (nome: string) => { setWorkspaceAtual(nome); setFiltroAtivo(null); };

  const criarNovoWorkspaceVirtual = () => {
    if (!novoWorkspaceNome.trim()) return;
    setWorkspaceAtual(novoWorkspaceNome.trim());
    setNovoWorkspaceNome("");
  };

  useEffect(() => {
    if (projetoSelecionado) {
      setTextoObservacao(projetoSelecionado.properties?.['Observações']?.rich_text?.[0]?.plain_text || "");
      setTextoLink(projetoSelecionado.properties?.['Link']?.url || "");
      setTextoResponsavel(projetoSelecionado.properties?.['Responsável']?.rich_text?.[0]?.plain_text || "");
      setTextoCanal(projetoSelecionado.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text || "");
      const alvoBruto = projetoSelecionado.properties?.['Data Alvo']?.date?.start;
      setDataAlvoVisivel(alvoBruto ? `${alvoBruto.split('T')[0].split('-')[2]}/${alvoBruto.split('T')[0].split('-')[1]}` : "");
    }
  }, [projetoSelecionado]);

  const atualizarPropriedade = async (propriedade: string, tipo: string, valor: any, projId?: string) => {
    const idAlvo = projId || (projetoSelecionado ? projetoSelecionado.id : null);
    if (!idAlvo) return;
    bloqueiosLocais.current[idAlvo] = Date.now();

    let autoPaused = false;
    let tempoDecorrer = 0;
    let oldFase = "";

    // Lógica de Auto-Pause se mudar de fase com o relógio rodando
    const pAtual = projetosIniciais.find(p => p.id === idAlvo);
    if (pAtual && propriedade === 'Fase Atual' && pAtual.properties?.['Status do Relógio']?.select?.name === 'Rodando') {
      autoPaused = true;
      oldFase = pAtual.properties?.['Fase Atual']?.select?.name || fasesDoSistema[0];
      const inicioIso = pAtual.properties?.['Último Início']?.date?.start;
      const acumuladoAntigo = pAtual.properties?.[`Tempo ${oldFase}`]?.number || 0;
      
      const inicioReal = timersLocais[idAlvo]?.inicio || (inicioIso ? new Date(inicioIso).getTime() : Date.now());
      const decorrido = Math.floor((Date.now() - inicioReal) / 1000);
      tempoDecorrer = acumuladoAntigo + (decorrido > 0 ? decorrido : 0);
      
      setTimersLocais(prev => { const copy = { ...prev }; delete copy[idAlvo]; return copy; });
    }

    const atualizaLocal = (p: any) => {
      const pClone = JSON.parse(JSON.stringify(p));
      if (!pClone.properties[propriedade]) pClone.properties[propriedade] = {};
      if (tipo === 'rich_text') pClone.properties[propriedade] = { rich_text: [{ plain_text: valor, text: { content: valor } }] };
      if (tipo === 'title') pClone.properties[propriedade] = { title: [{ plain_text: valor, text: { content: valor } }] };
      if (tipo === 'url') pClone.properties[propriedade] = { url: valor || null };
      if (tipo === 'select') pClone.properties[propriedade] = valor ? { select: { name: valor } } : null;
      if (tipo === 'date') pClone.properties[propriedade] = valor ? { date: { start: valor } } : null;
      
      if (autoPaused) {
         pClone.properties["Status do Relógio"] = { select: { name: "Parado" } };
         pClone.properties["Último Início"] = null;
         pClone.properties[`Tempo ${oldFase}`] = { number: tempoDecorrer };
      }
      return pClone;
    };
    
    setProjetosIniciais(prev => prev.map((p: any) => p.id === idAlvo ? atualizaLocal(p) : p));
    if (projetoSelecionado && projetoSelecionado.id === idAlvo) setProjetoSelecionado(atualizaLocal(projetoSelecionado));

    let formatoNotion: any = {};
    if (tipo === 'rich_text') formatoNotion = { rich_text: [{ text: { content: valor } }] };
    if (tipo === 'title') formatoNotion = { title: [{ text: { content: valor } }] };
    if (tipo === 'url') formatoNotion = valor ? { url: valor } : null;
    if (tipo === 'select') formatoNotion = valor ? { select: { name: valor } } : null;
    if (tipo === 'date') formatoNotion = valor ? { date: { start: valor } } : null;

    let propertiesToUpdate: any = { [propriedade]: formatoNotion };
    if (autoPaused) {
       propertiesToUpdate["Status do Relógio"] = { select: { name: "Parado" } };
       propertiesToUpdate["Último Início"] = null;
       propertiesToUpdate[`Tempo ${oldFase}`] = { number: tempoDecorrer };
    }

    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: idAlvo, properties: propertiesToUpdate }) }); } catch (erro) {}
  };

  const handleCriarProjeto = async () => {
    if (!nomeNovoProjeto.trim() || !workspaceAtual) return;
    setCriandoProjeto(true);
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nomeNovoProjeto, isCalendar: false, fase: fasesDoSistema[0], workspace: workspaceAtual }) });
      setNomeNovoProjeto(""); await buscarProjetos(true);
    } catch (erro) {} finally { setCriandoProjeto(false); }
  };

  const handleCriarIdeia = async () => {
    if (!novaIdeiaTitulo.trim() || !workspaceAtual) return;
    setProcessandoAcao('add_ideia');
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novaIdeiaTitulo, isIdea: true, workspace: workspaceAtual }) });
      setNovaIdeiaTitulo(""); await buscarProjetos(true);
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handlePromoverIdeia = async (ideia: any) => {
    setIdeiasIniciais(prev => prev.filter(i => i.id !== ideia.id));
    setProcessandoAcao(ideia.id);
    try {
      await fetch('/api/notion', { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ pageId: ideia.id, properties: { "Categoria do Card": { rich_text: [{ text: { content: "PRODUCAO" } }] }, "Fase Atual": { select: { name: fasesDoSistema[0] || "Pesquisa" } } } }) 
      });
      await buscarProjetos(true);
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleAdicionarCalendario = async (data: string) => {
    if (!calTitulo.trim() || !workspaceAtual) return;
    setProcessandoAcao(`add_cal_${data}`);
    try {
      await fetch('/api/notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCalendar: true, dataAlvo: data, rede: calRede, canal: calCanal, nome: calTitulo, workspace: workspaceAtual }) });
      setAddCalendarioDia(null); setCalCanal(""); setCalTitulo(""); await buscarProjetos(true); 
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleDeletarCard = async (id: string) => {
    setProjetosIniciais(prev => prev.filter((c: any) => c.id !== id));
    setCalendarioInicial(prev => prev.filter((c: any) => c.id !== id));
    setIdeiasIniciais(prev => prev.filter((c: any) => c.id !== id));
    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: id, archived: true }) }); } catch (erro) {}
  };

  const toggleMenu = (id: string) => { setMenuAberto(menuAberto === id ? null : id); };
  const iniciarEdicaoNome = (e: React.MouseEvent, projetoId: string, nomeAtual: string) => { e.stopPropagation(); setMenuAberto(null); setEditandoId(projetoId); setNomeEditado(nomeAtual); };
  const salvarEdicaoNome = (projetoId: string) => { setEditandoId(null); if (!nomeEditado.trim()) return; atualizarPropriedade('Nome', 'title', nomeEditado, projetoId); };
  const abrirPainel = (projeto: any) => { setProjetoSelecionado(projeto); setPainelAberto(true); };

  const salvarNovaFase = async () => {
    if (!nomeNovaFase.trim()) return;
    const faseFormatada = nomeNovaFase.trim();
    setFasesDoSistema(prev => [...prev, faseFormatada]);
    setCriandoFase(false); setNomeNovaFase("");
    try { await fetch('/api/notion', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novaFase: faseFormatada }) }); } catch (erro) {}
  };

  const confirmarExclusaoFase = async () => {
    const faseParaDeletar = modalExclusao.fase;
    setModalExclusao({ ativo: false, fase: "" });
    setFasesDoSistema(prev => prev.filter(f => f !== faseParaDeletar));
    if (projetoSelecionado && projetoSelecionado.properties['Fase Atual']?.select?.name === faseParaDeletar) { atualizarPropriedade("Fase Atual", "select", fasesDoSistema[0] || "Pesquisa"); }
    try { await fetch('/api/notion', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faseParaDeletar }) }); } catch (erro) {}
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
          canal: projeto.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text, dataAlvo: projeto.properties?.['Data Alvo']?.date?.start, isCalendar: false,
          workspace: workspaceAtual
        })
      });
      await buscarProjetos(true);
    } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleZerarTempo = async (e: React.MouseEvent, projetoId: string, fase: string) => {
    e.stopPropagation(); setMenuAberto(null); setProcessandoAcao(projetoId);
    const nomeColunaTempo = `Tempo ${fase}`;
    bloqueiosLocais.current[projetoId] = Date.now(); 
    setProjetosIniciais(prev => prev.map(p => {
      if (p.id === projetoId) {
        const pClone = JSON.parse(JSON.stringify(p));
        pClone.properties["Status do Relógio"] = { select: { name: "Parado" } }; 
        pClone.properties["Último Início"] = null; 
        pClone.properties[nomeColunaTempo] = { number: 0 }; 
        return pClone;
      } return p;
    }));
    setTimersLocais(prev => { const copy = { ...prev }; delete copy[projetoId]; return copy; });
    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: projetoId, properties: { "Status do Relógio": { select: { name: "Parado" } }, "Último Início": null, [nomeColunaTempo]: { number: 0 } } }) }); } catch (erro) {} finally { setProcessandoAcao(null); }
  };

  const handleAlternarRelogio = async (e: React.MouseEvent, projetoId: string, statusAtual: string, fase: string, ultimoInicioISO: string | null, tempoAcumuladoAnterior: number) => {
    e.stopPropagation();
    const vaiRodar = statusAtual === "Parado";
    const nomeColunaTempo = `Tempo ${fase}`;
    const agora = Date.now();
    let novoTempoTotal = tempoAcumuladoAnterior;
    
    bloqueiosLocais.current[projetoId] = agora; // Reforça o escudo

    if (vaiRodar) { 
      setTimersLocais(prev => ({ ...prev, [projetoId]: { inicio: agora, acumulado: tempoAcumuladoAnterior } })); 
    } else {
      const inicioReal = timersLocais[projetoId]?.inicio || (ultimoInicioISO ? new Date(ultimoInicioISO).getTime() : agora);
      const decorrido = Math.floor((agora - inicioReal) / 1000);
      novoTempoTotal = tempoAcumuladoAnterior + (decorrido > 0 ? decorrido : 0);
      setTimersLocais(prev => { const copy = { ...prev }; delete copy[projetoId]; return copy; });
    }

    setProjetosIniciais(prev => prev.map((p: any) => {
      if (p.id === projetoId) {
        const pClone = JSON.parse(JSON.stringify(p));
        pClone.properties["Status do Relógio"] = { select: { name: vaiRodar ? "Rodando" : "Parado" } };
        pClone.properties["Último Início"] = vaiRodar ? { date: { start: new Date(agora).toISOString() } } : null;
        if (!vaiRodar) pClone.properties[nomeColunaTempo] = { number: novoTempoTotal };
        return pClone;
      } return p;
    }));

    try { await fetch('/api/notion', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: projetoId, properties: { "Status do Relógio": { select: { name: vaiRodar ? "Rodando" : "Parado" } }, "Último Início": vaiRodar ? { date: { start: new Date(agora).toISOString() } } : null, ...( !vaiRodar && { [nomeColunaTempo]: { number: novoTempoTotal } } ) } }) }); } catch (erro) {}
  };

  const renderizarPainel = () => {
    if (!projetoSelecionado) return null;
    const nome = projetoSelecionado.properties?.Nome?.title[0]?.plain_text || "Projeto Sem Nome";
    const faseAtual = projetoSelecionado.properties?.['Fase Atual']?.select?.name || fasesDoSistema[0];
    const prioridadeAtual = projetoSelecionado.properties?.['Prioridade']?.select?.name || "Normal";
    
    const statusRelogio = projetoSelecionado.properties?.['Status do Relógio']?.select?.name || "Parado";
    const rodando = statusRelogio === "Rodando";

    // Cálculo exato e em tempo real para a barra lateral
    let tempoTotal = 0;
    const temposPorFase = fasesDoSistema.map(fase => {
      let tempoFase = projetoSelecionado.properties?.[`Tempo ${fase}`]?.number || 0;
      if (fase === faseAtual && rodando) {
         if (timersLocais[projetoSelecionado.id]) {
            tempoFase = timersLocais[projetoSelecionado.id].acumulado + Math.floor((horaAtual - timersLocais[projetoSelecionado.id].inicio) / 1000);
         } else if (projetoSelecionado.properties?.['Último Início']?.date?.start) {
            tempoFase += Math.floor((horaAtual - new Date(projetoSelecionado.properties['Último Início'].date.start).getTime()) / 1000);
         }
      }
      tempoTotal += tempoFase;
      return { fase, tempoFase };
    });

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
            <input type="text" maxLength={5} placeholder="DD/MM" value={dataAlvoVisivel} onChange={(e) => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4); setDataAlvoVisivel(val); }} onBlur={() => { if (dataAlvoVisivel.length === 5) { const [d, m] = dataAlvoVisivel.split('/'); const anoAtual = new Date().getFullYear(); atualizarPropriedade('Data Alvo', 'date', `${anoAtual}-${m}-${d}`); } else if (!dataAlvoVisivel) { atualizarPropriedade('Data Alvo', 'date', null); } }} className="w-full bg-black/40 rounded p-1.5 text-xs font-bold text-gray-300 focus:outline-none border border-transparent focus:border-indigo-500/50 text-center" />
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
                <button onClick={(e) => { e.stopPropagation(); setModalExclusao({ ativo: true, fase }); }} className="p-0.5 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
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
            {temposPorFase.map(({ fase, tempoFase }) => (
              <div key={fase} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                <span className={`text-[10px] font-bold uppercase ${faseAtual === fase ? 'text-indigo-400' : 'text-gray-500'}`}>{fase}</span>
                <span className="font-mono text-xs text-gray-400">{formatarTempo(tempoFase)}</span>
              </div>
            ))}
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="flex justify-between items-center p-2"><span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Total Gasto</span><span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{formatarTempo(tempoTotal)}</span></div>
          </div>
        </div>
      </div>
    );
  };

  // === TELA 1: LOBBY DE WORKSPACES ===
  if (workspaceAtual === null) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505]">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)]">
              <FolderKanban className="w-8 h-8 text-white"/>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Workspaces</h1>
            <p className="text-gray-400 text-sm">Selecione um projeto mestre para acessar a mesa de comando isolada.</p>
          </div>

          {carregando ? (
             <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin"/></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {workspacesDisponiveis.map(ws => (
                <div key={ws} onClick={() => lidarComEntradaWorkspace(ws)} className="group bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:bg-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><FolderKanban className="w-4 h-4"/></div>
                    <span className="font-bold text-gray-200 group-hover:text-white transition-colors">{ws}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors"/>
                </div>
              ))}
              
              <div className="bg-transparent border border-dashed border-white/20 rounded-2xl p-5 flex flex-col justify-center gap-3 hover:border-white/40 transition-colors">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Criar Novo Workspace</p>
                <div className="flex gap-2">
                  <input type="text" value={novoWorkspaceNome} onChange={e => setNovoWorkspaceNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && criarNovoWorkspaceVirtual()} placeholder="Ex: Cliente XYZ..." className="flex-1 bg-black/50 text-sm text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500"/>
                  <button onClick={criarNovoWorkspaceVirtual} disabled={!novoWorkspaceNome.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-600 text-white px-3 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // === TELA 2: MESA DE COMANDO DO PROJETO ===
  const canaisAtivos = Array.from(new Set(projetos.map((p: any) => p.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text).filter(Boolean)));
  const responsaveisAtivos = Array.from(new Set(projetos.map((p: any) => p.properties?.['Responsável']?.rich_text?.[0]?.plain_text).filter(Boolean)));
  
  const projetosFiltrados = projetos.filter((p: any) => !filtroAtivo || p.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text === filtroAtivo || p.properties?.['Responsável']?.rich_text?.[0]?.plain_text === filtroAtivo);

  const videosAtivos = projetos.length;
  const videosUrgentes = projetos.filter((p: any) => p.properties?.['Prioridade']?.select?.name === 'Urgente' || (p.properties?.['Data Alvo']?.date?.start && p.properties?.['Data Alvo']?.date?.start.split('T')[0] <= hojeISO)).length;
  const faseFinal = fasesDoSistema.length > 0 ? fasesDoSistema[fasesDoSistema.length - 1] : "";
  const videosConcluidos = projetos.filter((p: any) => p.properties?.['Fase Atual']?.select?.name === faseFinal).length;

  return (
    <main className="min-h-screen bg-[#050505] text-gray-100 p-4 md:p-6 font-sans overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505]" onClick={() => setMenuAberto(null)}>
      
      {/* MODAIS (Calendário e Exclusão de Fase) */}
      {addCalendarioDia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => setAddCalendarioDia(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1a1a1a] border border-white/20 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 max-w-[300px] w-full">
            <p className="text-xs font-bold text-indigo-400 uppercase mb-4 tracking-widest">Agendar Lançamento</p>
            <div className="space-y-3">
                <select value={calRede} onChange={e => setCalRede(e.target.value)} className="w-full bg-black/50 text-sm font-bold text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500 transition-colors cursor-pointer">{redesDisponiveis.map(r => <option key={r} value={r}>{r}</option>)}</select>
                <input type="text" placeholder="Nome do Canal (ex: Edu)" value={calCanal} onChange={e => setCalCanal(e.target.value)} className="w-full bg-black/50 text-sm text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500" />
                <input autoFocus type="text" placeholder="Tema/Título do Vídeo" value={calTitulo} onChange={e => setCalTitulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdicionarCalendario(addCalendarioDia)} className="w-full bg-black/50 text-sm text-white rounded-lg p-2.5 outline-none border border-white/10 focus:border-indigo-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddCalendarioDia(null)} className="flex-1 text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 py-2.5 rounded-lg transition-colors">Cancelar</button>
              <button disabled={!calTitulo.trim() || processandoAcao !== null} onClick={() => handleAdicionarCalendario(addCalendarioDia)} className={`flex-1 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center transition-all ${calTitulo.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-indigo-600/30 text-white/50 cursor-not-allowed'}`}>{processandoAcao ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Salvar'}</button>
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
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <button onClick={() => setWorkspaceAtual(null)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-400 transition-colors mb-3"><ArrowLeft className="w-3.5 h-3.5"/> Voltar aos Workspaces</button>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"><FolderKanban className="w-3.5 h-3.5 text-white"/></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Workspace Ativo</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm flex items-center gap-3">
              {workspaceAtual}
              <button onClick={() => setGavetaIdeiasAberta(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors ml-2"><Lightbulb className="w-3.5 h-3.5" /> Ideias</button>
            </h1>
          </div>
          
          {projetos.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-1.5">
                <div className="flex flex-col items-center px-1"><span className="text-[9px] text-gray-500 font-bold uppercase">Ativos</span><span className="text-base font-bold text-white mt-0.5">{videosAtivos}</span></div>
                <div className="w-px bg-white/10"></div>
                <div className="flex flex-col items-center px-1"><span className="text-[9px] text-red-400/80 font-bold uppercase">Atenção</span><span className="text-base font-bold text-red-400 mt-0.5">{videosUrgentes}</span></div>
                <div className="w-px bg-white/10"></div>
                <div className="flex flex-col items-center px-1"><span className="text-[9px] text-emerald-500/80 font-bold uppercase">Feitos</span><span className="text-base font-bold text-emerald-400 mt-0.5">{videosConcluidos}</span></div>
              </div>
            </div>
          )}
        </header>

        {/* VITRINE DE LANÇAMENTOS */}
        <section className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 shadow-inner">
          <h2 className="text-[10px] font-bold text-indigo-400 mb-4 uppercase tracking-widest flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Lançamentos - {workspaceAtual}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {listaDias.map((diaObj) => {
              const isHoje = diaObj.iso === hojeISO;
              const itensDoDia = calendario.filter((c: any) => c.properties?.['Data Alvo']?.date?.start?.split('T')[0] === diaObj.iso);
              
              return (
                <div key={diaObj.iso} onClick={(e) => {e.stopPropagation(); setAddCalendarioDia(diaObj.iso);}} className={`relative flex flex-col rounded-xl p-2.5 transition-all cursor-pointer min-h-[120px] ${isHoje ? 'bg-indigo-500/10 border border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.15)]' : 'bg-black/50 border border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[11px] font-black ${isHoje ? 'text-indigo-400' : 'text-gray-500'}`}>{isHoje ? "HOJE" : diaObj.nomeDia}</span>
                    <span className={`text-[9px] font-bold ${isHoje ? 'text-indigo-300/50' : 'text-gray-600'}`}>{diaObj.diaMes}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-1 justify-start overflow-y-auto overflow-x-hidden max-h-[140px] pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {itensDoDia.map((item: any) => {
                      const rede = item.properties?.['Plataforma de Lançamento']?.rich_text?.[0]?.plain_text || "YouTube";
                      const titulo = item.properties?.Nome?.title[0]?.plain_text || "Vídeo";
                      const canalCal = item.properties?.['Canal de Postagem']?.rich_text?.[0]?.plain_text || "";
                      const corRede = rede === "YouTube" ? "text-red-400 bg-red-500/10 border-red-500/20" : rede === "TikTok" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20";
                      
                      return (
                        <div key={item.id} className="group/cal bg-black/80 rounded border border-white/10 p-2 relative hover:border-white/30 transition-colors shrink-0 flex flex-col">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                               <div className={`text-[8px] font-black uppercase tracking-wider w-fit px-1.5 py-0.5 rounded border ${corRede} shrink-0`}>{rede}</div>
                               {canalCal && <span className="text-[9px] font-bold text-gray-400 truncate">{canalCal}</span>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletarCard(item.id); }} className="bg-red-500/80 hover:bg-red-500 text-white rounded p-0.5 opacity-100 md:opacity-0 md:group-hover/cal:opacity-100 transition-opacity shrink-0"><X className="w-2.5 h-2.5"/></button>
                          </div>
                          <div className="text-[9px] text-gray-400 font-medium break-words leading-tight" title={titulo}>{titulo}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* BARRA DE CRIAÇÃO */}
        <section className="bg-white/5 backdrop-blur-xl p-2 pr-2 md:p-2.5 md:pr-2.5 rounded-xl border border-white/10 flex gap-2 w-full shadow-lg focus-within:border-indigo-500/50 transition-all">
          <input type="text" value={nomeNovoProjeto} onChange={(e) => setNomeNovoProjeto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCriarProjeto()} placeholder={`Criar novo vídeo em ${workspaceAtual}...`} disabled={criandoProjeto} className="flex-1 bg-transparent px-3 text-white font-bold placeholder-gray-600 focus:outline-none text-sm disabled:opacity-50" />
          <button onClick={handleCriarProjeto} disabled={criandoProjeto || !nomeNovoProjeto.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 min-w-[100px] shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
            {criandoProjeto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /><span>Criar</span></>}
          </button>
        </section>

        {/* LINHA DE MONTAGEM */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Linha de Montagem - {workspaceAtual}</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setFiltroAtivo(null)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${!filtroAtivo ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Todos</button>
              {responsaveisAtivos.map((r: any) => <button key={r} onClick={() => setFiltroAtivo(r)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${filtroAtivo === r ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}><User className="w-3 h-3"/> {r}</button>)}
              {canaisAtivos.map((c: any) => <button key={c} onClick={() => setFiltroAtivo(c)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors shrink-0 ${filtroAtivo === c ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}># {c}</button>)}
            </div>
          </div>
          
          {projetosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600 border border-dashed border-white/5 rounded-2xl bg-white/5"><CheckSquare className="w-10 h-10 mb-2 text-gray-700"/><p className="font-bold text-sm">Este workspace está vazio. Comece a criar!</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projetosFiltrados.map((projeto: any) => {
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
                
                let tempoParaExibir = projeto.properties?.[`Tempo ${faseAtual}`]?.number || 0;
                if (timersLocais[projeto.id]) { tempoParaExibir = timersLocais[projeto.id].acumulado + Math.floor((horaAtual - timersLocais[projeto.id].inicio) / 1000); } 
                else if (rodando && projeto.properties?.['Último Início']?.date?.start) { tempoParaExibir += Math.floor((horaAtual - new Date(projeto.properties['Último Início'].date.start).getTime()) / 1000); }

                const totalFases = fasesDoSistema.length || 1;
                const indiceFase = fasesDoSistema.indexOf(faseAtual);
                let porcentagem = 10;
                if (isFinalPhase) porcentagem = 100;
                else if (indiceFase >= 0) porcentagem = Math.max(10, ((indiceFase + 1) / totalFases) * 100);

                return (
                  <div key={projeto.id} onClick={() => abrirPainel(projeto)} className={`group relative flex flex-col bg-[#111] bg-opacity-80 backdrop-blur-xl border rounded-2xl aspect-[4/3] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden ${rodando ? 'border-indigo-500/50 shadow-[0_10px_30px_rgba(79,70,229,0.15)]' : urgente ? 'border-red-500/50 shadow-[0_10px_30px_rgba(239,68,68,0.15)]' : 'border-white/5 hover:border-white/20'}`}>
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5"><div className={`h-full transition-all duration-500 ease-out ${isFinalPhase ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`} style={{ width: `${porcentagem}%` }}></div></div>
                    
                    <div className="p-4 flex flex-col h-full z-10">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          {responsavel && (
                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                              <User className="w-3 h-3 text-indigo-300"/>
                              <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{responsavel}</span>
                            </div>
                          )}
                        </div>
                        {/* BOTÃO DOS 3 PONTINHOS E SEU MENU BLINDADO CONTRA VAZAMENTO */}
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); toggleMenu(projeto.id); }} className="text-gray-500 hover:text-white p-1 bg-white/5 rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuAberto === projeto.id && (
                            <div className="absolute right-0 top-8 w-44 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 flex flex-col animate-in fade-in zoom-in duration-200">
                              <button onClick={(e) => iniciarEdicaoNome(e, projeto.id, nome)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /> Renomear</button>
                              <button onClick={(e) => handleDuplicarProjeto(e, projeto)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg"><Copy className="w-3.5 h-3.5" /> Duplicar</button>
                              <button onClick={(e) => handleZerarTempo(e, projeto.id, faseAtual)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"><RotateCcw className="w-3.5 h-3.5" /> Zerar Relógio</button>
                              <div className="h-[1px] bg-white/10 my-1"></div>
                              <button onClick={(e) => { e.stopPropagation(); setMenuAberto(null); handleDeletarCard(projeto.id); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Deletar</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-2 flex items-start gap-1.5">
                        {urgente && <AlertTriangle className={`w-4 h-4 shrink-0 mt-2 ${isAtrasado ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />}
                        {editandoId === projeto.id ? (
                          <input type="text" autoFocus value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} onBlur={() => salvarEdicaoNome(projeto.id)} onKeyDown={(e) => { if(e.key === 'Enter') salvarEdicaoNome(projeto.id) }} onClick={(e) => e.stopPropagation()} className="w-full bg-black/50 text-white text-sm font-bold border border-indigo-500/50 rounded px-1.5 py-0.5 outline-none shadow-lg mt-1" />
                        ) : (
                          // TÍTULO COM SUPER DESTAQUE VISUAL
                          <h3 className={`font-extrabold text-lg md:text-xl leading-tight line-clamp-2 mt-1.5 mb-1 ${isFinalPhase ? 'text-gray-400' : 'text-white'}`}>{nome}</h3>
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
                          <button onClick={(e) => handleAlternarRelogio(e, projeto.id, statusRelogio, faseAtual, projeto.properties?.['Último Início']?.date?.start, projeto.properties?.[`Tempo ${faseAtual}`]?.number || 0)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all transform active:scale-95 z-20 ${rodando ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:bg-indigo-600' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
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

      {/* GAVETAS LATERAIS */}
      {painelAberto && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setPainelAberto(false)}></div>}
      <aside className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-[#0c0c0c]/95 backdrop-blur-2xl border-l border-white/10 z-40 transform transition-transform duration-300 shadow-[-30px_0_60px_rgba(0,0,0,0.7)] flex flex-col ${painelAberto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500"/> Visão Tática</h2>
          <button onClick={() => setPainelAberto(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {renderizarPainel()}
      </aside>

      {gavetaIdeiasAberta && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setGavetaIdeiasAberta(false)}></div>}
      <aside className={`fixed top-0 right-0 h-full w-full md:w-[350px] bg-[#0f0f0f] border-l border-white/10 z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${gavetaIdeiasAberta ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-amber-500/5">
          <h2 className="text-base font-bold text-amber-400 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Ideias ({workspaceAtual})</h2>
          <button onClick={() => setGavetaIdeiasAberta(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 border-b border-white/5 flex gap-2">
            <input type="text" value={novaIdeiaTitulo} onChange={(e) => setNovaIdeiaTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCriarIdeia()} placeholder="Nova ideia..." className="flex-1 bg-black/50 px-3 py-2 text-white text-sm rounded-lg border border-white/10 focus:outline-none focus:border-amber-500/50" />
            <button onClick={handleCriarIdeia} disabled={!novaIdeiaTitulo.trim() || processandoAcao === 'add_ideia'} className="bg-amber-600 hover:bg-amber-500 text-white px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ideias.map((ideia: any) => (
            <div key={ideia.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-3 relative group">
               <button onClick={() => handleDeletarCard(ideia.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5"/></button>
               <h4 className="text-sm font-bold text-gray-200 pr-5">{ideia.properties?.Nome?.title[0]?.plain_text}</h4>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
