import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import HomePage from "./pages/HomePage.jsx"
import SignUpPage from "./pages/SignUpPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import NotificationsPage from "./pages/NotificationsPage.jsx"
import CallPage from "./pages/CallPage.jsx"
import ChatPage from "./pages/ChatPage.jsx"
import OnboardingPage from './pages/OnboardingPage.jsx'
import toast, { Toaster } from 'react-hot-toast'
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import { axiosInstance } from './lib/axios.js'
import PageLoader from './components/PageLoader.jsx'
import { getAuthUser } from './lib/api.js'
import useAuthUser from './hooks/useAuthUser.js'
import { Home } from 'lucide-react'
import Layout from './components/Layout.jsx'
import { useThemeStore } from './store/useThemeStore.js'
import GroupsPage from './pages/GroupsPage.jsx'

const App = () => {
  // tanstack query crash course


  const {isLoading,authUser} = useAuthUser();
  const {theme} = useThemeStore();
  const isAuthenticated = Boolean(authUser)
  const isOnBoarded = authUser?.isOnBoarded

  // const authUser = authData?.user

  if(isLoading) return <PageLoader/>;
  // console.log({data});
  // console.log({isLoading});
  // console.log({ error });

  return (
    <div className="h-screen" data-theme={theme}>
      {/* <button className='btn' onClick={()=>toast.success("Hello World!")}>Create a toast</button> */}
      <Routes>
        <Route path="/" element={isAuthenticated && isOnBoarded ? (
          <Layout showSidebar={true}>
            <HomePage/>
          </Layout>
        ): (
          <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
        )}/>
        <Route path="/signup" element={!isAuthenticated ? <SignUpPage/>: <Navigate to={isOnBoarded ? "/" : "/onboarding"}/>}/>
        <Route path="/login" element={!isAuthenticated ?<LoginPage/>: <Navigate to={isOnBoarded ? "/" : "/onboarding"}/>}/>
        <Route path="/notifications" 
        element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar>
            <NotificationsPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}
        />
        <Route path="/groups" 
        element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar>
            <GroupsPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}
        />
        <Route 
          path="/call/:id" 
          element={
            isAuthenticated && isOnBoarded ? (
              <CallPage />
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          } 
        />
        <Route path="/chat/:id" 
        element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar={false}>
            <ChatPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}
/>
        <Route path="/onboarding" 
          element={isAuthenticated ? (
            !isOnBoarded ?(
              <OnboardingPage/>
            ):(
              <Navigate to="/"/>
            )
          ) : (
            <Navigate to="/login"/>
          )}/>
      </Routes>
      <Toaster/>
    </div>
  )
}

export default App
