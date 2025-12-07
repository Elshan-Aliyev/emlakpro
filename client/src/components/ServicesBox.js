import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServicesBox.css';

const ServicesBox = () => {
  const { user } = useAuth();

  const services = [
    {
      icon: '⬆️',
      title: 'Upgrade Account',
      description: 'Unlock premium features and benefits',
      link: '/verification/apply',
      color: '#10b981'
    },
    {
      icon: '📢',
      title: 'Advertise',
      description: 'Promote your listings with featured ads',
      link: '/services/advertise',
      color: '#f59e0b'
    },
    {
      icon: '📝',
      title: 'Prepare Contract',
      description: 'Generate legal documents quickly',
      link: '/services/contracts',
      color: '#3b82f6'
    },
    {
      icon: '🔍',
      title: 'Find a Realtor',
      description: 'Connect with verified real estate professionals',
      link: '/agents',
      color: '#8b5cf6'
    },
    {
      icon: '📸',
      title: 'Request Photoshoot',
      description: 'Professional property photography',
      link: '/services/photoshoot',
      color: '#ec4899'
    },
    {
      icon: '🏠',
      title: 'List My Property',
      description: 'Get help listing your property',
      link: '/services/list-property',
      color: '#06b6d4'
    },
    {
      icon: '🏖️',
      title: 'Short Term Rental',
      description: 'Manage vacation rental services',
      link: '/services/short-term-rental',
      color: '#14b8a6'
    }
  ];

  return (
    <div className="services-box">
      <div className="services-box-header">
        <h2>Our Services</h2>
        <p>Explore professional services to enhance your real estate experience</p>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <Link 
            key={index} 
            to={service.link} 
            className="service-card"
            style={{ '--service-color': service.color }}
          >
            <div className="service-icon">{service.icon}</div>
            <div className="service-content">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
            <div className="service-arrow">→</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ServicesBox;
