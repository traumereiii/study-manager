import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useBookStore } from '@/stores/books'

/** 경로의 문제집을 찾습니다. 없으면 목록으로 돌려보냅니다. */
export function useRequiredBook(getId: () => string) {
  const books = useBookStore()
  const router = useRouter()
  const book = computed(() => books.getBook(getId()))

  watchEffect(() => {
    if (!book.value) void router.replace('/books')
  })

  return book
}
