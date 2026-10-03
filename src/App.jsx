import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Empreendimento from './pages/Empreendimento.jsx';
import Visualizador from './pages/Visualizador.jsx';
import AdminGate from './pages/admin/AdminGate.jsx';
import AdminLista from './pages/admin/AdminLista.jsx';
import AdminEditor from './pages/admin/AdminEditor.jsx';
import AdminMarca from './pages/admin/AdminMarca.jsx';

// HashRouter (#/rota) funciona em qualquer hospedagem estática sem configurar redirects.
// Se publicar em Vercel/Netlify com rewrite, pode trocar por BrowserRouter.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/empreendimento/:slug" element={<Empreendimento />} />
        <Route path="/empreendimento/:slug/ver/:tipo/:indice" element={<Visualizador />} />
        <Route path="/admin" element={<AdminGate />}>
          <Route index element={<AdminLista />} />
          <Route path="novo" element={<AdminEditor />} />
          <Route path="editar/:slug" element={<AdminEditor />} />
          <Route path="marca" element={<AdminMarca />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
