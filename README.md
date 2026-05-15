# Orion Gestão

Sistema corporativo de gestão de pessoas em Português, portado para **Vite + React 18**.

Sistema completo com autenticação, dashboard, funcionários, documentos, controle de ponto, justiça (PDF/A4), auditoria, relatórios, configurações e um painel de tweaks (cor primária, tema claro/escuro, raio dos cantos, densidade).

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

Para build de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
orion-app/
├── index.html                  # Vite entry, importa Google Fonts
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                # ReactDOM root
    ├── App.jsx                 # Composição: routing, theme, auth, toasts
    │
    ├── styles/
    │   └── global.css          # Design tokens, dark mode, print A4, tweaks panel CSS
    │
    ├── lib/
    │   └── color.js            # darken / hexToRgba / isLight
    │
    ├── hooks/
    │   └── useTweaks.js        # State + localStorage persistence
    │
    ├── data/
    │   └── mock.js             # Funcionários, documentos, atividades, etc.
    │
    ├── components/
    │   ├── Icon.jsx            # ~50 ícones SVG stroke
    │   ├── Avatar.jsx          # Avatar OKLCH com gradiente
    │   ├── OrionGlyph.jsx      # Logo (anéis concêntricos)
    │   ├── Sidebar.jsx         # Navegação lateral com sub-items
    │   ├── Header.jsx          # Top bar: breadcrumbs, busca, tema, notif
    │   ├── CommandPalette.jsx  # Cmd/Ctrl+K busca global
    │   ├── NotificationsPanel.jsx
    │   ├── Toasts.jsx          # Container de toasts
    │   └── TweaksPanel.jsx     # Painel flutuante de customização
    │
    └── screens/
        ├── Auth.jsx            # LoginScreen + InviteScreen
        ├── Dashboard.jsx       # KPIs, gráficos, atividade, alertas
        ├── Employees.jsx       # Lista + perfil (8 abas)
        ├── Documents.jsx       # Drive-like, drag-drop, categorias
        ├── Justice.jsx         # Templates + form + preview A4 imprimível
        └── Other.jsx           # Time, Permissions, Audit, Reports, NewEmployee, Settings, Placeholder
```

## Atalhos

- `Ctrl/Cmd + K` — abre a busca global
- `Esc` — fecha overlays
- Tema claro/escuro: botão de sol/lua no header **ou** no painel de Tweaks
- Cor primária e densidade: painel de Tweaks (canto inferior direito)

## Impressão A4 (Justiça)

A tela **Justiça** gera documentos com letterhead, cláusulas, assinaturas e testemunhas.
- `Pré-visualizar` mostra a página A4 (210mm × 297mm com margens de 18mm)
- `Imprimir / PDF` chama `window.print()` com `@page A4` configurado, escondendo sidebar/header

## Personalização

O painel de Tweaks persiste no `localStorage` (chave `orion.tweaks.v1`). Para limpar:

```js
localStorage.removeItem('orion.tweaks.v1');
```

## Tecnologias

- React 18.3 (Hooks, sem libs externas)
- Vite 5
- CSS variables + `oklch()` para avatares
- SVG inline para ícones e gráficos (sem deps)
- `Manrope` + `JetBrains Mono` + `Space Grotesk` (Google Fonts)
