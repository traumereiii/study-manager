package com.chagok.common

import jakarta.servlet.FilterChain
import jakarta.servlet.ReadListener
import jakarta.servlet.ServletInputStream
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletRequestWrapper
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import tools.jackson.databind.ObjectMapper
import java.io.ByteArrayInputStream

/** Tomcat의 form 크기 제한은 JSON 요청에 적용되지 않으므로 실제 읽은 바이트도 제한한다. */
@Component
@Order(0)
class RequestSizeFilter(private val mapper: ObjectMapper) : OncePerRequestFilter() {
    private val maximum = 16 * 1024 * 1024

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        if (request.method !in setOf("POST", "PUT", "PATCH")) {
            chain.doFilter(request, response)
            return
        }
        if (request.contentLengthLong > maximum) {
            tooLarge(response)
            return
        }
        val bytes = request.inputStream.readNBytes(maximum + 1)
        if (bytes.size > maximum) {
            tooLarge(response)
            return
        }
        val wrapped = object : HttpServletRequestWrapper(request) {
            override fun getInputStream(): ServletInputStream {
                val stream = ByteArrayInputStream(bytes)
                return object : ServletInputStream() {
                    override fun read(): Int = stream.read()
                    override fun read(b: ByteArray, off: Int, len: Int): Int = stream.read(b, off, len)
                    override fun isFinished(): Boolean = stream.available() == 0
                    override fun isReady(): Boolean = true
                    override fun setReadListener(listener: ReadListener) {
                        if (isFinished) listener.onAllDataRead() else listener.onDataAvailable()
                    }
                }
            }
        }
        chain.doFilter(wrapped, response)
    }

    private fun tooLarge(response: HttpServletResponse) {
        response.status = 413
        response.contentType = "application/json;charset=UTF-8"
        mapper.writeValue(response.outputStream, ApiError("PAYLOAD_TOO_LARGE", "요청 본문은 16 MiB 이하만 가능합니다."))
    }
}
