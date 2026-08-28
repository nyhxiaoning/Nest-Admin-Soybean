# Creator Center Vite API Proxy Design

## Goal

Use a same-origin `/api` base URL during local Creator Center development so browser requests are forwarded by Vite to the local Nest server without CORS restrictions.

## Design

- Set `VITE_API_URL_NEW` to `/api`; Axios continues using the existing environment variable.
- Add `VITE_API_PROXY_TARGET` for the local Nest address, defaulting in `.env.development` to `http://127.0.0.1:8080`.
- Configure the Vite development server to proxy `/api` to that target without rewriting the path.
- Keep QA, staging, and production build behavior unchanged because Vite's `server.proxy` only applies to the development server.

## Verification

Run the Creator Center development-mode build to verify that the environment and Vite configuration load successfully. At runtime, `/api/creator/uploads/images` should be received by Nest as the same path.
