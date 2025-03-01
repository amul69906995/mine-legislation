import React from 'react';
import './styles.css';
function Sidebar() {
  return (
    <div className="sidebar">
      <h2>Chats</h2>
      <ul>
        <li className="active">General</li>
        <li>Support</li>
        <li>Random</li>
      </ul>
    </div>
  );
}

export default Sidebar;
