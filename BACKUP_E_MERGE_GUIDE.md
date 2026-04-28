# 🔧 Guia de Backup e Correção - Lead e People Sync

## 📋 Resumo das Alterações

### ✅ Problema Identificado
- **Leads e People não apareciam em aba anônima/incógnito**
- Dados não sincronizavam em tempo real entre abas
- Sem inscrição em eventos do Supabase em tempo real

### ✅ Solução Implementada

#### 1. **LeadContext.jsx** - Real-time Sync
```
✨ Adicionado:
- Real-time subscription ao Supabase (INSERT, UPDATE, DELETE)
- Função refreshLeads() para refresh manual
- Sincronização automática com localStorage
- Melhor tratamento de erros
```

#### 2. **Novo: PeopleContext.jsx**
```
✨ Criado contexto completo com:
- Real-time sync com tabela "people" do Supabase
- Organização por tipo: cliente, corretor, colaborador
- Função refreshPeople() para refresh manual
- Backup automático em localStorage
```

#### 3. **People.jsx** - Integração com Contexto
```
✨ Atualizado para:
- Usar PeopleContext em vez de apenas localStorage
- Botão de refresh para atualizar dados
- Sincronização com Supabase em tempo real
```

#### 4. **Leads.jsx** - Adicionado Refresh
```
✨ Novo:
- Botão de refresh com ícone RotateCcw
- Integração com refreshLeads()
```

---

## 🔄 Como Fazer Backup no GitHub

### 1️⃣ Verificar Status Atual
```bash
cd "c:\Users\yisra\Pictures\corretor-Andre_Barbosa\Stitch\stitch\stitch\real-estate-platform3\real-estate-platform3\real-estate-platform"

git status
git branch -a
```

### 2️⃣ Fazer Push da Branch para GitHub
```bash
# Enviar a branch fix/lead-and-people-sync
git push origin fix/lead-and-people-sync

# Verificar se foi criada remota
git branch -a
```

### 3️⃣ Criar Pull Request (PR) no GitHub
```
1. Abra: https://github.com/seu-usuario/seu-repo
2. Clique em "Compare & pull request" (deve aparecer após o push)
3. Configure:
   - Base: main (ou dev, dependendo da política)
   - Compare: fix/lead-and-people-sync
4. Adicione título e descrição:
   - Título: "Fix: Real-time sync for Leads and People"
   - Descrição: (veja template abaixo)
5. Clique em "Create pull request"
```

### 4️⃣ Template para Descrição do PR
```markdown
## 🎯 Descrição
Implementa sincronização em tempo real para Leads e People usando Supabase.

## 🐛 Problema
- Leads cadastrados não apareciam ao abrir a plataforma em aba anônima
- Mesmo problema para clientes, corretores e colaboradores
- Dados não sincronizavam entre abas diferentes

## ✅ Solução
- Adicionado real-time subscription ao Supabase
- Criado PeopleContext para sincronizar dados
- Implementado método refresh para atualização manual
- Dados persistem em localStorage como fallback

## 📝 Alterações
- `src/contexts/LeadContext.jsx` - Real-time sync
- `src/contexts/PeopleContext.jsx` - Novo contexto
- `src/components/Leads.jsx` - Botão de refresh
- `src/components/People.jsx` - Integração com contexto
- `src/App.jsx` - Adicionado PeopleProvider

## 🧪 Testado em
- ✓ Aba normal
- ✓ Aba anônima/incógnito
- ✓ Abas múltiplas
- ✓ Sem internet (fallback localStorage)

## ✨ Como testar
1. Abra a plataforma em modo normal
2. Cadastre um novo Lead/Pessoa
3. Abra em aba anônima/incógnito
4. Dados devem aparecer automaticamente
5. Clique em refresh se necessário
```

### 5️⃣ Fazer Merge da Branch (após aprovação)

#### Via GitHub UI (Recomendado)
```
1. No PR, clique em "Merge pull request"
2. Escolha opção:
   - "Create a merge commit" (recomendado)
   - "Squash and merge"
   - "Rebase and merge"
3. Confirme
4. Delete a branch remota (oferecido automaticamente)
```

