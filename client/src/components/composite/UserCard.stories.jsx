import React from 'react';
import UserCard from './UserCard';

export default {
  title: 'Composite Components/UserCard',
  component: UserCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Sample users
const sampleUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    status: 'active',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Manager',
    status: 'active',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'Employee',
    status: 'inactive',
  },
  {
    id: 4,
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    role: 'HR',
    status: 'active',
  },
  {
    id: 5,
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    role: 'Employee',
    status: 'pending',
  },
];

// Basic user card
export const Basic = () => (
  <div style={{ width: '350px' }}>
    <UserCard
      user={sampleUsers[0]}
      onView={(user) => alert(`View ${user.name}`)}
      onEdit={(user) => alert(`Edit ${user.name}`)}
      onDelete={(user) => alert(`Delete ${user.name}`)}
    />
  </div>
);

// Different roles
export const DifferentRoles = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
    {sampleUsers.map((user) => (
      <UserCard
        key={user.id}
        user={user}
        onView={(user) => console.log('View', user)}
        onEdit={(user) => console.log('Edit', user)}
        onDelete={(user) => console.log('Delete', user)}
      />
    ))}
  </div>
);

// Without actions
export const WithoutActions = () => (
  <div style={{ width: '350px' }}>
    <UserCard user={sampleUsers[0]} />
  </div>
);

// With only view action
export const WithOnlyViewAction = () => (
  <div style={{ width: '350px' }}>
    <UserCard
      user={sampleUsers[0]}
      onView={(user) => alert(`View ${user.name}`)}
    />
  </div>
);

// With only edit action
export const WithOnlyEditAction = () => (
  <div style={{ width: '350px' }}>
    <UserCard
      user={sampleUsers[0]}
      onEdit={(user) => alert(`Edit ${user.name}`)}
    />
  </div>
);

// Active users
export const ActiveUsers = () => {
  const activeUsers = sampleUsers.filter(user => user.status === 'active');
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
      {activeUsers.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onView={(user) => console.log('View', user)}
          onEdit={(user) => console.log('Edit', user)}
          onDelete={(user) => console.log('Delete', user)}
        />
      ))}
    </div>
  );
};

// Pending users
export const PendingUsers = () => {
  const pendingUsers = sampleUsers.filter(user => user.status === 'pending');
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
      {pendingUsers.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onView={(user) => console.log('View', user)}
          onEdit={(user) => console.log('Edit', user)}
          onDelete={(user) => console.log('Delete', user)}
        />
      ))}
    </div>
  );
};

// Admin users
export const AdminUsers = () => {
  const adminUsers = sampleUsers.filter(user => user.role.toLowerCase() === 'admin');
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
      {adminUsers.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onView={(user) => console.log('View', user)}
          onEdit={(user) => console.log('Edit', user)}
          onDelete={(user) => console.log('Delete', user)}
        />
      ))}
    </div>
  );
};

// Team grid
export const TeamGrid = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
    gap: '24px',
    maxWidth: '1200px'
  }}>
    {sampleUsers.map((user) => (
      <UserCard
        key={user.id}
        user={user}
        onView={(user) => alert(`View ${user.name}`)}
        onEdit={(user) => alert(`Edit ${user.name}`)}
        onDelete={(user) => alert(`Delete ${user.name}`)}
      />
    ))}
  </div>
);

// With long email
export const WithLongEmail = () => (
  <div style={{ width: '350px' }}>
    <UserCard
      user={{
        id: 1,
        name: 'John Doe',
        email: 'john.doe.with.very.long.email@example.company.com',
        role: 'Admin',
        status: 'active',
      }}
      onView={(user) => alert(`View ${user.name}`)}
      onEdit={(user) => alert(`Edit ${user.name}`)}
      onDelete={(user) => alert(`Delete ${user.name}`)}
    />
  </div>
);

// With long name
export const WithLongName = () => (
  <div style={{ width: '350px' }}>
    <UserCard
      user={{
        id: 1,
        name: 'John Alexander Christopher Doe',
        email: 'john@example.com',
        role: 'Employee',
        status: 'active',
      }}
      onView={(user) => alert(`View ${user.name}`)}
      onEdit={(user) => alert(`Edit ${user.name}`)}
      onDelete={(user) => alert(`Delete ${user.name}`)}
    />
  </div>
);

// Responsive grid
export const ResponsiveGrid = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
    gap: '20px',
    padding: '20px'
  }}>
    {sampleUsers.map((user) => (
      <UserCard
        key={user.id}
        user={user}
        onView={(user) => console.log('View', user)}
        onEdit={(user) => console.log('Edit', user)}
        onDelete={(user) => console.log('Delete', user)}
      />
    ))}
  </div>
);
