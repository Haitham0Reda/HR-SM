import React from 'react';
import AnimationVerification from './AnimationVerification';

export default {
  title: '2. Platform Admin/Components/AnimationVerification',
  component: AnimationVerification,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Simple animation verification test using the Login page color palette.',
      },
    },
  },
};

export const Default = () => <AnimationVerification />;