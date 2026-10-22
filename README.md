# Import Auto MG

Application React + TypeScript + Vite pour estimer les coûts d'importation de véhicules à Madagascar.

## Prérequis
- Node.js 20+
- npm

## Développement
```bash
npm install
npm run dev
```

## Vérification et build
```bash
npm run typecheck
npm run test:run
npm run build
```

Le dossier de production généré est `dist/`.

## Déploiement Vercel
Le projet utilise Vite et est configuré via `vercel.json`. Avec le dépôt Git connecté à Vercel, les pushes sur `main` déclenchent un déploiement de production et les pushes sur les autres branches peuvent créer des previews.
