# IA Shorts — reconstrução em andamento

Painel reconstruído a partir da sessão autorizada do AutoShortz, sem acesso ao código privado. Ainda não há equivalência completa com o original.

## Executar localmente

Requer Node.js 22 ou superior e pnpm. Execute `pnpm install`, copie `.env.example` para `.env.local`, configure suas próprias chaves no arquivo local e execute `pnpm start`. Abra http://127.0.0.1:4173/dashboard/create. O servidor aceita somente conexões locais; não publicar diretamente na Internet.

Nunca envie `.env.local`, chaves ou arquivos de `data/` ao GitHub. As chaves são usadas exclusivamente pelo servidor.

## Implementado

- Assistente com seis etapas e séries persistidas.
- Integrações Gemini para roteiro estruturado e narração, fal.ai para imagens e Groq para transcrição com tempos.
- Fila local com prevenção de geração duplicada e registro explícito de falhas.
- MP4 vertical com imagens, movimento, narração, legendas e música personalizada opcional.
- Upload de MP3/WAV, acompanhamento dos vídeos, reprodução e download.
- FFmpeg incluído como dependência; `FFMPEG_PATH` permite escolher uma instalação própria.

## Verificação

`pnpm test`: seis testes passaram, incluindo montagem e decodificação de um MP4 usando FFmpeg real. Nesse teste os provedores são substituídos por respostas controladas. Nenhuma geração completa com as contas reais foi verificada ainda.

## Limitações e pendências

- As chaves ainda precisam ser configuradas e os provedores precisam de cota/saldo disponível.
- Modelos, prompts e correspondência das vozes originais não são públicos. Os modelos e vozes desta implementação são configuráveis; resultados não são garantidos como idênticos.
- A biblioteca musical original e suas prévias não foram obtidas. Música personalizada funciona; escolhas da biblioteca indisponível retornam erro explícito.
- Login, dados separados por usuário, cobrança/planos, armazenamento remoto, fila distribuída e suporte ainda não estão implementados.
- Renderização e fila são locais, em vez de AWS/Inngest. Ao reiniciar, trabalhos interrompidos são marcados como falha para evitar repetir chamadas pagas.
- Ícones, fontes, legendas e páginas secundárias ainda exigem comparação adicional. Logo e imagens dos estilos referenciam o site original; são necessários ativos autorizados para publicação.

Os fornecedores divulgados pelo serviço estão em https://autoshortz.com/privacidade. O fluxo público está descrito em https://autoshortz.com/termos.
