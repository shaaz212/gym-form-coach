# Gym Form Coach

On-device gym form coach for the phone camera. See `tasks/plan.md` for the plan and
`tasks/todo.md` for the task list.

## Commands

```
npm install      # once
npm run dev      # dev server (camera works on localhost; a phone needs https)
npm test         # unit tests
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build, including the service worker
npm run lint
npm run deploy   # build + upload to Cloudflare
```

## Deploy (Cloudflare)

Live at https://gym-form-coach.gym-form-coach.workers.dev (pose test page: `/bench`).

The site is a Cloudflare Worker that only serves static files: `wrangler.jsonc` points it at
`dist/`. Once per laptop run `npx wrangler login` (opens the browser to allow access); after
that `npm run deploy` builds and publishes.

The icons in `public/` are generated from `public/favicon.svg`:

```
npx pwa-assets-generator
```
