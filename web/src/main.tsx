import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { AuthProvider } from './auth';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import RequireSubscription from './components/RequireSubscription';
import RequireAdmin from './components/RequireAdmin';
import Home from './pages/Home';
import Search from './pages/Search';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SignupSuccess from './pages/SignupSuccess';
import Dashboard from './pages/Dashboard';
import NewListing from './pages/NewListing';
import Favorites from './pages/Favorites';
import Messages from './pages/Messages';
import Requirements from './pages/Requirements';
import Pricing from './pages/Pricing';
import ChoosePlan from './pages/ChoosePlan';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Contact from './pages/Contact';
import PrivateClients from './pages/PrivateClients';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import NotFound from './pages/NotFound';
import MarketIndex from './pages/MarketIndex';
import Agents from './pages/Agents';
import Admin from './pages/Admin';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* ── Public ── */}
              <Route index element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="property/:id" element={<PropertyDetail />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="signup/success" element={<SignupSuccess />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="contact" element={<Contact />} />
              <Route path="private-clients" element={<PrivateClients />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="blog" element={<Blog />} />
              <Route path="blog/:slug" element={<BlogPost />} />
              <Route path="market-index" element={<MarketIndex />} />

              {/* ── Legacy / intuitive URL aliases (avoid 404s from old links & sitemaps) ── */}
              <Route path="buy" element={<Navigate to="/search?listingType=sale" replace />} />
              <Route path="rent" element={<Navigate to="/search?listingType=rent" replace />} />
              <Route path="agents" element={<Agents />} />
              <Route path="list-your-property" element={<Navigate to="/agents" replace />} />
              <Route path="founding-agents" element={<Navigate to="/agents" replace />} />
              <Route path="sign-in" element={<Navigate to="/login" replace />} />
              <Route path="signin" element={<Navigate to="/login" replace />} />
              <Route path="create-account" element={<Navigate to="/signup" replace />} />
              <Route path="register" element={<Navigate to="/signup" replace />} />
              <Route path="terms-of-service" element={<Navigate to="/terms" replace />} />
              <Route path="privacy-policy" element={<Navigate to="/privacy" replace />} />
              <Route path="legal-services" element={<Navigate to="/contact" replace />} />
              <Route path="new-developments" element={<Navigate to="/search?sort=newest" replace />} />

              {/* ── Requires auth only (no sub gate) ── */}
              <Route path="choose-plan" element={<RequireAuth><ChoosePlan /></RequireAuth>} />
              <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="checkout/success" element={<RequireAuth><CheckoutSuccess /></RequireAuth>} />
              <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
              <Route path="messages" element={<RequireAuth><Messages /></RequireAuth>} />
              <Route path="messages/:userId" element={<RequireAuth><Messages /></RequireAuth>} />

              {/* ── Requires auth + active subscription ── */}
              <Route path="dashboard" element={<RequireSubscription><Dashboard /></RequireSubscription>} />
              <Route path="dashboard/new" element={<RequireSubscription><NewListing /></RequireSubscription>} />
              <Route path="dashboard/edit/:id" element={<RequireSubscription><NewListing /></RequireSubscription>} />
              <Route path="requirements" element={<RequireSubscription><Requirements /></RequireSubscription>} />
              <Route path="analytics" element={<RequireSubscription><Analytics /></RequireSubscription>} />
              <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
