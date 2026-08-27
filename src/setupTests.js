import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// 1. Mock global de Laravel Echo (evita que intente inicializar Pusher/Reverb)
vi.mock('laravel-echo', () => {
  return {
    default: class Echo {
      private() {
        return {
          listen: vi.fn().mockReturnThis(),
        };
      }
      channel() {
        return {
          listen: vi.fn().mockReturnThis(),
        };
      }
      leave() {}
    },
  };
});

// 2. React global para JSX
global.React = React;