import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Megaphone, FileText, Search, Camera, Home, Sun, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ServicesBox.css';

const services = [
  { Icon: TrendingUp, title: 'Upgrade Account',   description: 'Unlock premium features and benefits',            link: '/verification/apply',         color: '#10b981' },
  { Icon: Megaphone,  title: 'Advertise',          description: 'Promote your listings with featured ads',         link: '/services/advertise',         color: '#f59e0b' },
  { Icon: FileText,   title: 'Prepare Contract',   description: 'Generate legal documents quickly',                link: '/services/contracts',         color: '#3b82f6' },
  { Icon: Search,     title: 'Find a Realtor',     description: 'Connect with verified real estate professionals', link: '/agents',                     color: '#8b5cf6' },
  { Icon: Camera,     title: 'Request Photoshoot', description: 'Professional property photography',              link: '/services/photoshoot',        color: '#ec4899' },
  { Icon: Home,       title: 'List My Property',   description: 'Get help listing your property',                 link: '/services/list-property',     color: '#06b6d4' },
  { Icon: Sun,        title: 'Short Term Rental',  description: 'Manage vacation rental services',                link: '/services/short-term-rental', color: '#14b8a6' },
];

const ServicesBox = () => {
  const { user } = useAuth();

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
            <div className="service-icon">
              <service.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="service-content">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
            <div className="service-arrow" aria-hidden="true">
              <ArrowRight size={14} strokeWidth={2} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ServicesBox;
