import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Marketplace from "./pages/Marketplace";
import NewProduct from "./pages/NewProduct";
import ProductDetails from "./pages/ProductDetails";
import EditProduct from "./pages/EditProduct";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Sales from "./pages/Sales";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import Disputes from "./pages/Disputes";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProductHistory from "./pages/ProductHistory";
import CompleteProfile from "./pages/CompleteProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VoucherCompra from "./pages/VoucherCompra";
import OrderTracking from "./pages/OrderTracking";

import AdminLogin from "./pages/admin/auth/AdminLogin";
import AdminAreaSelector from "./pages/admin/AdminAreaSelector";
import AdminDashboard from "./pages/admin/Dashboard/AdminDashboard";
import WarehouseDashboard from "./pages/admin/warehouse/WarehouseDashboard";
import DeliveryDashboard from "./pages/admin/delivery/DeliveryDashboard";
import DisputesDashboard from "./pages/admin/disputes/DisputesDashboard";
import AuditDashboard from "./pages/admin/audit/AuditDashboard"; 
import VerificationDashboard from "./pages/admin/verification/VerificationDashboard"; 
import FinanceDashboard from "./pages/admin/finance/FinanceDashboard";
import SupportDashboard from "./pages/admin/support/SupportDashboard";
import ModerationDashboard from "./pages/admin/moderation/ModerationDashboard";
import SecurityDashboard from "./pages/admin/Security/SecurityDashboard";
import InternalUsers from "./pages/admin/internalUsers/InternalUsers";
import SystemSettings from "./pages/admin/systemSettings/SystemSettings";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import "./styles/qsm-responsive-global.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
            RUTAS PÚBLICAS
        ====================================================== */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* =====================================================
            RUTAS DE COMPRADORES Y VENDEDORES
        ====================================================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <PublicProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-product"
          element={
            <ProtectedRoute>
              <NewProduct />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <ProductDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute>
              <EditProduct />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product/:id/history"
          element={
            <ProtectedRoute>
              <ProductHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout/:id"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/voucher/:id"
          element={
            <ProtectedRoute>
              <VoucherCompra />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderTracking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/disputes"
          element={
            <ProtectedRoute>
              <Disputes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* =====================================================
            AUTENTICACIÓN ADMINISTRATIVA
        ====================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <Navigate
              to="/admin/select-area"
              replace
            />
          }
        />

        <Route
          path="/admin/select-area"
          element={
            <AdminProtectedRoute>
              <AdminAreaSelector />
            </AdminProtectedRoute>
          }
        />

        {/* =====================================================
            ADMINISTRACIÓN GENERAL
        ====================================================== */}

        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute
              allowedDepartments={[
                "ADMINISTRATION"
              ]}
            >
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        <Route
  path="/admin/warehouse"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_SUPERVISOR",
        "WAREHOUSE_STAFF"
      ]}
      allowedDepartments={[
        "WAREHOUSE"
      ]}
    >
      <WarehouseDashboard />
    </AdminProtectedRoute>
  }
/>

<Route
  path="/admin/delivery"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "DELIVERY_MANAGER",
        "DELIVERY_SUPERVISOR",
        "DELIVERY_AGENT"
      ]}
      allowedDepartments={[
        "DELIVERY"
      ]}
    >
      <DeliveryDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/disputes"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "DISPUTE_MANAGER",
        "DISPUTE_AGENT"
      ]}
      allowedDepartments={[
        "DISPUTES"
      ]}
    >
      <DisputesDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/audit"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "AUDITOR"
      ]}
      allowedDepartments={[
        "AUDIT"
      ]}
    >
      <AuditDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/verification"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "VERIFICATION_MANAGER",
        "VERIFICATION_AGENT"
      ]}
      allowedDepartments={[
        "VERIFICATION"
      ]}
    >
      <VerificationDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/finance"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "SUPER_ADMIN",
        "SENIOR_ADMIN",
        "ADMIN",
        "FINANCE_MANAGER",
        "FINANCE_AGENT"
      ]}
      allowedDepartments={[
        "FINANCE",
        "ADMINISTRATION"
      ]}
    >
      <FinanceDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/support"
  element={
    <AdminProtectedRoute
      allowedRoles={[
        "SUPPORT_MANAGER",
        "SUPPORT_AGENT"
      ]}
      allowedDepartments={[
        "SUPPORT"
      ]}
    >
      <SupportDashboard />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/moderation"
  element={<ModerationDashboard />}
/>
<Route
  path="/admin/security"
  element={<SecurityDashboard />}
/>

        <Route
          path="/admin/internal-users"
          element={
            <AdminProtectedRoute
              allowedRoles={[
                "SUPER_ADMIN",
                "SENIOR_ADMIN",
                "ADMIN",
                "SUPERVISOR"
              ]}
              allowedDepartments={[
                "ADMINISTRATION"
              ]}
            >
              <InternalUsers />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/system-settings"
          element={
            <AdminProtectedRoute
              allowedRoles={[
                "SUPER_ADMIN",
                "SENIOR_ADMIN"
              ]}
              allowedDepartments={[
                "ADMINISTRATION"
              ]}
            >
              <SystemSettings />
            </AdminProtectedRoute>
          }
        />

        {/* =====================================================
            ALMACÉN
        ====================================================== */}


{/* =====================================================
            DELIVERY
        ====================================================== */}


{/* =====================================================
            DISPUTAS
        ====================================================== */}


{/* =====================================================
            AUDITORÍA
        ====================================================== */}


{/* =====================================================
            FINANZAS
        ====================================================== */}


{/* =====================================================
            SOPORTE
        ====================================================== */}


{/* =====================================================
            MODERACIÓN
        ====================================================== */}


{/* =====================================================
            SEGURIDAD
        ====================================================== */}


{/* =====================================================
            VERIFICACIÓN / KYC
            La página real se conectará en la fase correspondiente.
        ====================================================== */}

        {/* =====================================================
            RUTAS ADMINISTRATIVAS TODAVÍA NO CREADAS
        ====================================================== */}

        <Route
          path="/admin/*"
          element={
            <Navigate
              to="/admin/select-area"
              replace
            />
          }
        />

        {/* =====================================================
            RUTA GENERAL NO ENCONTRADA
        ====================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
