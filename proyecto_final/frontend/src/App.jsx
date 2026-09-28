import { Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Productos } from "./pages/Productos";
import { Servicios } from "./pages/Servicios";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { RecoverPasswordPage } from "./pages/RecoverPasswordPage";
import { AboutUs } from "./pages/AboutUs";
import { Contact } from "./pages/Contact";
import { Panel } from "./pages/Panel";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WhatsAppButton } from "./components/WhatsAppButton";
import { CartWidget } from "./components/CartWidget";
import { Chatbot } from "./components/Chatbot";

function App() {
  const location = useLocation()
  const hideLayoutRoutes = ['/login', '/register', '/recover-password']
  const showLayout = !hideLayoutRoutes.includes(location.pathname)

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {showLayout && <Header />}
      <div className={`flex-1 ${showLayout ? 'pb-28 md:pb-24' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/productos"
            element={
              <ProtectedRoute>
                <Productos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/servicios"
            element={
              <ProtectedRoute>
                <Servicios />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover-password" element={<RecoverPasswordPage />} />
          <Route path="/quienes-somos" element={<AboutUs />} />
          <Route
            path="/contacto"
            element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel"
            element={
              <ProtectedRoute>
                <Panel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      {showLayout && <Footer />}
      {showLayout && <WhatsAppButton />}
      {showLayout && <CartWidget />}
      {showLayout && <Chatbot />}
    </div>
  )
}

export default App
