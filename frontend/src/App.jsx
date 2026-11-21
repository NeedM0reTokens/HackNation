import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('Łączenie z backendem...');

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.message))
      .catch(() => setApiStatus('Błąd połączenia z backendem!'));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Zasiłkowy Przewodnik Rodzica</h1>
        <p className="subtitle">Status połączenia z API:</p>
        <div className="status-box">{apiStatus}</div>
      </div>
    </div>
  );
}

export default App;