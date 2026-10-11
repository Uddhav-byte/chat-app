# Nexus Chat 💬

[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Supabase](https://img.shields.io/badge/Database%20%26%20Auth-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

> A high-performance, real-time messaging platform built with **React 19**, **Supabase** (PostgreSQL, Realtime, & Auth), and deployed globally on **Cloudflare Pages**.

---

## 🌐 Live Demo & Deployment

- **GitHub Repository**: [https://github.com/Uddhav-byte/chat-app](https://github.com/Uddhav-byte/chat-app)
- **Live Deployment**: Deployable on **Cloudflare Pages** at `https://<your-project>.pages.dev` (follow setup below)

---

## ✨ Features

- **⚡ Instant Real-Time Messaging**: Low-latency message replication powered by Supabase Realtime Postgres Changes.
- **🟢 Live Online Presence**: Track currently online and active users in real time.
- **⌨️ Live Typing Indicators**: Realtime broadcast channel indicates when users are actively composing messages.
- **🔐 Secure Authentication**: User registration, login, and session persistence powered by Supabase Auth with Row Level Security (RLS).
- **🏠 Dynamic Chat Rooms**: Create, join, and browse chat rooms with live member counts.
- **🎨 Glassmorphic Dark UI**: Modern dark theme with CSS backdrop blur, fluid animations, and mobile-responsive drawer.
- **🚀 100% Serverless & Free**: Zero server maintenance required. Runs directly from Cloudflare's global edge network.

---

## 🏛️ System Architecture

```
                    +-----------------------------------+
                    |      Cloudflare Pages (Global)    |
                    |   React 19 + Vite (Nexus Chat)    |
                    +-----------------+-----------------+
                                      |
               +----------------------+----------------------+
               |                                             |
               v                                             v
  +-------------------------+                   +-------------------------+
  |      Supabase Auth      |                   |    Supabase Realtime    |
  | - JWT Session Token     |                   | - Postgres CDC (Msg)    |
  | - Sign up / Sign in     |                   | - Presence (Online)     |
  | - User Profiles         |                   | - Broadcast (Typing)    |
  +-------------------------+                   +-------------------------+
               |                                             |
               +----------------------+----------------------+
                                      |
                                      v
                        +---------------------------+
                        |    Supabase PostgreSQL   |
                        | - profiles                |
                        | - rooms                   |
                        | - room_members            |
                        | - messages (RLS Protected)|
                        +---------------------------+
```

---

## 🚀 Quick Deployment Guide

### Step 1: Create Supabase Project & Run Schema

1. Go to [Supabase](https://supabase.com) and create a new project (it's free).
2. Once created, navigate to **SQL Editor** in the left sidebar.
3. Open [`supabase/schema.sql`](./supabase/schema.sql), copy its contents, paste them into the SQL Editor, and click **Run**.
   - This creates `profiles`, `rooms`, `room_members`, `messages`, sets up Row Level Security (RLS) policies, and enables Realtime replication.
4. Go to **Project Settings** -> **API** and copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **Project API Anon Key** (`anon` `public`)

---

### Step 2: Deploy to Cloudflare Pages (Free & Instant)

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com) and select **Workers & Pages** -> **Create application** -> **Pages**.
2. Select **Connect to Git** and choose the repository: `Uddhav-byte/chat-app`.
3. Configure the build settings:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend` *(or leave empty if building from root)*
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Expand **Environment variables** and add:
   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` |
5. Click **Save and Deploy**. Cloudflare Pages will build and deploy your app in under a minute with an edge URL (`https://chat-app-xxx.pages.dev`).

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Uddhav-byte/chat-app.git
   cd chat-app
   ```

2. **Configure environment variables**:
   Create a `.env` file in the `frontend` directory:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Start the Vite dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📂 Project Structure

```
chat-app/
├── frontend/                  # React 19 + Vite client application
│   ├── public/
│   │   ├── _redirects         # Cloudflare Pages SPA client-side routing fallback
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx # Realtime message feed, typing indicators
│   │   │   ├── RoomCard.jsx   # Individual room card
│   │   │   └── Sidebar.jsx    # Room navigation, online presence tracker
│   │   ├── context/
│   │   │   └── AuthContext.jsx# Supabase session & user state management
│   │   ├── pages/
│   │   │   ├── Chat.jsx       # Main chat layout
│   │   │   ├── Login.jsx      # Authentication login
│   │   │   └── Register.jsx   # Authentication registration
│   │   └── services/
│   │       ├── api.js         # API client utility
│   │       ├── socket.js      # Socket.io fallback service
│   │       └── supabase.js    # Supabase Client, Auth, Database & Realtime
│   ├── package.json
│   └── vite.config.js
├── backend/                   # Legacy Express + MongoDB + Socket.io server
├── supabase/
│   └── schema.sql             # Complete PostgreSQL schema, RLS, triggers & seeds
├── package.json               # Root scripts for Cloudflare Pages detection
└── README.md
```

---

## 🏷️ GitHub Repository Metadata

To complete your GitHub repo configuration:
- **Repository Description**:
  > `⚡ Modern real-time serverless chat app built with React 19, Supabase Realtime & Auth, and deployed on Cloudflare Pages.`
- **Website URL**:
  > `https://<your-project>.pages.dev`
- **Topic Tags**:
  > `react`, `supabase`, `cloudflare-pages`, `realtime-chat`, `vite`, `websockets`, `postgresql`

---

## 📄 License

This project is licensed under the MIT License.
