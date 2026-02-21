# 🏠 André Barbosa - Plataforma Imobiliária

Sistema completo PWA para corretores de imóveis com painel administrativo, cadastro de imóveis com fotos e vídeos, gestão de leads e landing page pública.

## 🚀 Como Rodar

```bash
npm install
npm run dev
```

Acesse: **http://localhost:5173**

## 📱 Telas do Sistema

| Rota | Função |
|------|--------|
| `/` | Dashboard com KPIs, funil de vendas |
| `/properties` | Lista de imóveis com filtros |
| `/properties/new` | Cadastrar novo imóvel |
| `/properties/edit/:id` | Editar imóvel |
| `/properties/:id` | Detalhes do imóvel |
| `/leads` | Gestão de leads (CRM básico) |
| `/kaleb` | Assistente IA (chat simulado) |
| `/settings` | Configurações + Manual |
| `/website` | Landing page pública |
| `/login` | Tela de login do corretor |

## 🔐 Login de Teste

- **Email:** `andre@barbosa.com`
- **Senha:** `admin`

## 📸 Como Cadastrar Imóvel com Fotos e Vídeo

1. Vá em **Imóveis** → clique em **+ Novo**
2. Preencha título, tipo, preço, quartos etc.
3. Clique em **"Adicionar Fotos"** e selecione do computador
4. Cole o **link do YouTube** no campo de vídeo
5. Clique em **Salvar Imóvel**

## ✏️ Como Editar Textos e Fotos

1. Na lista de imóveis, clique no **ícone de lápis** (✏️) no card
2. Ou acesse os detalhes do imóvel e clique no **botão de editar**
3. Altere qualquer campo e clique em **Atualizar**
4. Para remover fotos: passe o mouse sobre a foto e clique na **lixeira** 🗑️
5. Para definir a capa: passe o mouse e clique no **ícone de imagem** 🖼️

## 🏷️ Como Trocar o Logo

1. Vá em **Config** (menu inferior)
2. Na seção "Identidade Visual", clique em **"Enviar Logo"**
3. Selecione a imagem do seu logo (PNG transparente recomendado)
4. Clique em **"Salvar Alterações"**
5. O logo substituirá o texto "André Barbosa" no canto superior esquerdo

## 🎨 Como Mudar a Cor do Sistema

1. Vá em **Config** → seção "Identidade Visual"
2. Clique no seletor de **Cor Primária** e escolha a cor desejada
3. Clique em **"Salvar Alterações"**

## 📞 Configurar WhatsApp e Redes Sociais

1. Vá em **Config** → seção "Identidade Visual & Contato"
2. Preencha o número de WhatsApp (formato: `5581999999999`)
3. Adicione URLs do Instagram e LinkedIn
4. **Salvar Alterações**

## 🚀 Deploy na Vercel (Grátis)

```bash
# 1. Instalar Vercel CLI (uma vez)
npm i -g vercel

# 2. Fazer deploy
vercel

# 3. Aceitar as configurações padrão (Enter, Enter, Enter)

# 4. Para production
vercel --prod
```

O site ficará disponível em algo como: `https://seu-site.vercel.app`

## 📂 Estrutura do Projeto

```
real-estate-platform/
├── public/           # Arquivos estáticos (manifest, SW, profile.jpg)
├── src/
│   ├── components/   # Componentes React
│   │   ├── public/   # Landing page pública  
│   │   ├── Dashboard.jsx
│   │   ├── PropertyList.jsx
│   │   ├── PropertyForm.jsx    # Cadastro/Edição com upload de fotos
│   │   ├── PropertyDetails.jsx # Galeria, vídeo embed, PDF
│   │   ├── PropertyCard.jsx
│   │   ├── Leads.jsx           # CRM com WhatsApp/Ligar
│   │   ├── LLMAssistant.jsx    # Chat IA
│   │   ├── Settings.jsx        # Configs + Manual
│   │   ├── Login.jsx
│   │   └── Navigation.jsx
│   ├── contexts/     # Estado global (PropertyContext)
│   ├── data/         # Dados mock iniciais
│   ├── App.jsx       # Rotas
│   ├── main.jsx      # Entry point
│   └── index.css     # Estilos globais + animações
├── index.html        # PWA com manifest
├── vercel.json       # Config para deploy
└── vite.config.js
```

## ⚠️ Notas Importantes

- Os dados são salvos no **localStorage** do navegador
- Não há banco de dados backend — ideal para demonstração e uso pessoal
- Fotos são armazenadas como **base64** no localStorage (limite ~5MB total)
- Para produção com muitas fotos, considere integrar um serviço de armazenamento como Firebase Storage ou Cloudinary
