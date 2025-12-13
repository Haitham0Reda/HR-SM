import React from 'react';
import TenantList from './TenantList';

export default {
  title: 'Platform Admin/Tenants/TenantList',
  component: TenantList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'List view for managing multiple tenants in the platform administration interface.',
      },
    },
  },
  tags: ['autodocs'],
};

const mockTenants = [
  {
    id: '1',
    name: 'TechCorp Solutions',
    domain: 'techcorp.example.com',
    status: 'active',
    employees: 150,
    plan: 'enterprise',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Healthcare Plus',
    domain: 'healthcareplus.example.com',
    status: 'active',
    employees: 75,
    plan: 'professional',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Global Manufacturing Inc',
    domain: 'globalmfg.example.com',
    status: 'suspended',
    employees: 300,
    plan: 'enterprise',
    createdAt: '2024-01-10',
  },
];

export const Default = {
  args: {
    tenants: mockTenants,
  },
};

export const Empty = {
  args: {
    tenants: [],
  },
};

export const Loading = {
  args: {
    tenants: [],
    loading: true,
  },
};