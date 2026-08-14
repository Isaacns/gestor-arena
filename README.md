# Gestor Arena

Plataforma de gestão do ecossistema de arenas esportivas — **produto VIZIO / INPERSON**.
Frontend **React + TypeScript + Vite** sobre backend **Supabase** (Postgres, RLS, RPCs). Deploy estático no **GitHub Pages** via GitHub Actions.

- Produção: **https://arena.viziostudio.com.br**
- Fonte de trabalho: `Projects/VIZIO/Gestor Arena/web` (este repo é o de deploy).
- Backend/migrations: `Projects/VIZIO/Gestor Arena/supabase/migrations` (0001→0010).

## Publicar (uma vez)
1. Crie um repositório público `gestor-arena` na conta `Isaacns` no GitHub (vazio, sem README).
2. `git push` deste diretório para ele (a credencial do Git Credential Manager cobre o push).
3. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. DNS no registro.br (zona `viziostudio.com.br`): registro **CNAME** · host **arena** · valor **isaacns.github.io**.
5. Aguarde o Action `Deploy (GitHub Pages)` concluir e o certificado HTTPS provisionar.

Depois disso, **todo `git push` na `main` republica sozinho** (build + deploy pela Action).

## Dev local
```
npm install
npm run dev
```
Chave publishable (anon) de produção fica em `.env.production` (versionada — é segura, vai no bundle do cliente). Para dev local crie um `.env` (gitignored) se quiser apontar para outro projeto.

## Build
```
npm run build   # tsc estrito + vite → dist/
```
