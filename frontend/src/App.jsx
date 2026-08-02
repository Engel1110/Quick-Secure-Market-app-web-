import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";









































import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import "./styles/qsm-responsive-global.css";
import "./styles/qsm-route-loading.css";

/* QSM FASE 3B.2 ROUTE LAZY LOADING */
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const NewProduct = lazy(() => import("./pages/NewProduct"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const EditProduct = lazy(() => import("./pages/EditProduct"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const Sales = lazy(() => import("./pages/Sales"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Messages = lazy(() => import("./pages/Messages"));
const Disputes = lazy(() => import("./pages/Disputes"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const ProductHistory = lazy(() => import("./pages/ProductHistory"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VoucherCompra = lazy(() => import("./pages/VoucherCompra"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const AdminLogin = lazy(() => import("./pages/admin/auth/AdminLogin"));
const AdminAreaSelector = lazy(() => import("./pages/admin/AdminAreaSelector"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard/AdminDashboard"));
const WarehouseDashboard = lazy(() => import("./pages/admin/warehouse/WarehouseDashboard"));
const DeliveryDashboard = lazy(() => import("./pages/admin/delivery/DeliveryDashboard"));
const DisputesDashboard = lazy(() => import("./pages/admin/disputes/DisputesDashboard"));
const AuditDashboard = lazy(() => import("./pages/admin/audit/AuditDashboard"));
const VerificationDashboard = lazy(() => import("./pages/admin/verification/VerificationDashboard"));
const FinanceDashboard = lazy(() => import("./pages/admin/finance/FinanceDashboard"));
const SupportDashboard = lazy(() => import("./pages/admin/support/SupportDashboard"));
const ModerationDashboard = lazy(() => import("./pages/admin/moderation/ModerationDashboard"));
const SecurityDashboard = lazy(() => import("./pages/admin/Security/SecurityDashboard"));
const InternalUsers = lazy(() => import("./pages/admin/internalUsers/InternalUsers"));
const SystemSettings = lazy(() => import("./pages/admin/systemSettings/SystemSettings"));

function RouteLoadingFallback() {
  return (
    <main
      className="qsm-route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <section className="qsm-route-loading__card">
        <div
          className="qsm-route-loading__spinner"
          aria-hidden="true"
        />
        <strong>Preparando QSM...</strong>
        <span>Cargando la sección solicitada.</span>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
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
              to="/admin/dashboard"
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
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <WarehouseDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <DeliveryDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <DisputesDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <AuditDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <VerificationDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <FinanceDashboard />
              </AdminLayout>
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
      <AdminLayout>
                <SupportDashboard />
              </AdminLayout>
    </AdminProtectedRoute>
  }
/>
<Route
  path="/admin/moderation"
  element={<AdminLayout>
                <ModerationDashboard />
              </AdminLayout>}
/>
<Route
  path="/admin/security"
  element={<AdminLayout>
                <SecurityDashboard />
              </AdminLayout>}
/>

        <Route
          path="/admin/messages"
          element={
            <AdminProtectedRoute
              allowedRoles={[
                "SUPER_ADMIN",
                "SENIOR_ADMIN",
                "ADMIN",
                "SUPERVISOR",
                "AUDITOR",
                "DISPUTE_MANAGER",
                "DISPUTE_AGENT",
                "VERIFICATION_MANAGER",
                "VERIFICATION_AGENT",
                "WAREHOUSE_MANAGER",
                "WAREHOUSE_SUPERVISOR",
                "WAREHOUSE_STAFF",
                "DELIVERY_MANAGER",
                "DELIVERY_SUPERVISOR",
                "DELIVERY_AGENT",
                "FINANCE_MANAGER",
                "FINANCE_AGENT",
                "SUPPORT_MANAGER",
                "SUPPORT_AGENT"
              ]}
            >
              <AdminLayout>
                <Messages adminMode />
              </AdminLayout>
            </AdminProtectedRoute>
          }
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
              <AdminLayout>
                <InternalUsers />
              </AdminLayout>
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
              <AdminLayout>
                <SystemSettings />
              </AdminLayout>
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
              to="/admin/dashboard"
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
