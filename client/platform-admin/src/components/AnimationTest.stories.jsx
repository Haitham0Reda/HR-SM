import React from 'react';
import AnimationTest from './AnimationTest';

export default {
  title: '2. Platform Admin/Components/AnimationTest',
  component: AnimationTest,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Simple animation test to verify CSS animations are working properly.',
      },
    },
  },
};

export const Default = () => <AnimationTest />;