import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackPage } from './services/analytics';
import MainLayout   from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary  from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';

// ── Eager (critical path — loaded in the initial bundle) ──────────────────────
import HomeNew        from './pages/HomeNew';
import Search         from './pages/Search';
import PropertyDetail from './pages/PropertyDetail';
import Login          from './pages/Login';
import SignUp         from './pages/SignUp';
import NotFound       from './pages/NotFound';

// ── Lazy (split into separate chunks, loaded on-demand) ───────────────────────

// Auth
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));

// Public content
const Agents         = lazy(() => import('./pages/Agents'));
const Resources      = lazy(() => import('./pages/Resources'));
const ArticleDetail  = lazy(() => import('./pages/ArticleDetail'));
const FindRealtor    = lazy(() => import('./pages/FindRealtor'));
const RealtorProfile = lazy(() => import('./pages/RealtorProfile'));
const Advertise      = lazy(() => import('./pages/Advertise'));
const Help           = lazy(() => import('./pages/Help'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Terms          = lazy(() => import('./pages/Terms'));
const ContactUs      = lazy(() => import('./pages/ContactUs'));
const AboutUs        = lazy(() => import('./pages/AboutUs'));
const Services       = lazy(() => import('./pages/Services'));
const MarketplaceTrust = lazy(() => import('./pages/MarketplaceTrust'));

// Service pages
const PrepareContract  = lazy(() => import('./pages/PrepareContract'));
const BookPhotoshoot   = lazy(() => import('./pages/BookPhotoshoot'));
const DigitalStaging   = lazy(() => import('./pages/DigitalStaging'));
const ListProperty     = lazy(() => import('./pages/ListProperty'));
const ShortTermRental  = lazy(() => import('./pages/ShortTermRental'));

// User dashboard + tools
const Messages                 = lazy(() => import('./pages/Messages'));
const AccountDashboard         = lazy(() => import('./pages/AccountDashboard'));
const AccountListings          = lazy(() => import('./pages/AccountListings'));
const AccountSaved             = lazy(() => import('./pages/AccountSaved'));
const AccountSettings          = lazy(() => import('./pages/AccountSettings'));
const VerificationApplication  = lazy(() => import('./pages/VerificationApplication'));
const CreateProperty           = lazy(() => import('./pages/CreateProperty'));
const CreatePropertySimple     = lazy(() => import('./pages/CreatePropertySimple'));
const EnhanceProperty          = lazy(() => import('./pages/EnhanceProperty'));
const ShareListingScreen       = lazy(() => import('./pages/ShareListingScreen'));
const UpdateProperty           = lazy(() => import('./pages/UpdateProperty'));

// Admin (heaviest bundle — always lazy)
const AdminAnalytics     = lazy(() => import('./pages/AdminAnalytics'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const AdminListings      = lazy(() => import('./pages/AdminListings'));
const AdminUsers         = lazy(() => import('./pages/AdminUsers'));
const AdminSettings      = lazy(() => import('./pages/AdminSettings'));
const AdminArticles      = lazy(() => import('./pages/AdminArticles'));
const AdminReports       = lazy(() => import('./pages/AdminReports'));
const AdminOwnership     = lazy(() => import('./pages/AdminOwnership'));
const AdminOpsDashboard  = lazy(() => import('./pages/AdminOpsDashboard'));
const AdminAbuse         = lazy(() => import('./pages/AdminAbuse'));
const AdminMetrics       = lazy(() => import('./pages/AdminMetrics'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAFAF9',
  }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: '2.5px solid #e5e7eb',
      borderTopColor: '#0F766E',
      animation: 'page-spin 0.7s linear infinite',
    }} />
    <style>{`
      @keyframes page-spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ── Route tracker — fires on every SPA navigation ─────────────────────────────
function RouteTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    trackPage(pathname + search);
  }, [pathname, search]);
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <HelmetProvider>
    <ErrorBoundary>
      <div className="App">
        <Suspense fallback={<PageLoader />}>
          <RouteTracker />
          <Routes>

            {/* ── Public routes ──────────────────────────────────────────────── */}
            <Route path="/"                          element={<MainLayout><HomeNew /></MainLayout>} />
            <Route path="/search"                    element={<MainLayout><Search /></MainLayout>} />
            <Route path="/search/:location"          element={<MainLayout><Search /></MainLayout>} />
            <Route path="/search/:location/:propertyId" element={<MainLayout><Search /></MainLayout>} />
            <Route path="/listing/:id"               element={<MainLayout><PropertyDetail /></MainLayout>} />
            <Route path="/properties/:id"            element={<MainLayout><PropertyDetail /></MainLayout>} />
            <Route path="/agents"                    element={<MainLayout><Agents /></MainLayout>} />
            <Route path="/resources"                 element={<MainLayout><Resources /></MainLayout>} />
            <Route path="/resources/:id"             element={<MainLayout><ArticleDetail /></MainLayout>} />
            <Route path="/find-realtor"              element={<MainLayout><FindRealtor /></MainLayout>} />
            <Route path="/realtor/:id"               element={<MainLayout><RealtorProfile /></MainLayout>} />
            <Route path="/advertise"                 element={<MainLayout><Advertise /></MainLayout>} />
            <Route path="/help"                      element={<MainLayout><Help /></MainLayout>} />
            <Route path="/privacy"                   element={<MainLayout><Privacy /></MainLayout>} />
            <Route path="/terms"                     element={<MainLayout><Terms /></MainLayout>} />
            <Route path="/contact"                   element={<MainLayout><ContactUs /></MainLayout>} />
            <Route path="/about"                     element={<MainLayout><AboutUs /></MainLayout>} />
            <Route path="/services"                  element={<MainLayout><Services /></MainLayout>} />
            <Route path="/trust"                     element={<MainLayout><MarketplaceTrust /></MainLayout>} />

            {/* ── Service routes ──────────────────────────────────────────────── */}
            <Route path="/services/contracts"        element={<MainLayout><PrepareContract /></MainLayout>} />
            <Route path="/services/photoshoot"       element={<MainLayout><BookPhotoshoot /></MainLayout>} />
            <Route path="/services/staging"          element={<MainLayout><DigitalStaging /></MainLayout>} />
            <Route path="/services/list-property"    element={<MainLayout><ListProperty /></MainLayout>} />
            <Route path="/services/short-term-rental" element={<MainLayout><ShortTermRental /></MainLayout>} />

            {/* ── Auth routes ─────────────────────────────────────────────────── */}
            <Route path="/login"                     element={<Login />} />
            <Route path="/signup"                    element={<SignUp />} />
            <Route path="/forgot-password"           element={<ForgotPassword />} />
            <Route path="/reset-password/:token"     element={<ResetPassword />} />

            {/* ── Protected user routes ───────────────────────────────────────── */}
            <Route path="/account" element={
              <ProtectedRoute><MainLayout><AccountDashboard /></MainLayout></ProtectedRoute>
            } />
            <Route path="/account/listings" element={
              <ProtectedRoute><MainLayout><AccountListings /></MainLayout></ProtectedRoute>
            } />
            <Route path="/account/saved" element={
              <ProtectedRoute><MainLayout><AccountSaved /></MainLayout></ProtectedRoute>
            } />
            <Route path="/account/settings" element={
              <ProtectedRoute><MainLayout><AccountSettings /></MainLayout></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MainLayout><Messages /></MainLayout></ProtectedRoute>
            } />
            <Route path="/verification-application" element={
              <ProtectedRoute><MainLayout><VerificationApplication /></MainLayout></ProtectedRoute>
            } />
            <Route path="/properties/create" element={
              <ProtectedRoute><MainLayout><CreateProperty /></MainLayout></ProtectedRoute>
            } />
            <Route path="/properties/create-simple" element={
              <ProtectedRoute><MainLayout><CreatePropertySimple /></MainLayout></ProtectedRoute>
            } />
            <Route path="/properties/:id/share" element={
              <ProtectedRoute><MainLayout><ShareListingScreen /></MainLayout></ProtectedRoute>
            } />
            <Route path="/properties/:id/enhance" element={
              <ProtectedRoute><MainLayout><EnhanceProperty /></MainLayout></ProtectedRoute>
            } />
            <Route path="/properties/update/:id" element={
              <ProtectedRoute><MainLayout><UpdateProperty /></MainLayout></ProtectedRoute>
            } />

            {/* ── Protected admin routes ──────────────────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminDashboard /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/listings" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminListings /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminUsers /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminSettings /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/articles" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminArticles /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminReports /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/ownership" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminOwnership /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/operations" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminOpsDashboard /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminAnalytics /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/abuse" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminAbuse /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/metrics" element={
              <ProtectedRoute requireAdmin><MainLayout><AdminMetrics /></MainLayout></ProtectedRoute>
            } />

            {/* ── Legacy redirects ────────────────────────────────────────────── */}
            <Route path="/services/promote" element={<Navigate to="/account/listings" replace />} />
            <Route path="/properties"   element={<Navigate to="/" replace />} />
            <Route path="/dashboard"    element={<Navigate to="/account" replace />} />
            <Route path="/profile"      element={<Navigate to="/account/settings" replace />} />
            <Route path="/favorites"    element={<Navigate to="/account/saved" replace />} />
            <Route path="/saved"        element={<Navigate to="/account/saved" replace />} />

            {/* ── 404 ─────────────────────────────────────────────────────────── */}
            <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />

          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
