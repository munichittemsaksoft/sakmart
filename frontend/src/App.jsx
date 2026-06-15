import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useAuthStore } from '@/store/authStore'

import HomePage from '@/pages/HomePage'
import TemplatesPage from '@/pages/TemplatesPage'
import TemplateDetailPage from '@/pages/TemplateDetailPage'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import SubmitPage from '@/pages/SubmitPage'
import DashboardPage from '@/pages/DashboardPage'
import ProfilePage from '@/pages/ProfilePage'
import EditTemplatePage from '@/pages/EditTemplatePage'
import NotFoundPage from '@/pages/NotFoundPage'
import AdminPage from '@/pages/AdminPage'
import CheckoutPage from '@/pages/CheckoutPage'
import PurchasesPage from '@/pages/PurchasesPage'
import CartCheckoutPage from '@/pages/CartCheckoutPage'
import CartDrawer from '@/components/cart/CartDrawer'
import AgentsMarketPage from '@/pages/AgentsMarketPage'
import AgentProductDetailPage from '@/pages/AgentProductDetailPage'
import SubmitAgentPage from '@/pages/SubmitAgentPage'
import AgentCheckoutPage from '@/pages/AgentCheckoutPage'
import SkillsMarketPage from '@/pages/SkillsMarketPage'
import SkillDetailPage from '@/pages/SkillDetailPage'
import SubmitSkillPage from '@/pages/SubmitSkillPage'
import SkillCheckoutPage from '@/pages/SkillCheckoutPage'
import EditSkillPage from '@/pages/EditSkillPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function Layout() {
  const { init } = useAuthStore()
  useEffect(() => { init() }, [init])
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,                   element: <HomePage /> },
      { path: 'templates',             element: <TemplatesPage /> },
      { path: 'templates/:slug',       element: <TemplateDetailPage /> },
      { path: 'templates/:slug/edit',  element: <EditTemplatePage /> },
      { path: 'login',                 element: <LoginPage /> },
      { path: 'register',              element: <RegisterPage /> },
      { path: 'submit',                element: <SubmitPage /> },
      { path: 'dashboard',             element: <DashboardPage /> },
      { path: 'profile',                element: <ProfilePage /> },
      { path: 'admin',                 element: <AdminPage /> },
      { path: 'cart/checkout',                  element: <CartCheckoutPage /> },
      { path: 'checkout/:slug',                element: <CheckoutPage /> },
      { path: 'purchases',                     element: <PurchasesPage /> },
      { path: 'agents',                        element: <AgentsMarketPage /> },
      { path: 'agents/submit',                 element: <SubmitAgentPage /> },
      { path: 'agents/checkout/:slug',         element: <AgentCheckoutPage /> },
      { path: 'agents/:slug',                  element: <AgentProductDetailPage /> },
      { path: 'skills',                        element: <SkillsMarketPage /> },
      { path: 'skills/submit',                 element: <SubmitSkillPage /> },
      { path: 'skills/checkout/:slug',         element: <SkillCheckoutPage /> },
      { path: 'skills/:slug/edit',             element: <EditSkillPage /> },
      { path: 'skills/:slug',                  element: <SkillDetailPage /> },
      { path: '*',                             element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#0F0F0F',
            border: '1px solid #dde4ee',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  )
}
