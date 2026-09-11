# cmd-automator

Um app de desktop leve (Tauri + React) pra automatizar a inicialização de múltiplos processos de linha de comando — por exemplo, subir vários projetos Node ao mesmo tempo (`npm run dev`, `npm run start:dev`, etc.), cada um na sua pasta, cada um com um terminal de verdade que você pode acompanhar e interagir.

Nasceu da necessidade de subir 4 projetos locais (frontend, checkout, backend, members) de uma vez sem precisar abrir manualmente um terminal em cada pasta e digitar o comando toda vez.

## Como funciona

- **Automações**: você cria uma automação com um nome e uma lista de **passos**. Cada passo tem um **diretório** e um **comando** (ex: `C:\projetos\meu-app` + `npm run dev`). Uma automação pode ter quantos passos você quiser.
- **Persistência**: as automações ficam salvas localmente (arquivo JSON na pasta de dados do app) e continuam lá entre reinícios.
- **Iniciar**: ao clicar em "Iniciar" numa automação, todos os passos rodam **ao mesmo tempo**, cada um em uma aba própria na tela de **Logs**.
- **Terminal de verdade**: cada aba não é só um log — é um pseudo-terminal real (PTY). Dá pra clicar na aba e digitar normalmente: `Ctrl+C` pra matar o processo, `r` pra reiniciar um dev server do Vite, ou qualquer outro comando.
- **Terminal livre**: além das abas de automação, dá pra abrir um terminal solto (sem comando pré-definido) clicando no "+" na barra de abas.

## Stack técnica

- **Backend**: [Tauri 2](https://tauri.app/) (Rust) + [`portable-pty`](https://docs.rs/portable-pty) para os terminais reais (usa ConPTY no Windows, PTY nativo no Linux/macOS).
- **Frontend**: React + TypeScript + Vite + [`xterm.js`](https://xtermjs.org/) para renderizar os terminais (o mesmo motor usado no terminal integrado do VS Code).
- Sem Electron — o app usa o WebView do próprio sistema operacional (WebView2 no Windows, WebKitGTK no Linux, WKWebView no macOS), o que deixa o instalador bem menor.

## Pré-requisitos

Precisa ter instalado, em qualquer sistema:

- [Node.js](https://nodejs.org/) 18+ e npm
- [Rust](https://www.rust-lang.org/tools/install) (via `rustup`, toolchain `stable`)

E as dependências nativas específicas de cada sistema operacional (necessárias pro Tauri compilar):

### Windows

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (workload "Desktop development with C++") — fornece o linker MSVC que o Rust precisa.
- WebView2 Runtime — já vem instalado por padrão no Windows 10/11.

### macOS

- Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Linux

Dependências de sistema (exemplo Debian/Ubuntu):

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

(Em distros baseadas em Fedora/Arch, troque pelo gerenciador de pacotes equivalente — ver a [lista oficial de pré-requisitos do Tauri](https://tauri.app/start/prerequisites/)).

## Instalação

```bash
git clone https://github.com/matheusmanuel2/cmd-automator.git
cd cmd-automator
npm install
```

## Rodando em modo desenvolvimento

```bash
npm run tauri dev
```

Isso sobe o Vite (frontend) e compila/roda o backend Rust, abrindo a janela do app. A primeira execução demora mais porque o Cargo precisa compilar todas as dependências Rust do zero; nas próximas é bem mais rápido (build incremental).

## Buildando para produção

O comando abaixo gera o binário/instalador nativo da plataforma em que ele é executado (o Tauri não faz cross-compile por padrão — para gerar o instalador de Windows, rode em uma máquina Windows; para macOS, em uma Mac; para Linux, em Linux):

```bash
npm run tauri build
```

Os artefatos finais ficam em `src-tauri/target/release/bundle/`:

| Plataforma | Artefatos gerados |
|---|---|
| Windows | `.msi` (instalador) e `.exe` (NSIS), em `bundle/msi/` e `bundle/nsis/` |
| macOS | `.app` e `.dmg`, em `bundle/macos/` e `bundle/dmg/` |
| Linux | `.deb`, `.rpm` e/ou `.AppImage`, em `bundle/deb/`, `bundle/rpm/`, `bundle/appimage/` |

O binário "solto" (sem instalador), útil pra testar rápido, fica em `src-tauri/target/release/cmd-automator` (ou `cmd-automator.exe` no Windows).

## Estrutura do projeto

```
cmd-automator/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── automations/    # Lista, formulário e edição de passos das automações
│   │   └── run/             # Tela de Logs: abas de terminal (xterm.js)
│   ├── hooks/
│   │   ├── useAutomations.ts  # CRUD de automações
│   │   └── usePtySession.ts   # Liga um terminal xterm.js a uma sessão PTY do backend
│   └── api/                 # Chamadas tipadas para os comandos do Tauri
└── src-tauri/               # Backend (Rust)
    └── src/
        ├── pty_manager.rs   # Gerencia os terminais reais (spawn, escrita, resize, kill)
        ├── automations.rs   # Modelo de dados + persistência em JSON
        └── commands.rs      # Comandos expostos ao frontend
```

## Onde ficam os dados salvos

As automações são salvas em `automations.json` na pasta de dados do app:

- **Windows**: `%APPDATA%\com.admin.cmd-automator\`
- **macOS**: `~/Library/Application Support/com.admin.cmd-automator/`
- **Linux**: `~/.local/share/com.admin.cmd-automator/`
