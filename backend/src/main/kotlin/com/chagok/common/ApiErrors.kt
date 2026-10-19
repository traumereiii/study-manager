package com.chagok.common

import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.servlet.resource.NoResourceFoundException
import org.springframework.web.bind.ServletRequestBindingException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.HttpMediaTypeNotSupportedException
import java.util.UUID

class ApiException(val status: HttpStatus, val code: String, override val message: String) : RuntimeException(message)

data class ApiError(val code: String, val message: String, val fieldErrors: List<Any> = emptyList(), val traceId: String = UUID.randomUUID().toString())

fun invalid(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message)
fun conflict(code: String, message: String): Nothing = throw ApiException(HttpStatus.CONFLICT, code, message)
fun unauthorized(message: String = "유효한 인증 정보가 필요합니다."): Nothing =
    throw ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message)

@RestControllerAdvice
class ApiExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(ApiException::class)
    fun api(ex: ApiException): ResponseEntity<ApiError> = ResponseEntity.status(ex.status).body(ApiError(ex.code, ex.message))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun malformed(): ResponseEntity<ApiError> = ResponseEntity.badRequest().body(ApiError("VALIDATION_ERROR", "요청 JSON의 필드와 자료형을 확인해 주세요."))

    @ExceptionHandler(ServletRequestBindingException::class, MethodArgumentTypeMismatchException::class)
    fun binding(): ResponseEntity<ApiError> = ResponseEntity.badRequest().body(ApiError("VALIDATION_ERROR", "필수 요청 헤더와 매개변수를 확인해 주세요."))

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun method(): ResponseEntity<ApiError> = ResponseEntity.status(405).body(ApiError("METHOD_NOT_ALLOWED", "지원하지 않는 HTTP 메서드입니다."))

    @ExceptionHandler(HttpMediaTypeNotSupportedException::class)
    fun media(): ResponseEntity<ApiError> = ResponseEntity.status(415).body(ApiError("UNSUPPORTED_MEDIA_TYPE", "application/json 형식으로 요청해 주세요."))

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun integrity(): ResponseEntity<ApiError> = ResponseEntity.status(409).body(ApiError("DATA_CONFLICT", "데이터가 변경되었습니다. 다시 조회해 주세요."))

    @ExceptionHandler(NoResourceFoundException::class)
    fun missing(): ResponseEntity<ApiError> = ResponseEntity.status(404).body(ApiError("NOT_FOUND", "경로를 찾을 수 없습니다."))

    @ExceptionHandler(Exception::class)
    fun unexpected(ex: Exception): ResponseEntity<ApiError> {
        val error = ApiError("INTERNAL_ERROR", "요청 처리 중 오류가 발생했습니다.")
        // 예외 메시지에는 SQL 바인딩 값 등 사용자 데이터가 포함될 수 있다.
        log.error("request failed traceId={} exception={}", error.traceId, ex.javaClass.name)
        return ResponseEntity.internalServerError().body(error)
    }
}
