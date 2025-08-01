import { createContext } from 'react';
import type { NotificationSetter } from '../types/types';
export const NotificationContext = createContext<NotificationSetter | null>(null);