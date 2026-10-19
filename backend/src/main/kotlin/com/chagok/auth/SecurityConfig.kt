package com.chagok.auth

import com.chagok.common.ApiError
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import tools.jackson.databind.ObjectMapper

@Configuration
class SecurityConfig {
    @Bean
    fun security(http: HttpSecurity, tokens: JwtTokens, mapper: ObjectMapper): SecurityFilterChain {
        // 브라우저 자동 전송 쿠키를 사용하지 않고 Authorization Bearer 헤더만 받는다.
        http.csrf { it.disable() }
            .cors(Customizer.withDefaults())
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .requestCache { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { it.disable() }
            .authorizeHttpRequests {
                it.requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                    .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                    .anyRequest().authenticated()
            }
            .exceptionHandling {
                it.authenticationEntryPoint { _, response, _ ->
                    response.status = 401
                    response.contentType = "application/json;charset=UTF-8"
                    mapper.writeValue(response.outputStream, ApiError("UNAUTHORIZED", "로그인이 필요합니다."))
                }
                it.accessDeniedHandler { _, response, _ ->
                    response.status = 403
                    response.contentType = "application/json;charset=UTF-8"
                    mapper.writeValue(response.outputStream, ApiError("FORBIDDEN", "접근 권한이 없습니다."))
                }
            }
            .oauth2ResourceServer {
                it.jwt { jwt -> jwt.decoder(tokens.accessDecoder()) }
                it.authenticationEntryPoint { _, response, _ ->
                    response.status = 401
                    response.contentType = "application/json;charset=UTF-8"
                    mapper.writeValue(response.outputStream, ApiError("UNAUTHORIZED", "AccessToken이 유효하지 않거나 만료되었습니다."))
                }
            }
        return http.build()
    }

    @Bean
    fun cors(@Value("\${app.cors-origins}") origins: String) = UrlBasedCorsConfigurationSource().apply {
        registerCorsConfiguration("/**", CorsConfiguration().apply {
            allowedOrigins = origins.split(',').map(String::trim)
            allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type", "Idempotency-Key")
            allowCredentials = false
            maxAge = 3600
        })
    }
}
