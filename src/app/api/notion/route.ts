import { NextResponse } from 'next/server';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VIDEOS_DB_ID = process.env.NOTION_VIDEOS_DB_ID;

const headers = {
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

export async function GET() {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_VIDEOS_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          property: 'Categoria do Card',
          rich_text: { does_not_equal: 'ARQUIVADO' }
        }
      }),
      cache: 'no-store'
    });

    const data = await response.json();
    const pages = data.results || [];
    
    const projetos = pages.filter((p: any) => !p.properties['Categoria do Card']?.rich_text?.[0]?.plain_text || p.properties['Categoria do Card']?.rich_text?.[0]?.plain_text === 'PRODUCAO');
    const calendario = pages.filter((p: any) => p.properties['Categoria do Card']?.rich_text?.[0]?.plain_text === 'AGENDAMENTO');
    const ideias = pages.filter((p: any) => p.properties['Categoria do Card']?.rich_text?.[0]?.plain_text === 'IDEIA');

    const fases = ["Pesquisa", "Roteiro", "Gravação", "Edição", "Revisão", "Capa", "Postado"];

    // A MÁGICA DO TEMPO: Enviando a hora absoluta do servidor para evitar conflitos de relógio
    return NextResponse.json({ projetos, calendario, ideias, fases, serverTime: Date.now() });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados do Notion' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let properties: any = { "Nome": { title: [{ text: { content: body.nome || "Novo Item" } }] } };

    if (body.workspace) properties["Workspace"] = { select: { name: body.workspace } };

    if (body.isCalendar) {
      properties["Categoria do Card"] = { rich_text: [{ text: { content: "AGENDAMENTO" } }] };
      if (body.dataAlvo) properties["Data Alvo"] = { date: { start: body.dataAlvo } };
      if (body.rede) properties["Plataforma de Lançamento"] = { rich_text: [{ text: { content: body.rede } }] };
      if (body.canal) properties["Canal de Postagem"] = { rich_text: [{ text: { content: body.canal } }] };
    } else if (body.isIdea) {
      properties["Categoria do Card"] = { rich_text: [{ text: { content: "IDEIA" } }] };
    } else {
      properties["Categoria do Card"] = { rich_text: [{ text: { content: "PRODUCAO" } }] };
      if (body.fase) properties["Fase Atual"] = { select: { name: body.fase } };
      if (body.prioridade) properties["Prioridade"] = { select: { name: body.prioridade } };
      if (body.link) properties["Link"] = { url: body.link };
      if (body.responsavel) properties["Responsável"] = { rich_text: [{ text: { content: body.responsavel } }] };
      if (body.observacoes) properties["Observações"] = { rich_text: [{ text: { content: body.observacoes } }] };
      if (body.canal) properties["Canal de Postagem"] = { rich_text: [{ text: { content: body.canal } }] };
      if (body.dataAlvo) properties["Data Alvo"] = { date: { start: body.dataAlvo } };
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST', headers, body: JSON.stringify({ parent: { database_id: NOTION_VIDEOS_DB_ID }, properties })
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { pageId, properties, archived } = body;
    const payload: any = {};
    if (properties) payload.properties = properties;
    if (archived !== undefined) payload.archived = archived;
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 }); }
}
