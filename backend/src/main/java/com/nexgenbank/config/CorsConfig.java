package com.nexgenbank.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS Configuration
 *
 * Permits cross-origin requests from any frontend to the Java REST API.
 * This is required because the frontend is served from a different origin
 * (GitHub Pages, Vercel, or localhost:5500) than the backend (localhost:8080).
 *
 * DEVELOPMENT:
 *   allowedOriginPatterns("*") — allows all origins including file:// protocol
 *   Used during local development or when frontend is opened directly in browser.
 *
 * PRODUCTION:
 *   Replace the wildcard with your specific GitHub Pages URL:
 *   .allowedOrigins("https://royalstar555.github.io")
 *   This prevents unauthorized origins from calling the API in production.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                // DEV: Accept any origin. PROD: lock to your GitHub Pages domain.
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                // Cannot use allowCredentials(true) with allowedOriginPatterns("*")
                .allowCredentials(false)
                // Cache preflight OPTIONS response for 1 hour (3600 seconds)
                .maxAge(3600);
    }
}
