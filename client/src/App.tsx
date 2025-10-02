import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            OneMail
          </h1>
          <p className="text-gray-600">
            A modern email application built with React, TypeScript, and Tailwind CSS
          </p>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to OneMail
            </h2>
            <p className="text-gray-600 mb-4">
              Your frontend React application is ready! This skeleton includes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>React 18 with TypeScript</li>
              <li>Tailwind CSS for styling</li>
              <li>Organized folder structure</li>
              <li>Modern development setup</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