#### Via Terminal (Alternativo)
```bash
# Atualizar main localmente
git checkout main
git pull origin main

# Fazer merge
git merge fix/lead-and-people-sync

# Fazer push
git push origin main

# Deletar branch local
git branch -d fix/lead-and-people-sync

# Deletar branch remota
git push origin --delete fix/lead-and-people-sync
```

---

## 💾 Estratégia de Backup Completo

### 1️⃣ Backup Regular (Semanal)
```bash
# Criar branch de backup
git checkout -b backup/$(date +%Y-%m-%d)

# Push do backup
git push origin backup/$(date +%Y-%m-%d)
```

### 2️⃣ Backup com TAG (Para versões estáveis)
```bash
# Criar tag
git tag -a v1.0.0 -m "Versão 1.0 - Leads e People sync"

# Push da tag
git push origin v1.0.0

# Listar tags
git tag -l
```

### 3️⃣ Backup do Banco Supabase

#### No Supabase Dashboard
```
1. Acesse: https://app.supabase.com
2. Seu projeto
3. Database → Backups
4. Clique em "Create a manual backup"
5. Nomeie: "leads-people-sync-v1"
```

#### Exportar dados (Backup Local)
```bash
# Via supabase CLI (instale se necessário)
npm install -g supabase

# Login
supabase login

# Exportar dados
supabase db pull

# Isso cria migration file localmente
```

---

## 🔐 Sincronizar fork com repositório original

Se você tem um fork:

```bash
# Adicionar remote do original
git remote add upstream https://github.com/original-owner/repo.git

# Fetch das mudanças do original
git fetch upstream

# Rebase branch atual com main do original
git rebase upstream/main

# Fazer push
git push origin fix/lead-and-people-sync --force-with-lease
```

---

## ✅ Checklist antes de commitar

- [ ] Códigos não têm erros de sintaxe
- [ ] Testes locais passam (se aplicável)
- [ ] Commits têm mensagens claras
- [ ] Branch está atualizada com main: `git pull origin main`
- [ ] Não há conflitos
- [ ] Variáveis de ambiente estão configuradas

---

## 🆘 Problemas Comuns

### Conflito de merge
```bash
# Ver arquivos com conflito
git status

# Resolver manualmente ou:
git merge --abort  # Cancelar merge
```

### Fazer push rejeitado
```bash
# Atualizar antes de fazer push
git pull origin fix/lead-and-people-sync

# Tentar novamente
git push origin fix/lead-and-people-sync
```

### Voltar para branch anterior
```bash
git checkout main
git reset --hard HEAD~1  # ⚠️ Cuidado: desfaz último commit
```

---

## 📊 Estructura de Branches no Projeto

```
main (produção)
├── dev (desenvolvimento)
│   ├── feature/add-property-types
│   └── fix/lead-and-people-sync ← VOCÊ ESTÁ AQUI
│
├── cloudflare/workers-autoconfig
└── backup/* (backups de segurança)
```

---

## 🚀 Próximos Passos

1. ✅ Branch criada: `fix/lead-and-people-sync`
2. ✅ Código commitado
3. ⏭️ Fazer push: `git push origin fix/lead-and-people-sync`
4. ⏭️ Criar PR no GitHub
5. ⏭️ Aguardar revisão
6. ⏭️ Merge para main
7. ⏭️ Delete branch local após merge

---

## 📱 Commands Rápidos

```bash
# Status
git status

# Ver branches
git branch -a

# Ver commits recentes
git log --oneline -10

# Ver mudanças não commitadas
git diff

# Stash (guardar mudanças temporariamente)
git stash
git stash pop

# Rebase interativo (reorganizar commits)
git rebase -i HEAD~3
```

---

**Criado em:** 27/04/2026
**Projeto:** Real Estate Platform - André Barbosa
**Status:** ✅ Pronto para produção
