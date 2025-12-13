import React from 'react';
import SystemHealth from './SystemHealth';

export default {
  title: 'Platform Admin/System/SystemHealth',
  component: SystemHealth,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'System health monitoring component showing platform status, performance metrics, and alerts.',
      },
    },
  },
  tags: ['autodocs'],
};

const mockHealthData = {
  status: 'healthy',
  uptime: '99.9%',
  responseTime: '120ms',
  activeUsers: 1247,
  systemLoad: 65,
  memoryUsage: 78,
  diskUsage: 45,
  services: [
    { name: 'Database', status: 'healthy', responseTime: '5ms' },
    { name: 'API Gateway', status: 'healthy', responseTime: '15ms' },
    { name: 'Authentication', status: 'healthy', responseTime: '8ms' },
    { name: 'File Storage', status: 'warning', responseTime: '250ms' },
  ],
};

export const Healthy = {
  args: {
    healthData: mockHealthData,
  },
};

export const Warning = {
  args: {
    healthData: {
      ...mockHealthData,
      status: 'warning',
      systemLoad: 85,
      memoryUsage: 92,
      services: [
        ...mockHealthData.services.slice(0, 3),
        { name: 'File Storage', status: 'error', responseTime: '1200ms' },
      ],
    },
  },
};

export const Critical = {
  args: {
    healthData: {
      ...mockHealthData,
      status: 'critical',
      uptime: '97.2%',
      responseTime: '850ms',
      systemLoad: 95,
      memoryUsage: 98,
      diskUsage: 89,
      services: mockHealthData.services.map(service => ({
        ...service,
        status: service.name === 'Database' ? 'error' : 'warning',
        responseTime: service.name === 'Database' ? '2500ms' : service.responseTime,
      })),
    },
  },
};