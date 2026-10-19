package com.chagok.auth

import com.chagok.common.unauthorized
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(private val auth: AuthService) {
    @PostMapping("/login")
    fun login(@RequestBody input: LoginInput) = auth.login(input)

    @PostMapping("/refresh")
    fun refresh(@RequestBody input: RefreshInput) = auth.refresh(input)

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(@AuthenticationPrincipal jwt: Jwt) = auth.logout(jwt.getClaimAsString("sid") ?: unauthorized())

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal jwt: Jwt) = mapOf("username" to jwt.subject)
}
