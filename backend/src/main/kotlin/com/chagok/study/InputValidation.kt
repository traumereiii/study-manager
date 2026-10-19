package com.chagok.study

import com.chagok.common.invalid
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.util.Base64
import javax.imageio.ImageIO
import javax.imageio.stream.MemoryCacheImageInputStream

data class ValidatedAsset(val id: String, val mime: String, val content: ByteArray)
data class ValidatedCard(val input: CardInput, val assets: List<ValidatedAsset>)

@Component
class InputValidation {
    private val icons = setOf("▤", "⌘", "ϟ", "⊞", "✎", "∑", "◎", "⚗", "♫", "★")
    private val keys = setOf("Space", "Enter", "1", "2", "3", "a", "s", "d", "j", "k", "l")
    private val references = Regex("asset:(img-[\\w-]+)")

    fun book(input: BookInput): BookInput {
        val value = input.copy(name = input.name.trim(), desc = input.desc.trim())
        if (value.name.isEmpty() || value.name.length > 60) invalid("문제집 이름을 1~60자로 입력해 주세요.")
        if (value.desc.length > 160) invalid("한 줄 소개는 160자 이하로 입력해 주세요.")
        if (value.category !in setOf("", "단어", "용어", "개념")) invalid("문제집 분류를 확인해 주세요.")
        if (value.icon !in icons) invalid("아이콘을 목록에서 선택해 주세요.")
        return value
    }

    fun card(input: CardInput): ValidatedCard {
        var value = input.copy(question = input.question.trim(), explanation = input.explanation.trim())
        if (value.type !in setOf("qa", "blank", "choice")) invalid("문제 유형을 선택해 주세요.")
        if (value.question.isEmpty() || value.question.length > 20000) invalid("문제 내용을 1~20,000자로 입력해 주세요.")
        if (value.explanation.length > 20000) invalid("해설은 20,000자 이하로 입력해 주세요.")
        if (value.type == "blank" && !Regex("_{2,}").containsMatchIn(value.question)) invalid("빈칸은 밑줄 두 개 이상으로 표시해 주세요.")
        if (value.type == "choice") {
            val options = value.options?.map(String::trim) ?: invalid("보기 4개를 입력해 주세요.")
            if (options.size != 4 || options.any { it.isEmpty() || it.length > 5000 } || options.toSet().size != 4) invalid("서로 다른 보기 4개를 각각 1~5,000자로 입력해 주세요.")
            val correct = value.correct?.takeIf { it in 0..3 } ?: invalid("정답인 보기를 선택해 주세요.")
            value = value.copy(options = options, answer = options[correct])
        } else {
            val answer = value.answer.trim()
            if (answer.isEmpty() || answer.length > 20000) invalid("정답을 1~20,000자로 입력해 주세요.")
            value = value.copy(answer = answer, options = null, correct = null)
        }
        val content = (listOf(value.question, value.answer, value.explanation) + (value.options ?: emptyList())).joinToString("\n")
        val ids = references.findAll(content).map { it.groupValues[1] }.toSet()
        if (ids.size > 5) invalid("카드에는 이미지를 최대 5개 첨부할 수 있습니다.")
        val assets = ids.map { id ->
            if (id.length > 100) invalid("이미지 ID가 너무 깁니다.")
            image(id, value.assets[id] ?: invalid("참조한 이미지를 찾을 수 없습니다: $id"))
        }
        if (assets.sumOf { it.content.size.toLong() } > 10L * 1024 * 1024) invalid("카드 이미지 합계는 10 MiB 이하만 가능합니다.")
        return ValidatedCard(value.copy(assets = emptyMap()), assets)
    }

    private fun image(id: String, data: String): ValidatedAsset {
        val comma = data.indexOf(',')
        if (comma < 0 || comma > 40 || data.length > 2 * 1024 * 1024 * 4 / 3 + 100) invalid("이미지 형식 또는 크기를 확인해 주세요.")
        val mime = when (data.substring(0, comma)) {
            "data:image/png;base64" -> "image/png"
            "data:image/jpeg;base64" -> "image/jpeg"
            "data:image/webp;base64" -> "image/webp"
            else -> invalid("PNG, JPEG, WebP 이미지만 첨부할 수 있습니다.")
        }
        val bytes = try { Base64.getDecoder().decode(data.substring(comma + 1)) } catch (_: IllegalArgumentException) { invalid("이미지 Base64가 올바르지 않습니다.") }
        if (bytes.isEmpty() || bytes.size > 2 * 1024 * 1024) invalid("이미지는 2 MiB 이하만 가능합니다.")
        try {
            MemoryCacheImageInputStream(ByteArrayInputStream(bytes)).use { stream ->
                val readers = ImageIO.getImageReaders(stream)
                if (!readers.hasNext()) invalid("이미지를 읽을 수 없습니다.")
                val reader = readers.next()
                try {
                    reader.input = stream
                    val format = reader.formatName.lowercase()
                    val expected = mime.substringAfter('/').let { if (it == "jpeg") setOf("jpeg", "jpg") else setOf(it) }
                    if (format !in expected) invalid("이미지 내용과 MIME 형식이 일치하지 않습니다.")
                    val pixels = reader.getWidth(0).toLong() * reader.getHeight(0)
                    if (pixels !in 1..40_000_000L) invalid("이미지 해상도는 4천만 픽셀 이하여야 합니다.")
                    if (reader.read(0) == null) invalid("손상된 이미지입니다.")
                } finally { reader.dispose() }
            }
        } catch (ex: com.chagok.common.ApiException) { throw ex }
        catch (_: Exception) { invalid("손상되었거나 지원하지 않는 이미지입니다.") }
        return ValidatedAsset(id, mime, bytes)
    }

    fun settings(input: SettingsInput): SettingsInput {
        val selected = listOf(input.reveal, input.unknown, input.known)
        if (selected.toSet().size != 3 || selected.any { it !in keys }) invalid("단축키는 목록에서 서로 다른 키를 선택해 주세요.")
        if (!Regex("([01]\\d|2[0-3]):[0-5]\\d").matches(input.alarmTime)) invalid("올바른 알림 시각을 입력해 주세요.")
        if (input.timeLimit !in 0..600) invalid("제한시간은 0~600 사이의 정수여야 합니다.")
        return input
    }

    fun evaluation(input: EvaluationInput) {
        if (input.durationMs !in 0..86_400_000L || (input.revealMs != null && input.revealMs !in 0..input.durationMs)) invalid("학습 시간과 정답 공개 시간을 확인해 주세요.")
    }
}
