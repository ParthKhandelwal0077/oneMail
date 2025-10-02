# OneMail

A modern email application built with React, TypeScript, Node.js, and Express.

## Project Structure

```
oneMail/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main App component
│   │   └── index.tsx       # Entry point
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── tsconfig.json       # TypeScript configuration
│
└── server/                 # Node.js backend
    ├── src/
    │   ├── controllers/    # MVC Controllers
    │   ├── models/         # Data models and interfaces
    │   ├── routes/         # API routes
    │   ├── middleware/     # Custom middleware
    │   ├── config/         # Configuration files
    │   ├── utils/          # Utility functions
    │   └── index.ts        # Server entry point
    ├── public/             # Static files
    ├── package.json        # Backend dependencies
    ├── tsconfig.json       # TypeScript configuration
    └── nodemon.json        # Development server configuration
```

## Features

### Frontend (React + TypeScript + Tailwind CSS)
- Modern React 18 with TypeScript
- Tailwind CSS for styling
- Responsive design
- Component-based architecture
- Type-safe development

### Backend (Node.js + Express + MVC Architecture)
- RESTful API with Express.js
- MVC (Model-View-Controller) architecture
- JWT authentication
- Middleware for security and error handling
- TypeScript for type safety
- Structured routing system

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment example file:
```bash
cp env.example .env
```

4. Update the `.env` file with your configuration values.

5. Start the development server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account
- `GET /api/users/settings` - Get user settings
- `PUT /api/users/settings` - Update user settings

### Emails
- `GET /api/emails` - Get emails with pagination
- `GET /api/emails/:id` - Get email by ID
- `POST /api/emails/send` - Send new email
- `POST /api/emails/reply` - Reply to email
- `POST /api/emails/forward` - Forward email
- `PUT /api/emails/:id/read` - Mark email as read
- `PUT /api/emails/:id/unread` - Mark email as unread
- `PUT /api/emails/:id/star` - Star email
- `PUT /api/emails/:id/unstar` - Unstar email
- `DELETE /api/emails/:id` - Delete email
- `GET /api/emails/folder/inbox` - Get inbox emails
- `GET /api/emails/folder/sent` - Get sent emails
- `GET /api/emails/folder/drafts` - Get draft emails
- `GET /api/emails/folder/trash` - Get trash emails
- `GET /api/emails/folder/starred` - Get starred emails

## Development

### Available Scripts

#### Frontend (client/)
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

#### Backend (server/)
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run build` - Build TypeScript to JavaScript

## Technologies Used

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Create React App

### Backend
- Node.js
- Express.js
- TypeScript
- JWT Authentication
- Bcrypt for password hashing
- CORS for cross-origin requests
- Helmet for security headers
- Morgan for logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
