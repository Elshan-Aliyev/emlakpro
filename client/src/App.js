import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './pages/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Properties from './pages/Properties';
import CreateProperty from './pages/CreateProperty';
import UpdateProperty from './pages/UpdateProperty';
import PropertyList from './pages/PropertyList';
import Profile from './pages/Profile';
import Users from './pages/Users';
import UserList from './pages/UserList';
import UpdateUser from './pages/UpdateUser';
import DeleteUser from './pages/DeleteUser';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/create" element={<CreateProperty />} />
        <Route path="/properties/update/:id" element={<UpdateProperty />} />
        <Route path="/properties/list" element={<PropertyList />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/list" element={<UserList />} />
        <Route path="/users/update/:id" element={<UpdateUser />} />
        <Route path="/users/delete/:id" element={<DeleteUser />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
