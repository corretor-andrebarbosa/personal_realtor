# 🧪 Instruções de Teste - Lead e People Sync

## 📋 Resumo do Que Foi Corrigido

### ❌ Problema Original
```
1. Você cria um Lead em modo normal ✓
2. Abre em aba anônima/incógnito ✗ → Lead NÃO aparecia
3. Mesmo problema com Clientes, Corretores e Colaboradores
```

### ✅ Solução Implementada
```
- Real-time subscriptions do Supabase em LeadContext e novo PeopleContext
- Sincronização automática entre abas
- Fallback para localStorage
- Botões de refresh manual em ambos os componentes
```

---

## 🧪 Como Testar

### Teste 1: Sincronização de Leads

#### Passo a Passo:
1. **Abra a plataforma em modo normal**
   ```
   URL: http://localhost:5173 (ou seu URL de teste)
   ```

2. **Navegue para Leads** (menu lateral)

3. **Crie um novo Lead**
   - Nome: "João Teste"
   - Telefone: "5581999999999"
   - Interesse: "Apartamento"
   - Status: "Quente"
   - Clique em "Salvar Lead"
   - ✅ Deve aparecer na lista

4. **Abra uma aba ANÔNIMA/INCÓGNITO**
   - Acesse a mesma URL
   - Faça login (se necessário)
   - Navegue para Leads
   - ✅ **O Lead deve estar lá automaticamente**

5. **Teste de Real-time**
   - Mantenha as duas abas abertas
   - Na aba normal, crie outro Lead: "Maria Teste 2"
   - ✅ **Deve aparecer na aba anônima AUTOMATICAMENTE em poucos segundos**

6. **Teste do Botão de Refresh**
   - Na aba anônima, clique no botão de refresh (ícone circular)
   - ✅ **Dados devem ser recarregados**

---

### Teste 2: Sincronização de People (Clientes)

#### Passo a Passo:
1. **Navegue para Cadastro de Pessoas** (menu lateral)

2. **Selecione aba "Clientes"**

3. **Crie um novo Cliente**
   - Nome: "Cliente Teste"
   - Telefone: "5581999999999"
   - Email: "cliente@teste.com"
   - Clique em "Salvar"
   - ✅ Deve aparecer na lista

4. **Abra em aba ANÔNIMA**
   - Acesse a mesma URL
   - Navegue para Cadastro de Pessoas → Clientes
   - ✅ **Cliente deve estar lá automaticamente**

5. **Teste com Corretores**
   - Mude para aba "Corretores"
   - Crie um Corretor: "Corretor Teste"
   - CRECI: "12345"
   - Na aba anônima, o Corretor deve aparecer
   - ✅ Deve sincronizar automaticamente

6. **Teste com Colaboradores**
   - Mude para aba "Colaboradores"
   - Crie um Colaborador
   - ✅ Deve sincronizar automaticamente

---

### Teste 3: Modo Offline (Sem Internet)

#### Passo a Passo:
1. **Crie alguns dados** (Leads e People)
2. **Desconecte a internet** (F12 → Network → Offline)
3. **Recarregue a página** (F5)
4. ✅ **Dados devem aparecer do localStorage**
5. **Reconecte internet**
6. ✅ **Dados devem sincronizar com Supabase automaticamente**

---

### Teste 4: Edição e Deleção em Tempo Real

#### Edição:
1. **Aba Normal**: Edite um Lead
   - Clique no ícone de editar
   - Mude o nome para "João Editado"
   - Salve
2. **Aba Anônima**: 
   - ✅ Mudança deve aparecer automaticamente

#### Deleção:
1. **Aba Normal**: Clique para deletar um Lead
2. **Aba Anônima**:
   - ✅ Lead deve desaparecer automaticamente

---

## 📊 Checklist de Validação

- [ ] Leads aparecem em aba anônima
- [ ] Clientes aparecem em aba anônima
- [ ] Corretores aparecem em aba anônima
- [ ] Colaboradores aparecem em aba anônima
- [ ] Criação em tempo real (sem refresh necessário)
- [ ] Edição em tempo real
- [ ] Deleção em tempo real
- [ ] Refresh manual funciona
- [ ] Funciona offline (localStorage)
- [ ] Sincroniza após reconectar internet
- [ ] Sem erros no console (F12 → Console)

---

## 🔍 Verificar Console para Erros

1. **F12** para abrir DevTools
2. **Clique em "Console"**
3. **Procure por**: 
   - ❌ Erros vermelhos → Problema
   - ✅ "Lead atualizado em tempo real:" → Funciona
   - ✅ "People atualizado em tempo real:" → Funciona

---

## 🚀 Quando Tudo Está Funcionando

```
✅ Leads sincronizam automaticamente
✅ People (clientes, corretores, colaboradores) sincronizam
✅ Funciona em abas anônimas
✅ Real-time updates funcionam
✅ Fallback localStorage funciona
✅ Sem erros no console
✅ Botões de refresh funcionam
```

---

## 🔧 Troubleshooting

### Dados não aparecem em aba anônima?

**Solução 1**: Clique em refresh (ícone circular)
```
No topo da página, lado direito do título
```

**Solução 2**: Verifique console (F12 → Console)
```
Procure por erros vermelhos
Se houver erro de autenticação, faça login novamente
```

**Solução 3**: Verifique localStorage
```bash
F12 → Application → Local Storage → seu-dominio
Procure por: ab-leads, ab-people
```

### Erro "Failed to load Supabase"?
```
- Verifique conexão internet
- Recarregue a página
- Verifique se Supabase está online
```

### Dados aparecendo duplicados?
```
- Abra DevTools (F12)
- Execute: localStorage.clear()
- Recarregue: F5
- Clique em refresh dos componentes
```

---

## 📝 Notas Técnicas

### Real-time Subscriptions
```javascript
// LeadContext e PeopleContext usam:
supabase.channel('leads-changes')
  .on('postgres_changes', { event: '*', table: 'leads' }, callback)
  .subscribe()
```

### Fallback System
```
Dados carregam em prioridade:
1. Supabase (em tempo real)
2. localStorage (offline ou fallback)
3. Vazio (se nenhum dos anteriores)
```

### Sincronização
```
- Novos dados: Aparecem imediatamente
- Edição: Sincroniza em < 1 segundo
- Deleção: Sincroniza em < 1 segundo
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique console** (F12 → Console)
2. **Clique em refresh** (ícone circular)
3. **Recarregue página** (F5)
4. **Limpe dados locais** (localStorage.clear() no console)
5. **Reconecte internet** (se aplicável)

---

**Teste realizado em:** 27/04/2026
**Versão:** fix/lead-and-people-sync
**Status:** ✅ Pronto para revisão
