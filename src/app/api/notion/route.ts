export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dbId = process.env.NOTION_VIDEOS_DB_ID;
    const apiKey = process.env.NOTION_API_KEY;
    const headers = { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" };

    const reqBanco = await fetch(`https://api.notion.com/v1/databases/${dbId}`, { headers });
    const banco = await reqBanco.json();
    
    const propsToCreate: any = {};
    if (!banco.properties['Observações']) propsToCreate['Observações'] = { rich_text: {} };
    if (!banco.properties['Prioridade']) propsToCreate['Prioridade'] = { select: {} };
    if (!banco.properties['Link']) propsToCreate['Link'] = { url: {} };
    if (!banco.properties['Responsável']) propsToCreate['Responsável'] = { rich_text: {} };
    if (!banco.properties['Data Alvo']) propsToCreate['Data Alvo'] = { date: {} };
    
    // Colunas de Arquitetura Base
    if (!banco.properties['Canal de Postagem']) propsToCreate['Canal de Postagem'] = { rich_text: {} }; 
    if (!banco.properties['Plataforma de Lançamento']) propsToCreate['Plataforma de Lançamento'] = { rich_text: {} }; 
    if (!banco.properties['Categoria do Card']) propsToCreate['Categoria do Card'] = { rich_text: {} }; 

    // COLUNAS VITAIS DO RELÓGIO (Garante que nunca darão erro de sincronização)
    if (!banco.properties['Status do Relógio']) propsToCreate['Status do Relógio'] = { select: {} };
    if (!banco.properties['Último Início']) propsToCreate['Último Início'] = { date: {} };
    if (!banco.properties['Fase Atual']) propsToCreate['Fase Atual'] = { select: {} };

    // MOTOR DE AUTO-CURA: Cria as colunas de "Tempo" para QUALQUER fase nova que você cadastrar
    const opcoesFases = banco.properties['Fase Atual']?.select?.options || [];
    const fases = opcoesFases.map((opt: any) => opt.name);
    if (fases.length === 0) fases.push("Pesquisa");

    fases.forEach((fase: string) => {
      const nomeColunaTempo = `Tempo ${fase}`;
      if (!banco.properties[nomeColunaTempo]) {
        propsToCreate[nomeColunaTempo] = { number: { format: "number" } };
      }
    });

    // Se faltou alguma coisa, o robô conserta o banco de dados na hora
    if (Object.keys(propsToCreate).length > 0) {
      await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
        method: "PATCH", headers, body: JSON.stringify({ properties: propsToCreate })
      });
    }

    const reqProjetos = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, { method: "POST", headers });
    const dadosProjetos = await reqProjetos.json();
    const todos = dadosProjetos.results || [];

    const calendario = todos.filter((p: any) => p.properties?.['Categoria do Card']?.rich_text?.[0]?.plain_text === 'AGENDAMENTO');
    const ideias = todos.filter((p: any) => p.properties?.['Categoria do Card']?.rich_text?.[0]?.plain_text === 'IDEIA');
    const projetos = todos.filter((p: any) => {
      const cat = p.properties?.['Categoria do Card']?.rich_text?.[0]?.plain_text;
      return cat !== 'AGENDAMENTO' && cat !== 'IDEIA';
    });

    return NextResponse.json({ projetos, calendario, ideias, fases });
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const corpo = await request.json();
    const payload: any = {
      parent: { database_id: process.env.NOTION_VIDEOS_DB_ID },
      properties: {
        "Nome": { title: [{ text: { content: corpo.nome || "Novo Projeto" } }] }
      }
    };

    if (corpo.isCalendar) {
      payload.properties["Categoria do Card"] = { rich_text: [{ text: { content: "AGENDAMENTO" } }] };
      if (corpo.rede) payload.properties["Plataforma de Lançamento"] = { rich_text: [{ text: { content: corpo.rede } }] };
      if (corpo.canal) payload.properties["Canal de Postagem"] = { rich_text: [{ text: { content: corpo.canal } }] };
      if (corpo.dataAlvo) payload.properties["Data Alvo"] = { date: { start: corpo.dataAlvo } };
    } else if (corpo.isIdea) {
      payload.properties["Categoria do Card"] = { rich_text: [{ text: { content: "IDEIA" } }] };
    } else {
      payload.properties["Categoria do Card"] = { rich_text: [{ text: { content: "PRODUCAO" } }] };
      payload.properties["Fase Atual"] = { select: { name: corpo.fase || "Pesquisa" } };
      payload.properties["Status do Relógio"] = { select: { name: "Parado" } };
      if (corpo.prioridade) payload.properties["Prioridade"] = { select: { name: corpo.prioridade } };
      if (corpo.link) payload.properties["Link"] = { url: corpo.link };
      if (corpo.responsavel) payload.properties["Responsável"] = { rich_text: [{ text: { content: corpo.responsavel } }] };
      if (corpo.observacoes) payload.properties["Observações"] = { rich_text: [{ text: { content: corpo.observacoes } }] };
      if (corpo.canal) payload.properties["Canal de Postagem"] = { rich_text: [{ text: { content: corpo.canal } }] };
      if (corpo.dataAlvo) payload.properties["Data Alvo"] = { date: { start: corpo.dataAlvo } };
    }

    const resposta = await fetch("https://api.notion.com/v1/pages", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return NextResponse.json(await resposta.json());
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const corpo = await request.json();
    const { pageId, properties, archived } = corpo;
    const payload: any = {};
    if (properties) payload.properties = properties;
    if (archived !== undefined) payload.archived = archived;

    const resposta = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return NextResponse.json(await resposta.json());
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const { novaFase } = await request.json();
    const dbId = process.env.NOTION_VIDEOS_DB_ID;
    const apiKey = process.env.NOTION_API_KEY;
    const headers = { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" };
    const reqBanco = await fetch(`https://api.notion.com/v1/databases/${dbId}`, { headers });
    const banco = await reqBanco.json();
    const opcoesAtuais = banco.properties['Fase Atual']?.select?.options || [];
    opcoesAtuais.push({ name: novaFase });

    await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: "PATCH", headers, body: JSON.stringify({ properties: { "Fase Atual": { select: { options: opcoesAtuais } }, [`Tempo ${novaFase}`]: { number: { format: "number" } } } })
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { faseParaDeletar } = await request.json();
    const dbId = process.env.NOTION_VIDEOS_DB_ID;
    const apiKey = process.env.NOTION_API_KEY;
    const headers = { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" };
    const reqBanco = await fetch(`https://api.notion.com/v1/databases/${dbId}`, { headers });
    const banco = await reqBanco.json();
    const opcoesAtuais = banco.properties['Fase Atual']?.select?.options || [];
    const novasOpcoes = opcoesAtuais.filter((opt: any) => opt.name !== faseParaDeletar);

    await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: "PATCH", headers, body: JSON.stringify({ properties: { "Fase Atual": { select: { options: novasOpcoes } }, [`Tempo ${faseParaDeletar}`]: null } })
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}