# Grove Login and Registration

Responsive Thai-language account screen built with Vue 3, TypeScript, Express, and MySQL.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Create a production build with `npm run build`.

## Run with Docker Desktop

Make sure Docker Desktop is running. Optionally copy `.env.example` to `.env` and replace the local development values, then start the services from this folder:

```sh
docker compose up --build -d
```

Open http://localhost:8082. Stop the services with `docker compose down`. The MySQL data remains in the `mysql_data` volume.

## Accounts and data

The registration form stores first name, last name, username, email, phone number, a bcrypt password hash, and creation time in the MySQL `users` table. Username and email are unique. Login uses the registered email and password; successful registration or login creates an HttpOnly session cookie.

MySQL is available from this computer at `127.0.0.1:3307` and is bound to loopback only. In MySQL Workbench, use hostname `127.0.0.1`, port `3307`, username `grove_app`, and schema `grove`; use the `MYSQL_PASSWORD` value from `.env` (or `grove-local-password` when using the local fallback). Local fallback credentials and `COOKIE_SECURE=false` are for development only. Set strong values in `.env`, use HTTPS with `COOKIE_SECURE=true`, and review the deployment configuration before exposing this app publicly.
"# Vue2" 
