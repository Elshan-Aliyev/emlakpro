import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Agents.css';

const Agents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const res = await getUsers(token);
      // Filter to show only realtors and corporate agents
      let agentUsers = res.data.filter(user => 
        user.role === 'realtor' || user.role === 'corporate'
      );
      
      // Include current user if they are an agent but not already in the list
      if (user && (user.role === 'realtor' || user.role === 'corporate')) {
        const isAlreadyIncluded = agentUsers.some(agent => agent._id === user._id);
        if (!isAlreadyIncluded) {
          agentUsers = [user, ...agentUsers];
        }
      }
      
      setAgents(agentUsers);
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || agent.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role) => {
    const labels = {
      'realtor': 'Real Estate Agent',
      'corporate': 'Corporate Agent'
    };
    return labels[role] || role;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="agents-page">
        <div className="agents-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading agents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agents-page">
      <div className="agents-container">
        {/* Header */}
        <div className="agents-header">
          <h1>Find Your Real Estate Agent</h1>
          <p>Connect with experienced professionals to help you buy, sell, or rent</p>
        </div>

        {/* Search and Filter */}
        <div className="agents-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search agents by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            className="filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Agents</option>
            <option value="realtor">Real Estate Agents</option>
            <option value="corporate">Corporate Agents</option>
          </select>
        </div>

        {/* Agents Grid */}
        {filteredAgents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No Agents Found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="agents-stats">
              Showing {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'}
            </div>

            <div className="agents-grid">
              {filteredAgents.map((agent) => (
                <div key={agent._id} className="agent-card">
                  <div className="agent-avatar">
                    {agent.avatar ? (
                      <img src={agent.avatar} alt={agent.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {getInitials(agent.name)}
                      </div>
                    )}
                    <div className="agent-status online"></div>
                  </div>

                  <div className="agent-info">
                    <h3 className="agent-name">{agent.name || 'Anonymous'}</h3>
                    <p className="agent-role">{getRoleLabel(agent.role)}</p>
                    {agent.company && (
                      <p className="agent-company">🏢 {agent.company}</p>
                    )}
                  </div>

                  <div className="agent-stats-row">
                    <div className="stat-item">
                      <span className="stat-value">{agent.totalListings || 0}</span>
                      <span className="stat-label">Listings</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{agent.totalViews || 0}</span>
                      <span className="stat-label">Views</span>
                    </div>
                  </div>

                  <div className="agent-contact">
                    <a href={`mailto:${agent.email}`} className="contact-btn email-btn">
                      📧 Email
                    </a>
                    {agent.phone && (
                      <a href={`tel:${agent.phone}`} className="contact-btn phone-btn">
                        📞 Call
                      </a>
                    )}
                  </div>

                  <button
                    className="view-listings-btn"
                    onClick={() => navigate(`/realtor/${agent._id}`)}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Agents;
