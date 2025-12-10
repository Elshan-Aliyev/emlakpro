import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomeNew from './pages/HomeNew';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PropertyDetail from './pages/PropertyDetail';
import NotFound from './pages/NotFound';
import Search from './pages/Search';
import Agents from './pages/Agents';
import Resources from './pages/Resources';
import ArticleDetail from './pages/ArticleDetail';
import FindRealtor from './pages/FindRealtor';
import RealtorProfile from './pages/RealtorProfile';
import Advertise from './pages/Advertise';
import Messages from './pages/Messages';
import VerificationApplication from './pages/VerificationApplication';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

// Service Pages
import PrepareContract from './pages/PrepareContract';
import BookPhotoshoot from './pages/BookPhotoshoot';
import DigitalStaging from './pages/DigitalStaging';
import ListProperty from './pages/ListProperty';
import ShortTermRental from './pages/ShortTermRental';

// User Dashboard
import AccountDashboard from './pages/AccountDashboard';
import AccountListings from './pages/AccountListings';
import AccountSaved from './pages/AccountSaved';
import AccountSettings from './pages/AccountSettings';
import CreateProperty from './pages/CreateProperty';
import UpdateProperty from './pages/UpdateProperty';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminListings from './pages/AdminListings';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import AdminArticles from './pages/AdminArticles';

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout><HomeNew /></MainLayout>} />
        {/* Search routes - exact /search first for legacy links */}
        <Route path="/search" element={<MainLayout><Search /></MainLayout>} />
        <Route path="/search/:location" element={<MainLayout><Search /></MainLayout>} />
        <Route path="/search/:location/:propertyId" element={<MainLayout><Search /></MainLayout>} />
        <Route path="/agents" element={<MainLayout><Agents /></MainLayout>} />
        <Route path="/resources" element={<MainLayout><Resources /></MainLayout>} />
        <Route path="/resources/:id" element={<MainLayout><ArticleDetail /></MainLayout>} />
        <Route path="/find-realtor" element={<MainLayout><FindRealtor /></MainLayout>} />
        <Route path="/realtor/:id" element={<MainLayout><RealtorProfile /></MainLayout>} />
        <Route path="/advertise" element={<MainLayout><Advertise /></MainLayout>} />
        <Route path="/help" element={<MainLayout><Help /></MainLayout>} />
        <Route path="/privacy" element={<MainLayout><Privacy /></MainLayout>} />
        <Route path="/terms" element={<MainLayout><Terms /></MainLayout>} />
        
        {/* Service Routes */}
        <Route path="/services/contracts" element={<MainLayout><PrepareContract /></MainLayout>} />
        <Route path="/services/photoshoot" element={<MainLayout><BookPhotoshoot /></MainLayout>} />
        <Route path="/services/staging" element={<MainLayout><DigitalStaging /></MainLayout>} />
        <Route path="/services/list-property" element={<MainLayout><ListProperty /></MainLayout>} />
        <Route path="/services/short-term-rental" element={<MainLayout><ShortTermRental /></MainLayout>} />
        
        <Route path="/listing/:id" element={<MainLayout><PropertyDetail /></MainLayout>} />
        <Route path="/properties/:id" element={<MainLayout><PropertyDetail /></MainLayout>} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Protected User Routes */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <MainLayout><AccountDashboard /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/account/listings"
          element={
            <ProtectedRoute>
              <MainLayout><AccountListings /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/account/saved"
          element={
            <ProtectedRoute>
              <MainLayout><AccountSaved /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/account/settings"
          element={
            <ProtectedRoute>
              <MainLayout><AccountSettings /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MainLayout><Messages /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/verification-application"
          element={
            <ProtectedRoute>
              <MainLayout><VerificationApplication /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/properties/create"
          element={
            <ProtectedRoute>
              <MainLayout><CreateProperty /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/properties/update/:id"
          element={
            <ProtectedRoute>
              <MainLayout><UpdateProperty /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <MainLayout><AdminDashboard /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/listings"
          element={
            <ProtectedRoute requireAdmin>
              <MainLayout><AdminListings /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <MainLayout><AdminUsers /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <MainLayout><AdminSettings /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/articles"
          element={
            <ProtectedRoute requireAdmin>
              <MainLayout><AdminArticles /></MainLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Legacy Redirects */}
        <Route path="/properties" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />
        <Route path="/profile" element={<Navigate to="/account/settings" replace />} />
        <Route path="/favorites" element={<Navigate to="/account/saved" replace />} />
        <Route path="/saved" element={<Navigate to="/account/saved" replace />} />
        
        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
