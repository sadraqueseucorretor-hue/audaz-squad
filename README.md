# AUDAZ SQUAD — Central de Empreendimentos

Catálogo público para corretores consultarem os materiais comerciais dos empreendimentos,
com painel admin (`/#/admin`) para cadastrar empreendimentos, books, tabelas, fotos e trocar a logo.
React 18 + Vite + React Router + Firebase (Auth, Firestore e Storage).

## Firebase

1. Preencha `src/data/firebaseConfig.js` com as credenciais do app Web do projeto Firebase.
2. Ative **Authentication → E-mail/senha** e crie o usuário admin.
3. Crie o **Firestore** e publique as regras de `firestore.rules`.
4. (Opcional, plano Blaze) Ative o **Storage** e publique `storage.rules` para enviar **fotos** pelo painel.
   Os materiais (books, tabelas, plantas…) não usam o Storage: são cadastrados por link (Google Drive etc.).

Sem credenciais, o site mostra os dados de exemplo de `src/data/empreendimentos.js`.
No painel, com o banco vazio, o botão "Importar empreendimentos de exemplo" copia esses dados para o Firestore.

## Publicar código no GitHub Pages

`npm run build` gera a pasta `/docs`, publicada pelo GitHub Pages (Settings → Pages → branch `main`, pasta `/docs`).
Conteúdo (empreendimentos, materiais, logo) não precisa de build: o painel grava direto no Firebase.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm run build    # gera /dist pronto para publicar (Vercel, Netlify, GitHub Pages, S3...)
```

As rotas usam hash (`/#/empreendimento/vista-do-parque`), então `/dist` funciona em qualquer hospedagem estática
sem configurar redirects. Para URLs sem `#`, troque `HashRouter` por `BrowserRouter` em `src/App.jsx` e configure o rewrite para `index.html`.

## Estrutura

```
src/
├─ data/                      ← TUDO que muda com frequência
│  ├─ empreendimentos.js      ← lista de empreendimentos e seus materiais
│  ├─ tiposMateriais.js       ← categorias de material (ordem, nome, ícone)
│  └─ config.js               ← textos da marca, status e limite de "Atualizados recentemente"
├─ utils/
│  ├─ format.js               ← preço (BRL), data/hora, tempo relativo, busca sem acento
│  ├─ empreendimentos.js      ← busca, filtros, últimas atualizações
│  ├─ urls.js                 ← validação/sanitização de links (só https; bloqueia javascript:, data:, HTML)
│  ├─ drive.js                ← links do Google Drive/Docs → ID + URL de preview
│  └─ materiais.js            ← como exibir cada link, compatibilidade com o formato antigo, agrupamento
├─ components/                ← componentes reutilizáveis
│  ├─ Logo, Icon, SmartImage, StatusBadge
│  ├─ SearchBar, FilterChips
│  ├─ EmpreendimentoCard, RecentesSection
│  ├─ InfoGrid, MaterialCard, MaterialsSection
│  ├─ VisualizadorMaterial    ← modal que abre o material dentro do site (com fallback)
│  └─ ShareButton, Footer
├─ pages/
│  ├─ Home.jsx                ← hero, busca, filtros, atualizados recentemente, grade
│  └─ Empreendimento.jsx      ← banner, informações, materiais comerciais
└─ styles/
   ├─ tokens.css              ← paleta e variáveis de design
   └─ global.css              ← estilos mobile-first (breakpoints 640px e 1024px)
```

## Tarefas comuns

**Adicionar um empreendimento** — copie um objeto em `src/data/empreendimentos.js`, troque o `slug` (único, sem espaços) e os campos.

**Materiais do empreendimento** — cadastrados no painel (Admin → Editar → *Materiais do empreendimento*) só por **link**:
o arquivo continua no Google Drive (ou outro serviço https) e o sistema guarda apenas os metadados.
No Drive: arquivo → **Compartilhar** → "Qualquer pessoa com o link" → **Copiar link**, e cole no painel —
o sistema converte sozinho para o modo de pré-visualização (`/preview`).

Cada material fica em `materiaisLista` no documento do empreendimento:

```js
{ id, empreendimentoId, titulo, categoria, urlOriginal, urlPreview, tipoOrigem, ordem, ativo, createdAt, updatedAt }
// tipoOrigem: 'google_drive' | 'external_url' | 'video' | 'image' | 'outro'
```

- Inativos não aparecem para o corretor. `updatedAt` vira "Atualizada em…" e alimenta **Atualizados recentemente**.
- Empreendimentos salvos antes desse modelo (campo `materiais` agrupado por tipo) continuam aparecendo;
  ao salvar pelo painel, passam para `materiaisLista` automaticamente.
- Ao clicar, o material abre num visualizador dentro do site (`?material=<id>` na URL). Sites que não permitem
  exibição embutida abrem pelo botão "Abrir em nova aba" — nunca fica tela branca sem explicação.

**Nova categoria de material** — adicione em `CATEGORIAS_MATERIAL` (`src/data/tiposMateriais.js`); a ordem do array é a ordem na página.

**Logo oficial** — coloque o arquivo em `/public` (ex.: `public/logo.svg`) e defina `logoUrl: './logo.svg'` em `src/data/config.js`.

**Cores** — paleta em `src/styles/tokens.css` (`--vermelho #F20530`, `--vinho #A60A33`, `--azul #021D40`, `--azul-noite #011126`, `--gelo #F2F2F2`).

## Comportamentos

- Busca por nome, bairro, cidade ou construtora, sem diferenciar acento/maiúsculas.
- Busca e filtros ficam na URL (`?q=&status=&cidade=`): o corretor volta da página do empreendimento sem perder a pesquisa e pode compartilhar o link já filtrado.
- Imagens com lazy-load e fallback com as iniciais caso a URL quebre.
- Botão **Compartilhar** usa o menu nativo do celular (WhatsApp etc.); no desktop copia o link.

## Próximos passos sugeridos

- Trocar os dados mockados (URLs `example.com` e fotos Unsplash) pelos reais.
- Se a equipe quiser editar sem mexer em código: ler `empreendimentos` de uma planilha Google publicada como CSV/JSON ou de um CMS headless, mantendo o mesmo formato de objeto.
