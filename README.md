# 🌐 Aurea – Social Media Platform

Aurea is a **full-stack social media platform** built with **Next.js**, **Supabase**, and **Tailwind CSS**, designed to enable seamless real-time interaction between users.  
It combines a **modern, minimal UI** with **powerful backend features** like authentication, post management, chat, and real-time notifications — all in one app.

---

## 🚀 Features

### 🧑‍🤝‍🧑 Core Social Platform
- **User Authentication** – Email + OAuth login via Supabase Auth.  
- **Profile Management** – Edit usernames, bios, and avatars.  
- **Posts with Media** – Create, view, and delete posts with text and images.  
- **Likes & Comments** – Real-time reactions powered by Supabase Realtime.  
- **Follow System** – Follow and unfollow other users to personalize your feed.

### 💬 Real-Time Communication (in progress)
- **1-to-1 Chat** with instant message delivery via Supabase channels or Socket.io.  
- **Typing indicators** and **message read receipts**.  
- **Audio & Video Calls** using WebRTC for peer-to-peer connections.  
- **Push Notifications** for new messages, likes, and comments.

### ⚡ Performance & Design
- Built with **Next.js 15 (App Router)** for fast, SEO-friendly routing.  
- Styled using **Tailwind CSS** for responsive, modern design.  
- Real-time updates using **Supabase Realtime listeners**.  
- Fully responsive layout optimized for both desktop and mobile.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js 15, React, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Realtime Chat / Calls** | WebRTC, Socket.io (upcoming) |
| **State Management** | React Hooks, Context API |
| **Deployment** | Vercel |
| **Database** | Supabase Postgres with row-level security |

---

## 📁 Folder Structure

src/
├─ app/
│ ├─ (auth)/login/ # Login / Signup pages
│ ├─ (app)/feed/ # Main posts feed
│ ├─ (app)/explore/ # Discover new users/posts
│ ├─ (app)/post/[id]/ # Post details page
│ ├─ (app)/messages/[id]/ # Chat view
│ ├─ (app)/profile/edit/ # Edit profile
│ ├─ layout.tsx # Root layout
│ └─ globals.css # Global Tailwind styles
├─ components/ # Reusable UI components
├─ lib/supabaseClient.ts # Supabase initialization
└─ types/ # Shared TypeScript interfaces

---

## 🧩 Installation & Setup

### 1️⃣ Clone the Repository

git clone https://github.com/shrutigitte/Aurea-SocialMediaPlatform.git

cd Aurea-SocialMediaPlatform

### 2. Install Dependencies

npm install

### 3. Configure env variables
Create a .env.local file and add:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

### 4, Run the Development server
npm run dev

### Future Enhancements
1. Notifications Center – Real-time alerts for likes, follows, and mentions.
2. Audio & Video Calls – Peer-to-peer calls with WebRTC.
3. Story / Status Updates – 24-hour disappearing posts.
4. End-to-End Encryption for chat and call data.
5. Dark Mode and customizable themes.

### Screenshots
<img width="565" height="754" alt="Screenshot 2025-10-19 at 8 25 49 PM" src="https://github.com/user-attachments/assets/03bf9b44-cd9d-4682-bacf-3e459a0e61ef" />

## A post (comments and like)


<img width="605" height="416" alt="Screenshot 2025-10-19 at 8 18 49 PM" src="https://github.com/user-attachments/assets/696076ce-2262-49ae-9203-2de6dd510c46" />

## Notifications

<img width="343" height="871" alt="image" src="https://github.com/user-attachments/assets/5544a74f-5204-43d4-a66f-fa36515a1af8" />

## Chat Interface



