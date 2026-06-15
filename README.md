# Real-Time Chat Application

A full-stack, real-time messaging platform built with the MERN stack (MongoDB, Express.js, React.js, Node.js) and Socket.io.

## Features

- **Real-Time Messaging**: Bi-directional, low-latency communication powered by Socket.io.
- **User Authentication**: Secure signup and login using JSON Web Tokens (JWT) and bcrypt password hashing.
- **Chat Rooms**: Create, join, and seamlessly switch between different chat rooms.
- **Online Presence**: See who is currently online in real-time.
- **Typing Indicators**: Live "User is typing..." notifications.
- **Message History**: All messages are persistently stored and retrieved from MongoDB.
- **Premium UI**: Modern, responsive dark-mode interface featuring glassmorphism design principles.

## Technology Stack

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.io (WebSocket Server)
- JSON Web Token (JWT)

### Frontend
- React.js (Bootstrapped with Vite)
- Socket.io-client
- Axios for API requests
- React Router DOM
- Vanilla CSS with CSS Variables for theming

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB running locally (default port 27017) or a MongoDB Atlas URI.

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Uddhav-byte/chat-app.git
   cd chat-app
   ```

2. **Setup the Backend**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory (if not present) with the following:
   ```env
   PORT=5002
   MONGO_URI=mongodb://localhost:27017/chatapp
   JWT_SECRET=your_super_secret_jwt_key_change_me_in_production
   ```
   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   cd ../frontend
   npm install
   ```
   Start the frontend development server:
   ```bash
   npm run dev
   ```

4. **Open the Application**
   Navigate to `http://localhost:5173` in your browser.

## Project Structure

- `/backend`: Contains the Express server, MongoDB models, API routes, and Socket.io event handlers.
- `/frontend`: Contains the Vite+React application, contexts for state management, and UI components.
