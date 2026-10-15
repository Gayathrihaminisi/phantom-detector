import { ManagerProfile, AuthState } from '../types';

const STORAGE_KEY_AUTH = 'phantom_stock_auth_session';
const STORAGE_KEY_MANAGER = 'phantom_stock_manager_profile';
const STORAGE_KEY_ONBOARDING_STEP = 'phantom_stock_onboarding_step';
const STORAGE_KEY_ONBOARDING_DONE = 'phantom_stock_onboarding_completed';

export const DEMO_CREDENTIALS = {
  email: 'demo@phantomstock.com',
  password: 'Demo@1234',
  fullName: 'Rajesh Sharma',
  supermarketName: 'Heritage Mart - Koramangala',
  supermarketLocation: 'Bengaluru, Karnataka',
  contactNumber: '+91 98450 12345',
};

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getInitialState(): AuthState {
    try {
      const isAuthStr = localStorage.getItem(STORAGE_KEY_AUTH);
      const managerStr = localStorage.getItem(STORAGE_KEY_MANAGER);
      const onboardingDoneStr = localStorage.getItem(STORAGE_KEY_ONBOARDING_DONE);
      const currentStepStr = localStorage.getItem(STORAGE_KEY_ONBOARDING_STEP);

      const isAuthenticated = isAuthStr === 'true';
      const manager: ManagerProfile | null = managerStr ? JSON.parse(managerStr) : null;
      const onboardingCompleted = onboardingDoneStr === 'true';
      const currentOnboardingStep = currentStepStr ? parseInt(currentStepStr, 10) : 1;

      return {
        isAuthenticated: isAuthenticated && manager !== null,
        manager: isAuthenticated ? manager : null,
        rememberMe: true,
        onboardingCompleted,
        currentOnboardingStep: isNaN(currentOnboardingStep) ? 1 : currentOnboardingStep,
      };
    } catch {
      return {
        isAuthenticated: false,
        manager: null,
        rememberMe: true,
        onboardingCompleted: false,
        currentOnboardingStep: 1,
      };
    }
  }

  public register(data: {
    fullName: string;
    email: string;
    supermarketName: string;
    supermarketLocation?: string;
    contactNumber?: string;
  }): ManagerProfile {
    const manager: ManagerProfile = {
      id: 'mgr_' + Date.now(),
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      supermarketName: data.supermarketName.trim(),
      supermarketLocation: data.supermarketLocation?.trim() || 'Central Branch',
      contactNumber: data.contactNumber?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    // Store non-sensitive profile (never passwords)
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    localStorage.setItem(STORAGE_KEY_MANAGER, JSON.stringify(manager));
    localStorage.setItem(STORAGE_KEY_ONBOARDING_DONE, 'false');
    localStorage.setItem(STORAGE_KEY_ONBOARDING_STEP, '1');

    return manager;
  }

  public loginWithDemo(): ManagerProfile {
    return this.register({
      fullName: DEMO_CREDENTIALS.fullName,
      email: DEMO_CREDENTIALS.email,
      supermarketName: DEMO_CREDENTIALS.supermarketName,
      supermarketLocation: DEMO_CREDENTIALS.supermarketLocation,
      contactNumber: DEMO_CREDENTIALS.contactNumber,
    });
  }

  public login(email: string, _passwordPlain: string, rememberMe: boolean = true): ManagerProfile | null {
    const existingStr = localStorage.getItem(STORAGE_KEY_MANAGER);
    let manager: ManagerProfile;

    if (existingStr) {
      try {
        manager = JSON.parse(existingStr);
      } catch {
        manager = {
          id: 'mgr_demo',
          fullName: 'Rajesh Sharma',
          email: email.toLowerCase(),
          supermarketName: 'Heritage Supermart',
          supermarketLocation: 'Bengaluru',
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      // Mock login accepted for hackathon demo
      manager = {
        id: 'mgr_' + Date.now(),
        fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Store Manager',
        email: email.toLowerCase(),
        supermarketName: 'Reliance Fresh Superstore',
        supermarketLocation: 'Indiranagar, Bengaluru',
        createdAt: new Date().toISOString(),
      };
    }

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      localStorage.setItem(STORAGE_KEY_MANAGER, JSON.stringify(manager));
    } else {
      sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
      sessionStorage.setItem(STORAGE_KEY_MANAGER, JSON.stringify(manager));
    }

    return manager;
  }

  public updateManagerProfile(updates: Partial<ManagerProfile>): ManagerProfile | null {
    const existingStr = localStorage.getItem(STORAGE_KEY_MANAGER);
    if (!existingStr) return null;
    try {
      const current = JSON.parse(existingStr);
      const updated = { ...current, ...updates };
      localStorage.setItem(STORAGE_KEY_MANAGER, JSON.stringify(updated));
      return updated;
    } catch {
      return null;
    }
  }

  public setOnboardingStep(step: number): void {
    localStorage.setItem(STORAGE_KEY_ONBOARDING_STEP, step.toString());
  }

  public completeOnboarding(): void {
    localStorage.setItem(STORAGE_KEY_ONBOARDING_DONE, 'true');
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    // Keep manager profile for convenient re-login if desired, or can remove
  }
}

export const authService = AuthService.getInstance();
