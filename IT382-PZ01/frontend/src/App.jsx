import React, { useEffect, useState } from 'react';

function App() {
  const [backendData, setBackendData] = useState(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Fallback for local dev

  useEffect(() => {
    fetch(backendUrl)
      .then(response => response.json())
      .then(data => setBackendData(data))
      .catch(error => console.error('Error fetching from backend:', error));
  }, []);

  return (
    <div>
      <h1>My Secure Containerized App</h1>
      {backendData ? (
        <div>
          <p>{backendData.message}</p>
          <p>{backendData.db_status}</p>
          <p>{backendData.redis_status}</p>
        </div>
      ) : (
        <p>Loading backend data...</p>
      )}
    </div>
  );
}

export default App;