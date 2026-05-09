
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

// Força limpeza de service workers antigos que possam estar servindo JS em cache
// Roda uma vez; se encontrar SWs registrados com cache desatualizado, limpa e recarrega
if ('serviceWorker' in navigator) {
    const SW_VERSION = 'v6';
    const lastClean = sessionStorage.getItem('sw-cleaned');
    if (lastClean !== SW_VERSION) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            if (regs.length > 0) {
                Promise.all(regs.map(r => r.unregister())).then(() => {
                    sessionStorage.setItem('sw-cleaned', SW_VERSION);
                    window.location.reload();
                });
            } else {
                sessionStorage.setItem('sw-cleaned', SW_VERSION);
            }
        });
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
