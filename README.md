# IA Shorts — reconstrução em andamento

Esta versão é uma prévia local do painel observado em 10/10/2026. **Não é uma cópia completa e não gera vídeos ainda.** A interface foi reconstruída a partir da sessão autorizada do navegador, sem acesso ao código privado do AutoShortz.

## Executar

Requer Node.js 22 ou superior. Execute `node server.mjs` e abra http://127.0.0.1:4173/dashboard/create.

As seis etapas têm validação, navegação de ida e volta e criação de séries persistida em `data/series.json`. Não há dependências externas para a prévia. O servidor é restrito ao computador local; não publicar esse servidor de desenvolvimento na Internet.

## Escopo verificado

- Nichos predefinidos e personalizado, roteiro de exemplo e limites de caracteres.
- Português, inglês e espanhol; cinco nomes de voz observados.
- Seleção múltipla de músicas e entrada de arquivo de áudio.
- Nove estilos visuais, cinco estilos de legenda, duas durações.
- Navegação para Vídeos, Guias, Fale Conosco e Configurações.

## Pendente para equivalência funcional

- Login Google, Supabase, isolamento dos dados por usuário e políticas de acesso.
- Gemini: roteiro e narração. Os modelos, prompts e identificadores das vozes originais não são públicos; os nomes Rafael/Heitor/etc. não identificam por si só vozes do Gemini.
- fal.ai: imagens; modelo e parâmetros originais não identificados.
- Groq: transcrição e marcação temporal das legendas.
- Renderização AWS, armazenamento de arquivos, downloads e fila Inngest.
- Upload persistente e biblioteca/prévias de músicas; requerem os arquivos licenciados do projeto.
- Cobrança Stripe, limites por plano e suporte com Resend.
- Guia em vídeo, imagens de legenda e telas pós-criação precisam de inspeção adicional. A lista local de séries é provisória e não foi verificada contra a tela original pós-criação.
- Interface aproximada: ícones, fontes, prévias de legendas e algumas páginas não são idênticos. Imagens de estilo e logo são referências externas do original, não ativos próprios; substituir por arquivos autorizados antes de publicar.

As operações sem integração respondem com erro explícito; nenhum vídeo ou envio é simulado. A conta pessoal vista no navegador não foi incluída no código.

Provedores divulgados pelo próprio serviço: https://autoshortz.com/privacidade. O modelo funcional descrito é escolher, gerar e baixar/postar manualmente: https://autoshortz.com/termos.

**Credenciais:** não colocar chaves em commits, HTML, JavaScript do navegador ou mensagens de chat. A configuração real será feita no ambiente do servidor depois da conexão segura das contas.
