const config = {
    ENVIRONMENT: import.meta.env.VITE_ENV || 'development',
    GA: import.meta.env.VITE_GA_TRACKING_ID || null,
}

export const AppConfig = {
    ...config
};