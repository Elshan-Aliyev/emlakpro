import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FilterBar from '../components/FilterBar';
import Footer from './Footer';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const showFilterBar = location.pathname === '/search';
  
  return (
    <div className="main-layout">
      <Navbar />
      {showFilterBar && <FilterBar />}
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
