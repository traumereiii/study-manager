import { DEFAULT_SETTINGS } from '@/constants'
import type { Book, Card, CardType, HistoryEntry, Level, Settings } from '@/types'
import { toDateKey } from '@/utils/date'

export interface MockDb {
  books: Book[]
  cards: Card[]
  history: HistoryEntry[]
  settings: Settings
  alarmLastDate: string
}

const circuitSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 170"><rect width="430" height="170" fill="#f7f8f3"/>' +
  '<g fill="none" stroke="#59724d" stroke-width="2.5"><path d="M90 65 V35 H205 l7 -10 12 20 12 -20 12 20 12 -20 7 10 H340 V135 H90 V105"/>' +
  '<circle cx="90" cy="85" r="20"/><path d="M83 78 H97 M90 71 V85 M84 94 H96"/></g>' +
  '<g fill="#526647" font-family="sans-serif" font-size="15"><text x="25" y="91">10 V</text>' +
  '<text x="218" y="75">5 Ω</text><text x="295" y="100">I = ?</text></g></svg>'
const circuitDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(circuitSvg)}`

type CardSeed = {
  type: CardType
  question: string
  answer: string
  explanation: string
  level: Level
  options?: string[]
  correct?: number
  assets?: Record<string, string>
}

const qa = (question: string, answer: string, explanation: string, level: Level): CardSeed => ({
  type: 'qa', question, answer, explanation, level,
})
const blank = (question: string, answer: string, explanation: string, level: Level): CardSeed => ({
  type: 'blank', question, answer, explanation, level,
})
const choice = (
  question: string, options: string[], correct: number, explanation: string, level: Level,
): CardSeed => ({ type: 'choice', question, options, correct, answer: options[correct], explanation, level })

const springCards: CardSeed[] = [
  qa('인증과 인가의 차이는 무엇인가요?', '인증은 누구인지 확인하고, 인가는 어떤 자원에 접근할 수 있는지 확인합니다.', '인증은 사용자의 신원을, 인가는 해당 사용자의 접근 권한을 확인하는 과정입니다.', 2),
  blank('사용자의 인증 정보를 담는 객체는\n______입니다.', 'Authentication', 'Authentication 객체는 사용자 정보, 자격 증명, 권한 등의 인증 관련 정보를 표현합니다.', 1),
  choice('사용자의 비밀번호를 안전하게 저장하기 위한 방법은?', ['평문으로 저장', '복호화 가능한 암호화만 사용', '적응형 단방향 해시 사용', 'Base64로 인코딩'], 2, 'bcrypt와 같은 적응형 단방향 해시를 사용합니다. 단순 인코딩은 비밀번호 보호 방법이 아닙니다.', 3),
  qa('CSRF 공격은 무엇인가요?', '인증된 사용자가 의도하지 않은 요청을 서버에 보내도록 유도하는 공격입니다.', '예를 들어 로그인한 브라우저가 공격자가 만든 페이지를 통해 상태 변경 요청을 보내도록 유도할 수 있습니다.', 4),
  qa('최소 권한 원칙은 무엇인가요?', '사용자나 시스템에 작업 수행에 꼭 필요한 최소한의 권한만 부여하는 원칙입니다.', '불필요한 접근 권한을 줄이면 계정 탈취나 실수로 인한 피해 범위를 제한할 수 있습니다.', 5),
  qa('`SecurityFilterChain`의 역할은 무엇인가요?', 'HTTP 요청에 적용될 보안 필터의 처리 순서를 정의합니다.', 'Spring Security의 여러 Filter가 `SecurityFilterChain`을 통해 순서대로 실행됩니다.', 2),
  blank('세션 고정 공격을 막기 위해 로그인 직후 세션 ______를 변경합니다.', 'ID', '`sessionFixation().changeSessionId()` 설정이 기본으로 적용됩니다.', 1),
  choice('CORS 에러가 발생하는 근본 원인은?', ['서버 CPU 부족', '브라우저의 동일 출처 정책', 'DNS 설정 오류', 'TLS 인증서 만료'], 1, '브라우저는 동일 출처 정책에 따라 다른 출처로의 응답 접근을 제한하며, 서버가 CORS 헤더로 이를 허용해야 합니다.', 3),
  qa('JWT 의 세 부분은 무엇인가요?', 'Header, Payload, Signature 입니다.', '각 부분은 Base64URL 로 인코딩되어 `.` 으로 연결됩니다. Payload 는 암호화되지 않으므로 민감 정보를 넣지 않습니다.', 2),
  blank('비밀번호 인코더 인터페이스 이름은 ______Encoder 입니다.', 'Password', '`PasswordEncoder` 는 `encode` 와 `matches` 메서드를 제공합니다.', 4),
  qa('`@PreAuthorize` 는 무엇을 하나요?', '메서드 실행 전에 SpEL 표현식으로 접근 권한을 검사합니다.', '`@EnableMethodSecurity` 를 켜야 동작합니다.', 1),
  choice('HTTP Basic 인증의 단점은?', ['서버 상태를 유지해야 한다', '자격 증명이 Base64 로만 인코딩되어 전송된다', '브라우저가 지원하지 않는다', 'GET 요청만 가능하다'], 1, 'Base64 는 암호화가 아니므로 반드시 HTTPS 와 함께 사용해야 합니다.', 2),
]

const circuitCards: CardSeed[] = [
  {
    type: 'qa',
    question: '다음 회로에서 저항에 흐르는 전류는?\n\n![10V 전압원과 5Ω 저항이 직렬로 연결된 회로](asset:img-circuit)',
    answer: '2 A',
    explanation: '옴의 법칙 I = V / R에 따라 10 V ÷ 5 Ω = 2 A입니다.',
    level: 1,
    assets: { 'img-circuit': circuitDataUrl },
  },
  blank('저항을 직렬로 연결하면 합성 저항은\n각 저항의 ______입니다.', '합', '직렬 회로에서는 모든 저항에 같은 전류가 흐르며, 합성 저항은 R₁ + R₂ + …입니다.', 2),
  choice('전기 저항의 단위는 무엇인가요?', ['볼트 (V)', '암페어 (A)', '옴 (Ω)', '와트 (W)'], 2, '볼트는 전압, 암페어는 전류, 와트는 전력의 단위입니다.', 4),
]

const networkCards: CardSeed[] = [
  blank('TCP는 ______ 프로토콜입니다.', '연결 지향형', 'TCP는 통신 전에 연결을 설정하고, 순서와 신뢰성을 보장하는 데이터 전송을 제공합니다.', 2),
  choice('도메인 이름을 IP 주소로 변환하는 시스템은?', ['HTTP', 'DNS', 'FTP', 'SMTP'], 1, 'DNS는 사람이 읽기 쉬운 도메인 이름을 IP 주소 등의 정보에 대응시킵니다.', 3),
  qa('IP 주소와 포트 번호는 각각 무엇을 식별하나요?', 'IP 주소는 네트워크상의 인터페이스를, 포트 번호는 해당 호스트의 통신 종단점을 구분합니다.', 'IP 주소로 목적지에 도달한 뒤 포트 번호를 통해 해당 서비스로 데이터를 전달합니다.', 1),
  qa('HTTPS에서 TLS는 어떤 역할을 하나요?', '통신 내용을 암호화하고 데이터의 무결성과 서버의 신원을 확인합니다.', 'TLS를 통해 전송 중 도청이나 데이터 변조의 위험을 줄일 수 있습니다.', 5),
]

const vocabCards: CardSeed[] = [
  qa('**ephemeral** 의 뜻은?', '하루살이처럼 짧게 지속되는, 덧없는', '명사형은 ephemera. 예: *ephemeral pleasures*', 1),
  qa('**meticulous** 의 뜻은?', '세심한, 꼼꼼한', '유의어: careful, thorough', 2),
]

const trashCards: CardSeed[] = [
  qa('OSI 7계층을 모두 말해 보세요.', '물리, 데이터링크, 네트워크, 전송, 세션, 표현, 응용', '아래에서 위로 "물데네전세표응" 으로 외우면 편합니다.', 1),
]

interface BookSeed {
  id: string
  name: string
  desc: string
  icon: string
  category: Book['category']
  color: string
  ink: string
  archived?: boolean
  deleted?: boolean
  cards: CardSeed[]
  /** 오늘로부터 며칠 전에 마지막으로 학습했는지 */
  lastStudyDaysAgo: number | null
  /** 오늘 학습을 마쳤는지 */
  completedToday?: boolean
}

const bookSeeds: BookSeed[] = [
  { id: 'spring', name: 'Spring Security', desc: '차근차근 이해하는 웹 보안', icon: '⌘', category: '개념', color: '#eaf1e2', ink: '#648346', cards: springCards, lastStudyDaysAgo: 1 },
  { id: 'circuit', name: '회로이론', desc: '기초부터 쌓는 회로의 원리', icon: 'ϟ', category: '개념', color: '#fcf0dd', ink: '#ba934b', cards: circuitCards, lastStudyDaysAgo: 0, completedToday: true },
  { id: 'network', name: '컴퓨터 네트워크', desc: '연결의 원리를 이해하는 시간', icon: '⊞', category: '용어', color: '#eaeef8', ink: '#7d88b5', cards: networkCards, lastStudyDaysAgo: 3 },
  { id: 'vocab', name: '영어 단어장', desc: '매일 두 단어씩 가볍게', icon: '◎', category: '단어', color: '#eaf1e2', ink: '#648346', cards: vocabCards, lastStudyDaysAgo: null, archived: true },
  { id: 'osi', name: '네트워크 요약 노트', desc: '이전에 정리한 요약', icon: '✎', category: '', color: '#eaf1e2', ink: '#648346', cards: trashCards, lastStudyDaysAgo: null, deleted: true },
]

/** 결정적인 의사 난수 (시드 데이터의 학습 기록을 매번 같게 만듭니다). */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function createSeed(now: Date = new Date()): MockDb {
  const books: Book[] = []
  const cards: Card[] = []
  const dayKey = (daysAgo: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    return toDateKey(date)
  }

  for (const seed of bookSeeds) {
    books.push({
      id: seed.id,
      name: seed.name,
      desc: seed.desc,
      icon: seed.icon,
      category: seed.category,
      color: seed.color,
      ink: seed.ink,
      archived: seed.archived === true,
      deleted: seed.deleted === true,
      lastStudy: seed.lastStudyDaysAgo == null ? null : dayKey(seed.lastStudyDaysAgo),
      completed: seed.completedToday ? dayKey(0) : null,
    })
    seed.cards.forEach((card, index) => {
      cards.push({
        id: `${seed.id}-card-${index}`,
        bookId: seed.id,
        type: card.type,
        question: card.question,
        answer: card.answer,
        explanation: card.explanation,
        options: card.options,
        correct: card.correct,
        level: card.level,
        assets: card.assets ?? {},
      })
    })
  }

  // 최근 7일 통계 그래프가 비어 보이지 않도록 예시 학습 기록을 만듭니다.
  const random = makeRandom(20260101)
  const history: HistoryEntry[] = []
  const perDay = [4, 7, 0, 5, 9, 6, 3]
  const studied = cards.filter((card) => ['spring', 'circuit', 'network'].includes(card.bookId))
  perDay.forEach((count, index) => {
    const daysAgo = 6 - index
    for (let i = 0; i < count; i += 1) {
      const card = studied[Math.floor(random() * studied.length)]
      const known = random() > 0.35
      const at = new Date(now)
      at.setDate(at.getDate() - daysAgo)
      at.setHours(19, 10 + i * 3, 0, 0)
      const revealMs = Math.round(4000 + random() * 12000)
      history.push({
        id: `seed-${daysAgo}-${i}`,
        bookId: card.bookId,
        cardId: card.id,
        date: dayKey(daysAgo),
        at: at.toISOString(),
        known,
        durationMs: revealMs + Math.round(1500 + random() * 6000),
        revealMs,
        levelAfter: card.level,
      })
    }
  })

  return { books, cards, history, settings: { ...DEFAULT_SETTINGS }, alarmLastDate: '' }
}
