# KuryemiBul Mobile — Design QA & Developer Handoff Package
**Version:** 1.0 · **Date:** 2026-06-17 · **Status:** Production Ready

---

## SECTION 1 — DESIGN TOKEN DOCUMENTATION

### 1.1 Color Tokens

All tokens defined in `assets/css/mobile-design-system.css` → `:root`.

#### Brand / Primary (Electric Blue)
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-blue-900` | `#1e3a8a` | Deep background accents |
| `--kb-blue-800` | `#1e40af` | Pressed states |
| `--kb-blue-700` | `#1d4ed8` | — |
| `--kb-blue-600` | `#2563eb` | Primary Dark (CTA hover) |
| `--kb-blue-500` | `#3b82f6` | **Primary Main — default interactive color** |
| `--kb-blue-400` | `#60a5fa` | Primary Light — text on dark, active icons |
| `--kb-blue-300` | `#93c5fd` | Muted links |
| `--kb-blue-200` | `#bfdbfe` | — |
| `--kb-blue-100` | `#dbeafe` | Faint tint backgrounds |

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-success` | `#22c55e` | Confirmed states, verified badges |
| `--kb-success-dim` | `rgba(34,197,94,0.12)` | Background tint |
| `--kb-success-bd` | `rgba(34,197,94,0.25)` | Border |
| `--kb-warning` | `#f59e0b` | Pending states, premium badges |
| `--kb-warning-dim` | `rgba(245,158,11,0.12)` | Background tint |
| `--kb-warning-bd` | `rgba(245,158,11,0.25)` | Border |
| `--kb-error` | `#ef4444` | Errors, rejection, unread badge |
| `--kb-error-dim` | `rgba(239,68,68,0.12)` | Background tint |
| `--kb-error-bd` | `rgba(239,68,68,0.25)` | Border |
| `--kb-info` | `#3b82f6` | Info states (same as blue-500) |
| `--kb-info-dim` | `rgba(59,130,246,0.12)` | Background tint |
| `--kb-info-bd` | `rgba(59,130,246,0.25)` | Border |

#### Surface System (Dark Premium — default)
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-bg` | `#0a0a0a` | Page background |
| `--kb-surface-1` | `#141414` | Secondary surface (page headers) |
| `--kb-surface-2` | `#1c1c1c` | **Cards — primary card background** |
| `--kb-surface-3` | `#242424` | Elevated surface (dropdowns, tooltips) |
| `--kb-surface-4` | `#2e2e2e` | Hover state on cards |
| `--kb-border` | `#2a2a2a` | Default border |
| `--kb-border-2` | `#383838` | Emphasis / hover border |

#### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-text-1` | `#f8fafc` | Primary text — headings, labels |
| `--kb-text-2` | `#94a3b8` | Secondary text — descriptions |
| `--kb-text-3` | `#64748b` | Tertiary / captions / metadata |
| `--kb-text-inv` | `#0a0a0a` | Text on blue backgrounds |

#### Light Theme Overrides (`[data-theme="light"]`)
| Token | Value |
|-------|-------|
| `--kb-bg` | `#f8fafc` |
| `--kb-surface-1` | `#f1f5f9` |
| `--kb-surface-2` | `#ffffff` |
| `--kb-surface-3` | `#f8fafc` |
| `--kb-surface-4` | `#e2e8f0` |
| `--kb-border` | `#e2e8f0` |
| `--kb-border-2` | `#cbd5e1` |
| `--kb-text-1` | `#0f172a` |
| `--kb-text-2` | `#475569` |
| `--kb-text-3` | `#94a3b8` |

#### Gradients
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-grad` | `linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)` | Main brand gradient |
| `--kb-grad-h` | `linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)` | Horizontal (bottom nav active bar) |
| `--kb-grad-diag` | `linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)` | Avatars, send button, mine bubbles |
| `--kb-grad-success` | `linear-gradient(135deg, #16a34a 0%, #22c55e 100%)` | Success states |
| `--kb-grad-glow` | `rgba(59,130,246,0.15)` | Glow effect behind cards |

---

### 1.2 Spacing Tokens (4px base grid)
| Token | Value |
|-------|-------|
| `--kb-s-1` | `4px` |
| `--kb-s-2` | `8px` |
| `--kb-s-3` | `12px` |
| `--kb-s-4` | `16px` |
| `--kb-s-5` | `20px` |
| `--kb-s-6` | `24px` |
| `--kb-s-8` | `32px` |
| `--kb-s-10` | `40px` |
| `--kb-s-12` | `48px` |
| `--kb-s-16` | `64px` |

---

### 1.3 Border Radius Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-r-xs` | `8px` | Input fields, small chips |
| `--kb-r-sm` | `12px` | Buttons, badges, small cards |
| `--kb-r-md` | `16px` | Medium cards, stat chips |
| `--kb-r-lg` | `20px` | Primary cards, panels |
| `--kb-r-xl` | `24px` | Large modals, sheets |
| `--kb-r-2xl` | `32px` | Full-width hero elements |
| `--kb-r-full` | `9999px` | Pills, level chips, avatar circles |

---

### 1.4 Shadow Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | Floating elements |
| `--kb-shadow-md` | `0 4px 20px rgba(0,0,0,0.4)` | Cards on hover |
| `--kb-shadow-lg` | `0 8px 40px rgba(0,0,0,0.5)` | Modals, sheets |
| `--kb-shadow-xl` | `0 16px 64px rgba(0,0,0,0.6)` | Full-screen sheets |
| `--kb-shadow-blue` | `0 4px 24px rgba(59,130,246,0.18)` | Branded elements, active avatars |
| `--kb-shadow-glow` | `0 0 40px rgba(59,130,246,0.12)` | Featured cards glow |

---

### 1.5 Typography System
| Class | Size | Weight | Line Height | Token |
|-------|------|--------|-------------|-------|
| `.kb-h1` | clamp(1.75rem–2.25rem) | 700 | 1.1 | `--kb-font-display` |
| `.kb-h2` | clamp(1.4rem–1.75rem) | 700 | 1.15 | `--kb-font-display` |
| `.kb-h3` | clamp(1.1rem–1.35rem) | 600 | 1.25 | `--kb-font-display` |
| `.kb-body` | 1rem / 16px | 400 | 1.6 | `--kb-font-body` |
| `.kb-body-sm` | 0.875rem / 14px | 400 | 1.55 | `--kb-font-body` |
| `.kb-caption` | 0.75rem / 12px | 500 | 1.4 | `--kb-font-body` |
| `.kb-label` | 0.6875rem / 11px | 700 | 1 | uppercase, letter-spacing 0.07em |

**Fonts:** `'Inter'` (body) · `'Space Grotesk'` (display/headings) · both loaded via Google Fonts or system-ui fallback.

**Mobile Dashboard specifics:**
- Greeting: 0.7rem, `--kb-text-3`, weight 600
- Name: 1.25rem, `--kb-font-display`, weight 800
- Stat value: 1.3rem, `--kb-font-display`, weight 800
- Stat label: 0.55rem, uppercase, weight 800, letter-spacing 0.06em

---

### 1.6 Touch Target Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-touch` | `44px` | Standard minimum touch target (WCAG 2.5.5) |
| `--kb-touch-lg` | `52px` | Primary CTAs, important actions |

---

### 1.7 Motion Tokens (from `mobile-motion.css`)
| Token | Value | Usage |
|-------|-------|-------|
| `--kb-dur-instant` | `80ms` | Immediate feedback (tap state) |
| `--kb-dur-fast` | `150ms` | Color transitions, hover |
| `--kb-dur-base` | `250ms` | Standard transitions |
| `--kb-dur-slow` | `400ms` | Page enter, large transitions |
| `--kb-dur-slower` | `600ms` | Badge reveals, complex sequences |
| `--kb-dur-reveal` | `800ms` | Score fills, onboarding |
| `--kb-ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Entering elements |
| `--kb-ease-in` | `cubic-bezier(0.4, 0.0, 1, 1)` | Exiting elements |
| `--kb-ease-inout` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Standard transitions |
| `--kb-ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.1)` | Bouncy feedback, badge pop |
| `--kb-ease-snap` | `cubic-bezier(0.0, 0.7, 0.3, 1.0)` | Bottom sheet |

#### Keyframe Library
| Name | Effect | Used For |
|------|--------|---------|
| `kb-page-enter` | Fade + translateY(14px→0) | Page load, section reveal |
| `kb-page-exit` | Fade + translateY(0→-8px) | Page leave |
| `kb-fade-in` | Opacity 0→1 | Simple reveals |
| `kb-slide-up-sheet` | translateY(100%→0) | Bottom sheet open |
| `kb-pop` | Scale 0.78→1.04→1 | Success button, badge appear |
| `kb-bounce-soft` | Scale 1→0.95→1.02→1 | Nav icon tap |
| `kb-shake` | translateX oscillation | Error feedback |
| `kb-draw` | stroke-dashoffset 50→0 | Checkmark draw |
| `kb-badge-reveal` | Scale+rotate from 0 | New badge earned |
| `kb-score-fill` | scaleX 0→1 | Progress bar fill |
| `kb-status-flash` | Opacity 1→0.5→1 | Status update flash |
| `kb-msg-mine` | translateX(10px)+scale | Outgoing message appear |
| `kb-msg-theirs` | translateX(-10px)+scale | Incoming message appear |
| `kb-notif-in` | translateX(100%→0) | New notification push |
| `kb-banner-drop` | translateY(-110%→0) | In-app notification banner |
| `kb-spin-motion` | rotate 0→360 | Spinner |
| `kb-pulse-ring` | box-shadow pulse | Unread dot, verify ring |
| `kb-typing-bounce` | translateY bounce | Typing indicator dots |
| `kb-chip-appear` | scale+translateY | Filter chip appear |
| `kb-tab-enter` | translateY(7px→0) | Tab content, field errors |
| `kb-num-up` | translateY(6px→0) | Counter update |
| `kb-shimmer-sweep` | background-position | Skeleton loading |

---

### 1.8 Mobile-Specific System Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--bottom-nav-height` | `64px` | Bottom navigation bar height |
| `--safe-area-bottom` | `env(safe-area-inset-bottom, 0px)` | iPhone notch bottom padding |
| `--safe-area-top` | `env(safe-area-inset-top, 0px)` | iPhone notch top padding |

---

## SECTION 2 — COMPONENT INVENTORY & NAMING SYSTEM

### 2.1 Navigation Components

#### `BottomNavigation`
**File:** `assets/js/components.js` → `renderBottomNav()` · **CSS:** `assets/css/mobile-ux.css`

Structure: 5 tabs, SVG icons only, text labels below.
Active state: cyan/blue top gradient bar (3px) + `--kb-blue-400` color + `kb-bounce-soft` animation on icon.

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| Guest | Ana Sayfa | İlanlar | Harita | Mesajlar | Giriş |
| Kurye | Dashboard | Fırsatlar | Eşleşmeler | Mesajlar | Profil |
| İşletme | Dashboard | Talepler | Eşleşmeler | Mesajlar | İşletme |
| Firma | Dashboard | Havuz | İlanlar | Mesajlar | Firma |

**States:**
- `Default` — Icon stroke `--kb-text-2`, label `--kb-text-3`, 0.55rem
- `Active (.is-active)` — Icon stroke `--kb-blue-400`, label `--kb-blue-400`, top 3px gradient bar
- `Badge` — Red circle `--kb-error`, min-width 18px, positioned top-right of icon (message count)
- `Tap` — `kb-bounce-soft` on icon SVG

**Behavior:** Rendered by `components.js` into `document.body` after DOM load. Badge IDs: `bnavMsgBadge`. Only visible at `max-width: 680px`. Body gets `.has-bottom-nav` class; main content gets `padding-bottom: calc(64px + safe-area-bottom + 16px)`.

---

#### `SidebarNavigation`
**File:** `assets/js/components.js` → `buildSidebarItems()` · **CSS:** `assets/css/sidebar.css`

Desktop navigation for authenticated inner pages. Dynamically injected via `renderHeader()` when current page is not landing or auth-flow.

**Structure:** `<aside class="sidebar">` with `.sidebar__head` (logo), `.sidebar__nav` (items), `.sidebar__footer` (collapse button).

**States:**
- `Default` — `.sidebar__item`: icon + label
- `Active` — `.is-active`: highlighted with accent color
- `Collapsed` — `.is-collapsed` on `<aside>`: icons only, labels hidden (saved to `localStorage.kb_sidebar_collapsed`)
- `Mobile Open` — `.is-mobile-open`: slides in from left, overlay shown

**Items order:** Dashboard → Kuryeler → İşletmeler → Firmalar → İlanlar → Harita → Havuzum → (Admin — hidden unless admin) → Ayarlar

---

#### `MobileAppBar`
**File:** `assets/js/components.js` → `renderMobileAppBar()` · **CSS:** `assets/css/mobile-ux.css`

Shown on non-panel, non-landing, non-auth pages at `max-width: 680px`.

**Structure:** Logo | Page Title | Notification Bell + Badge | Avatar Link

**States:**
- `Default` — Logo + title centered, actions right
- `Authed` — Shows avatar initials, notification badge
- `Guest` — Shows generic icon

---

#### `DashboardAppBar` (mob-dash__header)
**File:** `panel-kurye.html`, `panel-isletme.html`, `panel-firma.html` · **CSS:** `mobile-screens.css`

Panel-specific header. Not injected by components.js — defined inline in each panel HTML.

**Structure:** Avatar | Greeting + Name | Notification Bell Button

**Avatar variants:**
- Kurye: `--kb-grad-diag` (blue diagonal gradient)
- Firma: `linear-gradient(135deg, #1e3a8a, #2563eb)` (deep blue)
- İşletme: `linear-gradient(135deg, #1e40af, #3b82f6)` (medium blue)

---

### 2.2 Card Components

#### `CardOpportunity` (mob-opp-row)
**Usage:** Courier dashboard — fırsat/ilan listesi

**Structure:** Status badge | Title | Company name | Location chip | Pay chip | Distance chip | Apply button

**States:**
- `Default` — `--kb-surface-2` background
- `Pressed (:active)` — `scale(0.97)`, `box-shadow: none`
- `Applied` — Border `--kb-success-bd`, `.is-success-state` flash animation
- `Featured` — `.kb-card-v2--featured` blue gradient tint

---

#### `CardMatch` (talent-card)
**Usage:** Pool listings (kuryeler, isletmeler, firmalar), eşleşme.html

**Structure:** Avatar | Name | Level badge | Location | Stats row | Pool star | Offer/View button

**States:**
- `Default` — Card elevation none
- `Hover (hover: hover media)` — `translateY(-2px)`, `box-shadow: --kb-shadow-md`
- `Active (:active)` — `scale(0.97)`
- `In Pool (pool-star.is-on)` — Star filled ★

---

#### `CardKPI` (kb-kpi-card)
**Usage:** Panel dashboards — metric display

**Structure:** Icon (colored) | Value (large) | Label | Trend indicator

**Icon color variants:**
- `.kb-kpi-card__icon` (default) — blue dim background + blue icon
- `.kb-kpi-card__icon--success` — green dim + green icon
- `.kb-kpi-card__icon--warning` — amber dim + amber icon
- `.kb-kpi-card__icon--error` — red dim + red icon

**Trend variants:** `.kb-kpi-card__trend--up` (green) · `--down` (red) · `--flat` (gray)

---

#### `CardStatChip` (mob-stat-chip / kb-stat-chip)
**Usage:** Dashboard stat rows — 4-column grid

**Structure:** Value (large, display font) | Label (uppercase, tiny)

**States:**
- `Default` — `--kb-surface-2`, `--kb-border`
- `Pressed (:active)` — `border-color: --kb-blue-500`, `background: --kb-info-dim`

---

#### `CardNotification` (nrow)
**Usage:** `bildirimler.html`

**Structure:** Icon | Type badge | Title + time | Unread dot | Swipe-to-dismiss handle

**States:**
- `Default` — Standard surface
- `Unread (.is-unread)` — Left border accent, slightly elevated
- `New (.is-new)` — `kb-notif-in` slide-in animation
- `Read transition (.is-read)` — Slow fade, opacity transition
- `Pressed (:active)` — `scale(0.97)`

**Unread dot:** `.nrow__dot` — pulses with `kb-pulse-ring`

---

#### `CardMessage` (msg-conv)
**Usage:** `mesajlar.html` — conversation list

**Structure:** Avatar | Name + time | Last message | Unread badge count

**States:**
- `Default` — Transparent background
- `Hover` — `rgba(255,255,255,0.04)`
- `Active (selected)` — `.is-active`: `rgba(59,130,246,0.10)`
- `Unread (.msg-conv--unread)` — Name weight 800, time color blue, bold

---

#### `CardBaseV2` (kb-card-v2)
**Usage:** Generic premium card container

**Modifiers:**
- `kb-card-v2--active` — Blue border + blue shadow
- `kb-card-v2--success` — Green border + green tinted bg
- `kb-card-v2--warning` — Amber border + amber tinted bg
- `kb-card-v2--featured` — Blue border + blue gradient tint + glow

---

### 2.3 Button Components

#### `ButtonPrimary` (kb-btn / btn--primary)
- Height: `44px` (`--kb-touch`)
- Background: `--kb-grad` (blue gradient)
- Color: `--kb-text-inv` (#0a0a0a)
- Border-radius: `--kb-r-sm` (12px)
- Font: 0.9375rem, weight 600

**States:**
- `Default` — Gradient background
- `Hover` — `opacity: 0.92`
- `Pressed (:active)` — `scale(0.96)`, `opacity: 0.88`
- `Loading (.btn--loading)` — Spinner pseudo-element right side, `opacity: 0.7`, `pointer-events: none`
- `Success (.is-success)` — `kb-pop` animation
- `Disabled` — `opacity: 0.4`, `pointer-events: none`

#### `ButtonSecondary` (kb-btn--ghost / btn--ghost)
- Height: `44px`
- Background: `transparent`
- Border: `1px solid --kb-border-2`
- Color: `--kb-text-1`

**States:** Same as Primary except background stays transparent on hover (border emphasizes).

#### `ButtonDestructive` (kb-btn--danger)
- Background: `--kb-error-dim`
- Border: `1px solid --kb-error-bd`
- Color: `--kb-error`

#### `ButtonSmall` (kb-btn--sm)
- Height: `36px`
- Padding: `0 16px`
- Font: 0.8125rem

#### `ButtonIcon` (mob-dash__notif-btn / topbar__icon-btn)
- Width/Height: `44px–46px`
- Border-radius: `--kb-r-sm`
- Background: `--kb-surface-2`
- Border: `1px solid --kb-border`

**States:**
- `Default` — Surface background
- `Pressed (:active)` — `border-color: --kb-blue-500`, `color: --kb-blue-400`

---

### 2.4 Badge & Status Components

#### `BadgeLevel` (mob-level-chip / .level)
**Variants:**
- `Standart` — Default: `--kb-surface-2` bg, `--kb-text-3` text
- `Profesyonel (.mob-level-chip--pro)` — Green: `--kb-success` text, `--kb-success-dim` bg
- `Premium (.mob-level-chip--premium)` — Amber: `--kb-warning` text, `--kb-warning-dim` bg
- `Verified (.mob-level-chip--verified)` — Blue: `--kb-blue-400` text, `--kb-info-dim` bg

**Size:** 0.6rem, weight 700, border-radius `--kb-r-full`, padding `3px 10px`

#### `BadgeVerified` (.dogrulama / vbadge)
Verification status indicator. Values: `none` · `pending` · `verified` · `rejected`
- `verified` — Green badge/icon
- `pending` — Amber badge/icon
- `rejected` — Red badge/icon

**On profile screen:** Hover → `scale(1.1) translateY(-2px)`, shadow elevation

#### `BadgeCount` (badge-count / mob-app-bar__badge)
Unread count. Red circle, white text, min-width 18px, weight 700, 0.68rem.
Hidden via `style="display:none"` when count is 0. Shows "99+" when count > 99.

---

### 2.5 Avatar Components

#### `AvatarProfile` (mob-dash__avatar / prf-avatar)
Dashboard avatar: 56×56px, `--kb-r-md`, gradient background (role-specific).
Profile avatar: larger (up to 88px), `--kb-r-lg`.

**Fallback:** Initials (first 2 words, uppercase) via `KB.initials(name)`.
**Image:** `<img class="avatar__img">` with `onerror="this.remove()"` fallback.

**Hover (prf-avatar):** `scale(1.04) translateY(-2px)`, `--kb-shadow-xl`

#### `AvatarConversation` (msg-conv__av / msg-conv__av--ph)
- Size: 44×44px
- With photo: `<img>` objectfit cover
- Placeholder: Initials on `--kb-grad-diag` gradient background

---

### 2.6 Input Components

#### `InputText`
**States:**
- `Default` — `rgba(255,255,255,0.05)` bg, `1px solid --kb-border`, border-radius `--kb-r-xs`
- `Focus` — `border-color: --kb-blue-500`, `box-shadow: 0 0 0 3px rgba(59,130,246,0.18)`, no outline
- `Error (.is-error)` — `border-color: --kb-error`, `kb-shake` animation
- `Disabled` — `opacity: 0.4`, `pointer-events: none`

#### `InputSearch` (msg-search input / topbar__search-input)
- Border-radius: `9999px` (pill shape)
- Padding: `8px 12px 8px 32px` (icon space left)
- Placeholder icon: absolute positioned SVG

#### `InputCompose` (msg-compose input)
- Border-radius: `9999px`
- Focus: `border-color: --kb-blue-500`, `box-shadow: 0 0 0 3px rgba(59,130,246,0.15)`

#### `SelectField`
Same transition behavior as InputText. Focus ring identical.

#### `ToggleSwitch` (.settings-toggle)
- Track: `transition: background-color 250ms`
- Thumb: `transition: transform 250ms spring, box-shadow 150ms`

---

### 2.7 Message Bubble Components

#### `MessageBubbleOutgoing` (msg-bubble--mine)
- Align: `flex-end`
- Background: `--kb-grad-diag`
- Color: `#fff`
- Border-radius: `16px 16px 4px 16px` (bottom-right corner cut)
- Max-width: 72%
- Enter animation: `kb-msg-mine` (slide from right, spring)
- Transform-origin: `bottom right`

#### `MessageBubbleIncoming` (msg-bubble)
- Align: `flex-start`
- Background: `rgba(255,255,255,0.06)`
- Border: `1px solid --kb-border`
- Color: `--kb-text-1`
- Border-radius: `16px 16px 16px 4px` (bottom-left corner cut)
- Max-width: 72%
- Enter animation: `kb-msg-theirs` (slide from left, spring)
- Transform-origin: `bottom left`

#### `MessageTimestamp` (msg-bubble__t)
- `display: block`, `font-size: 0.64rem`, `opacity: 0.6`, `text-align: right`

#### `MessageSendButton` (msg-send-btn)
- 40×40px circle
- Background: `--kb-grad-diag`
- Active: `scale(0.88) rotate(-5deg)`

#### `TypingIndicator` (kb-typing-dots)
- 3 dots, 6×6px each, `--kb-text-3` color
- `kb-typing-bounce` animation, staggered 0.2s delays

---

### 2.8 Bottom Sheet Component

#### `BottomSheet` (kb-bottom-sheet / .kb-filter-sheet)
**Structure:** Overlay → Sheet container → Handle → Content → Footer CTA

**CSS:**
- `transform: translateY(100%)` (closed)
- `transition: transform 250ms --kb-ease-out` (close)
- `.is-open: transform: translateY(0)`, `transition: 250ms --kb-ease-spring` (open, spring)

**Handle:** 36×4px pill, `--kb-border-2` color
- Drag active: `.is-dragging` → handle becomes `--kb-blue-400` and widens to 52px

**Overlay:** `.kb-bottom-sheet-overlay` — `opacity: 0 → 1` on `.is-open`

**Drag-to-dismiss:** Drag > 80px → close. Uses `history.pushState` for back-button dismissal.

**Back button:** `popstate` event listener closes topmost open sheet.

**JS API:**
```js
sheet.classList.add('is-open');
overlay.classList.add('is-open');
document.dispatchEvent(new CustomEvent('kb:sheet:open', { detail: { id: sheet.id } }));
```

---

### 2.9 Loading & Skeleton Components

#### `SkeletonCard` (skel-card / mob-skel / kb-skel)
**CSS:** `linear-gradient(90deg, --kb-surface-2 25%, --kb-surface-3 50%, --kb-surface-2 75%)`, `background-size: 400px 100%`, `kb-shimmer-sweep 1.4s ease-in-out infinite`

#### `Spinner` (kb-spinner)
- Standard: `20×20px`, 2px border, `--kb-blue-500` top border, `kb-spin-motion 0.7s linear infinite`
- Small: `.kb-spinner--sm` → 14×14px, 1.5px border
- Large: `.kb-spinner--lg` → 28×28px, 3px border

#### `ButtonLoadingState`
`.btn--loading` → spinner pseudo-element (`::after`) positioned right side, `opacity: 0.7`, no pointer events.

---

### 2.10 Empty State Component

#### `EmptyState` (mob-empty / mob-empty-inline / kb-empty)
**Structure:** Icon/Illustration | Title | Description | CTA Button (optional)

**Standard elements:**
- `.mob-empty-inline` / `.kb-empty__ic` — Icon/emoji, `font-size: 2.4rem`
- `.kb-empty__t` — Title, `font-weight: 700`
- `.kb-empty__d` — Description, `--kb-text-2`, `0.88rem`, max-width 34ch

**Animations (staggered):**
- Container: `kb-page-enter`, `400ms`, 80ms delay
- Icon: `kb-pop`, `400ms`, 160ms delay
- CTA button: `kb-page-enter`, `250ms`, 360ms delay

**Usage contexts:**
- Mesaj listesi — "Henüz mesajınız yok"
- Bildirim listesi — "Henüz bildirimin yok"
- Havuzum — "Kayıtlı profilin yok"
- Fırsat listesi — "Uygun ilan bulunamadı"
- Eşleşme listesi — "Henüz eşleşme yok"

---

### 2.11 Feedback Components

#### `SuccessOverlay` (kb-success-overlay)
**JS:** `KBMotion.showSuccess(title, subtitle, duration)`

Full-screen backdrop blur overlay with centered card. Auto-dismisses after `duration` ms (default 2200ms). Tap to dismiss early.

- Overlay: `backdrop-filter: blur(4px)`, `animation: kb-fade-in 150ms`
- Card: `--kb-surface-2`, green border, `animation: kb-pop 400ms spring`
- Icon: Animated SVG checkmark (kb-draw animation on path)

#### `ErrorToast` (kb-error-toast)
**JS:** `KBMotion.showErrorToast(message, duration)`

Fixed bottom, above bottom nav: `bottom: calc(72px + safe-area-inset-bottom)`.
Red tinted, slide-up entry, auto-dismiss after duration (default 3200ms). `pointer-events: none`.

#### `FieldError` (kb-field-error)
**JS:** `KBMotion.showError(el, message)`

Inline below input. Red text, 0.75rem, `kb-tab-enter` animation. Cleared by `KBMotion.clearError(el)`.

#### `InAppNotification` (kb-inapp-notif)
**JS:** `KBMotion.showInAppNotif(title, subtitle, onTapCallback)`

Fixed top (below safe-area-top + 12px), full width with margins. `kb-banner-drop` entry animation. Auto-dismiss after 4200ms. Tap → `onTap()` callback + dismiss.

**States:**
- `Entering` — `kb-banner-drop`
- `Leaving (.is-leaving)` — `kb-banner-drop reverse`

---

### 2.12 Pull-to-Refresh Component

#### `PullToRefresh` (.kb-ptr)
**JS:** `KBMotion.initPTR(containerEl, refreshFn)`

Applied to `<main>` elements. Threshold: 68px pull. Max pull: 90px (resistance at 0.5 ratio).

**States:**
- `Default` — No indicator
- `Pulling (.is-pulling)` — Indicator appears (top: 14px, opacity: 1), arrow icon
- `Ready (.is-ready)` — Arrow rotates 180°
- `Refreshing (.is-refreshing)` — Arrow hidden, spinner shown, `refreshFn()` called

**Page-specific refresh functions** (from `motion.js`):
- `ilanlar` → `KBApp.renderListings()`
- `bildirimler` → `KBApp.renderNotifications()`
- `mesajlar` → `KBApp.renderMessages()`
- `panel-kurye/firma/isletme` → `KBApp.initPanel(role)`

---

### 2.13 Profile Components

#### `ProfileHeader` (prf-main header area)
**File:** `profil-kurye.html`, `profil-isletme.html`, `profil-firma.html`

**Structure:** Avatar (large) | Name | Level badge | Verification badge | Rating stars | Completed count | Pool button | Offer button

**Avatar:** Hover → `scale(1.04) translateY(-2px)`, `--kb-shadow-xl`

#### `ProfileScoreBar` (prf-score-bar)
Progress bar for profile completion.
- Container: `height: 4px`, border-radius `--kb-r-full`, `--kb-surface-3` bg
- Fill (`.prf-score-bar__fill`): `--kb-grad-h`, `animation: kb-score-fill 600ms ease-out 300ms both`

#### `ProfileStatCard` (prf-stat-card)
Grid of stat cards. Scroll-reveal via IntersectionObserver → `kb-page-enter` on viewport entry.

#### `RatingStars` (.stars)
5-star display. Full ★ / Empty ☆. Numeric value shown with 1 decimal: `4.9`. Text color `--kb-warning` for filled stars.

---

### 2.14 Filter Components

#### `FilterChipBar` (bildirimler.html category filters, ilanlar.html)
Horizontal scroll row of chips.

**Structure:** `<div class="filter-tabs">` containing `<button class="filter-tab">`

**States:**
- `Default` — `--kb-surface-2` bg, `--kb-border` border, `--kb-text-2` text
- `Active (.is-active)` — `--kb-info-dim` bg, `--kb-blue-400` text, `--kb-info-bd` border
- `Appear` — `kb-chip-appear` animation (staggered via `kb-delay-N` classes)

#### `FilterBottomSheet` (kb-filter-sheet)
**File:** `ilanlar.html`

Full filter UI in a bottom sheet. Sections: Araç tipi · Bölge · Seviye.

**Apply button:** `.kb-filter-sheet__apply` — Primary button, active state `scale(0.96) opacity(0.88)`

---

### 2.15 Utility Components

#### `CookieConsentBar` (.cookie-bar)
Rendered by `components.js` on first visit. Accept/Reject buttons. Stores decision in `localStorage.kb_cookie_ok`. Slides in via `.is-in` class.

#### `AccessibilityPanel` (.a11y / a11y-fab)
Floating button (♿) revealing panel with font scale (sm/md/lg) and contrast (normal/high) controls. Stored in `localStorage.kb_fontscale` and `localStorage.kb_contrast`.

#### `ScrollToTopButton` (.to-top)
Visible when `window.scrollY > 400`. Smooth scroll to top. Desktop only (hidden on mobile by bottom nav).

#### `WhatsAppFloat` (.wa-float)
Fixed bottom-right floating WhatsApp link. Shown on landing/content pages. Hidden on panel pages.

#### `LevelBadge` (.level)
Inline component generated by `KB.levelBadge(seviye)`.
- `level--standart`: icon `●`
- `level--profesyonel`: icon `◆`
- `level--premium`: icon `★`

---

## SECTION 3 — SCREEN INVENTORY

### 3.1 Courier (`kurye`) Screens

| Screen | File | Purpose | Key Components | Entry | Exits |
|--------|------|---------|----------------|-------|-------|
| **CourierDashboard** | `panel-kurye.html` | Main hub — stats, opportunities, messages | DashboardAppBar, StatChips(4), OpportunityList, MessagePreviewList, ProfileProgress | BottomNav.Home | Fırsatlar, Eşleşmeler, Mesajlar, Profil |
| **Opportunities** | `ilanlar.html` | Browse courier job listings | FilterChipBar, FilterBottomSheet, CardOpportunity list, PullToRefresh | BottomNav.Fırsatlar | CardOpportunity → Offer modal |
| **Matches** | `eslesme.html` | Mutual matches with businesses | CardMatch list, ExpandablePanel (Neden Bu Yetenek?), PullToRefresh | BottomNav.Eşleşmeler | Profile, Messages |
| **Messages** | `mesajlar.html` | Conversation list + thread view | CardMessage list, MessageSearch, MessageBubble (both types), TypingIndicator, MessageCompose | BottomNav.Mesajlar | Thread tap → thread view |
| **CourierProfile** | `profil-kurye.html?id=` | Public courier profile | ProfileHeader, RatingStars, BadgeVerified, BadgeLevel, SkillChips, ReferenceList, PoolButton, OfferButton | BottomNav.Profil, Match card tap | Offer modal, Havuzum |
| **EditProfile** | `profil-duzenle.html` | Edit own profile | Form sections (ProfileSection cards), AvatarUpload, VehicleSelect, RegionChips, SkillInput | TopNav.Profil → Edit | Dashboard |
| **Notifications** | `bildirimler.html` | Notification center | FilterChipBar (categories), CardNotification list, EmptyState | MobileAppBar bell | Linked entity |
| **Map** | `harita.html` | Nearby courier/business map | Google Maps, MarkerClusters, FilterPanel | BottomNav.Harita (guest) | Profile |
| **Havuzum** | `havuzum.html` | Saved profiles | Pool card list, EmptyState | Sidebar.Havuzum | Profile |
| **Settings** | `ayarlar.html` | Account settings, preferences | ToggleSwitch rows, A11ySection | Sidebar.Ayarlar | — |

---

### 3.2 Business (`isletme`) Screens

| Screen | File | Purpose | Key Components | Entry | Exits |
|--------|------|---------|----------------|-------|-------|
| **BusinessDashboard** | `panel-isletme.html` | Main hub — stats, courier needs, matches | DashboardAppBar, StatChips(4), CourierRequestList, MatchPreview | BottomNav.Home | Talepler, Eşleşmeler, Mesajlar |
| **Requests** | `ilanlar.html` | Post/browse courier requests | FilterBottomSheet, RequestCard list | BottomNav.Talepler | Request detail, Apply |
| **CourierPool** | `kuryeler.html` | Browse courier profiles | FilterBar, CardMatch, PoolStar, PullToRefresh | BottomNav.Eşleşmeler | Courier profile |
| **Messages** | `mesajlar.html` | Same as Courier Messages | (same) | BottomNav.Mesajlar | — |
| **BusinessProfile** | `profil-isletme.html?id=` | Public business profile | ProfileHeader, OpenJobCount, JobTypeChips, OfferButton | Pool card tap | Offer modal |
| **EditProfile** | `profil-duzenle.html` | Edit business profile | (same form, business fields) | — | — |
| **Notifications** | `bildirimler.html` | (same) | (same) | — | — |

---

### 3.3 Courier Company (`firma`) Screens

| Screen | File | Purpose | Key Components | Entry | Exits |
|--------|------|---------|----------------|-------|-------|
| **FirmaDashboard** | `panel-firma.html` | Main hub — workforce, contracts, performance | DashboardAppBar, StatChips(4), WorkforceList, PerformanceCard | BottomNav.Home | Havuz, İlanlar, Mesajlar |
| **CourierPool** | `kuryeler.html` | Browse couriers for hire | FilterBar, CardMatch, PoolStar | BottomNav.Havuz | Courier profile |
| **JobListings** | `ilanlar.html` | Post job listings | FilterBottomSheet, ListingCard | BottomNav.İlanlar | — |
| **Messages** | `mesajlar.html` | (same) | (same) | BottomNav.Mesajlar | — |
| **FirmaProfile** | `profil-firma.html?id=` | Public firm profile | ProfileHeader, CapacityInfo, ServiceChips, OfferButton | Pool card tap | Offer modal |
| **EditProfile** | `profil-duzenle.html` | Edit firm profile | (same form, firma fields) | — | — |
| **Notifications** | `bildirimler.html` | (same) | (same) | — | — |

---

### 3.4 Shared / Public Screens

| Screen | File | Purpose | Auth Required |
|--------|------|---------|---------------|
| **Landing** | `index.html` | Marketing homepage | No |
| **Login/Register** | `giris.html` | Auth entry: email/password + Google OAuth | No |
| **VerifyEmail** | `verify-email.html` | Post-signup email verification prompt | No |
| **ResetPassword** | `sifre-sifirla.html` | Password reset flow | No |
| **Onboarding** | `onboarding.html` | Role selection after first login | Yes (new user) |
| **Map** | `harita.html` | Public map view | No |
| **Listings** | `ilanlar.html` | Public job listings | No (offer requires auth) |
| **BusinessPool** | `isletmeler.html` | Browse businesses | No |
| **FirmaPool** | `firmalar.html` | Browse courier firms | No |
| **CourierPool** | `kuryeler.html` | Browse couriers | No |
| **Ilan Detail** | `ilan.html?id=` | Single listing detail | No |
| **Havuzum** | `havuzum.html` | Saved profiles | Yes |
| **Analytics** | `analitik.html` | Performance analytics | Yes |
| **Finance** | `finans.html` | Financial overview | Yes |
| **Security** | `guvenlik.html` | Account security | Yes |
| **Network** | `ag.html` | Professional network | Yes |
| **OpsMerkez** | `ops-merkez.html` | Operations center (firma) | Yes |
| **Teslimat** | `teslimat.html` | Delivery tracking | Yes |
| **Admin** | `admin.html` | Admin dashboard | Yes + admin role |
| **404** | `404.html` | Not found | No |
| **Legal** | `kvkk/gizlilik/sartlar/cerez.html` | Legal documents | No |

---

## SECTION 4 — INTERACTION DOCUMENTATION

### 4.1 Tap Actions

| Target | Action | Feedback |
|--------|--------|---------|
| BottomNav item | Navigate | `kb-bounce-soft` on icon |
| CardOpportunity | Open offer modal / navigate | `scale(0.97)` on `:active` |
| CardMatch | Navigate to profile | `scale(0.97)` on `:active` |
| CardNotification | Navigate to linked entity | `scale(0.97)` on `:active` |
| CardMessage (conv) | Open thread | `.is-active` state |
| MessageSendButton | Send message | `scale(0.88) rotate(-5deg)` |
| FilterChip | Toggle filter, refresh results | `kb-chip-appear` on appear |
| PoolStar | Add/remove from pool | Star fills/unfills |
| BadgeVerified | — (hover shows details on desktop) | `scale(1.1)` hover |
| SuccessOverlay | Dismiss overlay | Fade out |
| InAppNotification | `onTap()` callback + dismiss | `.is-leaving` animation |
| BackButton | — browser back | Sheet closes if open (popstate) |
| ButtonPrimary | Submit/action | `scale(0.96)`, loading state |

### 4.2 Long Press Actions
Not implemented in current system. Reserved for future pool add shortcut.

### 4.3 Swipe Actions

| Context | Gesture | Action |
|---------|---------|--------|
| Bottom Sheet handle | Swipe down > 80px | Dismiss sheet, dispatch `kb:sheet:close` |
| Message thread (mobile) | Back swipe | Returns to conversation list (`.msg-back` button shown) |

### 4.4 Pull-to-Refresh

Available on: `ilanlar`, `bildirimler`, `mesajlar`, `havuzum`, `harita`, `panel-kurye`, `panel-firma`, `panel-isletme`.

Threshold: 68px. Resistance: 0.5 (pull 136px to achieve 68px threshold). Max visual pull: 90px.

### 4.5 Page Transitions

**Exit:** Links intercepted by `initPageTransitions()`. `kb-page-leaving` class on body triggers `kb-page-exit` (80ms fade+up). Navigation fires after 140ms.

**Entry:** `main`, `.prf-main`, `.platform-main` — `kb-page-enter 400ms ease-out` on load.

**Exception:** Links with `data-no-trans` attribute skip transition. Same-domain links only (`//` hrefs are skipped).

### 4.6 Modal Behavior

Offer modal (`.offer-modal` or `.kb-bottom-sheet` variant):
- Opens via bottom sheet with `kb:sheet:open` event
- Back button closes (popstate)
- Overlay tap closes
- Form has draft preservation via `bindDraft()`

### 4.7 Bottom Sheet Behavior (Full Spec)

**Open sequence:**
1. Add `is-open` to sheet + overlay
2. Dispatch `kb:sheet:open` event with sheet `id`
3. `history.pushState` adds history entry

**Close sequence:**
1. Remove `is-open` from sheet + overlay
2. Dispatch `kb:sheet:close` event with sheet `id`

**Drag to close:**
1. Touch start on handle → capture `startY`, `sheet.style.transition = 'none'`
2. Touch move → `sheet.style.transform = translateY(${dy}px)`
3. Touch end → if `dy > 80px`: close; else: spring back (`sheet.style.transform = ''`)

---

## SECTION 5 — RESPONSIVE RULES

### Breakpoints

| Breakpoint | Width | Scope |
|------------|-------|-------|
| Small Phone | `≤ 390px` | Typography scale-down adjustments |
| Standard Phone | `≤ 640px` | Dashboard feed (tab nav hidden, all panels visible) |
| Standard Phone | `≤ 680px` | Bottom nav, touch targets, card overrides, messaging, filter bar |
| Desktop | `≥ 681px` | Sidebar shown, desktop toolbar filters, bottom nav hidden |

### Mobile-Specific Rules (≤680px)

- Bottom navigation appears (`renderBottomNav()`)
- Sidebar replaced by topbar hamburger + slide-in drawer
- Cards become full-width, reduced padding
- Page headers become compact app-bar style
- Map widget collapses from 600px → 180px
- Tab navigation inside dashboards hidden; all sections shown vertically
- Filter toolbar replaced by floating filter button + bottom sheet
- Touch targets enforce minimum 44px height

### Dashboard Layout (≤640px)

- `.mob-dash` = flex column, all content stacked vertically
- Stats: 4-column grid (`.mob-stats-row`)
- Sections: individual `.mob-section` cards
- Opportunity rows: full-width list items (`.mob-opp-row`)

### Tablet (≥681px)

- Sidebar navigation with collapse support
- Dashboard uses tab system (hidden on mobile)
- Cards in grid layouts
- Map widget at full height

---

## SECTION 6 — EMPTY STATE DOCUMENTATION

### Standard Empty State Structure
```html
<div class="mob-empty-inline">
  <span class="kb-empty__ic"><!-- emoji or SVG --></span>
  <p class="kb-empty__t">Primary message</p>
  <p class="kb-empty__d">Secondary description, max 34ch</p>
  <a href="..." class="kb-btn kb-btn--primary">CTA Text</a>
</div>
```

### Empty State Inventory

| Screen | Trigger | Icon | Title | Description | CTA |
|--------|---------|------|-------|-------------|-----|
| Messages — no conversations | No conversations | 💬 | "Henüz mesajınız yok" | "Kuryelere, işletmelere veya firmalara teklif göndererek sohbet başlatın." | None |
| Messages — select thread | No thread selected | — | "Bir sohbet seçin" | — | None |
| Notifications — empty | No notifications | 🔔 | "Henüz bildirimin yok" | Context message | None |
| Notifications — not logged in | Guest | 🔒 | Login prompt | — | "Giriş Yap" |
| Pool — no matches | No results | 🔍 | "Sonuç bulunamadı" | "Filtreleri değiştir." | None |
| Havuzum — empty | No saved | ⭐ | "Kayıtlı profilin yok" | "Havuza eklemek için profil kartlarındaki yıldıza bas." | None |
| Opportunities — none | No listings | 📋 | "Uygun ilan bulunamadı" | Filter change suggestion | None |
| Matches — none | No matches | ❤️ | "Henüz eşleşme yok" | — | None |

### Empty State Animation Timing
- Container visible at 80ms delay
- Icon pop at 160ms delay
- CTA button slides in at 360ms delay

---

## SECTION 7 — ERROR STATE DOCUMENTATION

### 7.1 Network Errors
**Treatment:** `KBMotion.showErrorToast("İnternet bağlantısı yok")` — fixed bottom toast, 3.2s auto-dismiss.
**Recovery:** Retry pull-to-refresh (visible indicator). No automatic retry.

### 7.2 Validation Errors
**Treatment:**
1. `KBMotion.showError(inputEl, "Hata mesajı")` — input gets `kb-shake` animation + red border + inline field error message below
2. Clear with `KBMotion.clearError(inputEl)` on correction

**Visual:** Input border → `--kb-error`, `kb-shake` 0.42s. Field error: 0.75rem red text, `kb-tab-enter` animation.

### 7.3 Server Errors
**Treatment:** `KBMotion.showErrorToast("Sunucu hatası. Lütfen tekrar deneyin.")` — toast notification.
**Recovery:** Pull-to-refresh CTA or retry button (context-specific).

### 7.4 Auth Errors (401/403)
**Treatment:** Redirect to `giris.html`. `runSessionGuard()` handles this automatically for protected pages.
**Recovery:** Re-login flow.

### 7.5 Permission Errors
**Treatment:** Page-level auth check. If `!KB.isAuthed()` on protected page → redirect to `giris.html`.

### 7.6 Form Submission States
| State | Visual |
|-------|--------|
| Submitting | Button → `.btn--loading` (spinner, opacity 0.7) |
| Success | Button → `.is-success` (kb-pop), then `KBMotion.showSuccess()` overlay |
| Failure | Button restores, `KBMotion.showError()` or `showErrorToast()` |

---

## SECTION 8 — LOADING STATE DOCUMENTATION

### 8.1 Initial Page Load
Skeleton cards rendered by `skeletonCards(n)` while Supabase data fetches.
- `n` cards (default 6) of `.skel-card` structure
- Each card has avatar skeleton + 2 line skeletons + chip skeleton
- Replaced by real content on data arrival

### 8.2 Skeleton Structure
```html
<div class="skel-card">
  <div class="skel-card__top">
    <span class="skel skel--ava"></span>
    <span style="flex:1">
      <span class="skel skel--line" style="width:62%"></span>
      <span class="skel skel--line" style="width:40%;margin-top:8px"></span>
    </span>
  </div>
  <span class="skel skel--line" style="width:90%;margin-top:14px"></span>
  <span class="skel skel--chips" style="margin-top:14px"></span>
</div>
```

### 8.3 Progressive Loading
- Session auth check: `KB.ready()` Promise — resolves when Supabase session checked
- Auth area shows `<span class="user-chip">…</span>` placeholder while waiting
- Notification + message badge counts load after session ready

### 8.4 Pull-to-Refresh State
Spinner shown in PTR indicator while `refreshFn()` Promise is pending. Minimum 800ms display if refresh resolves faster (UX continuity).

### 8.5 Content Loaded Transition
`kb-content-loaded` class added via IntersectionObserver — triggers `kb-page-enter` animation when section enters viewport. `kb-anim-done` added 800ms after to clean up `will-change`.

---

## SECTION 9 — ACCESSIBILITY DOCUMENTATION

### 9.1 Touch Targets
| Element | Minimum Size | Token |
|---------|-------------|-------|
| Standard button | 44×44px | `--kb-touch` |
| Primary CTA | 52px height | `--kb-touch-lg` |
| Bottom nav items | 44px height | `--kb-touch` |
| Icon buttons | 44×44px | `--kb-touch` |
| Form inputs | 44px height | `--kb-touch` |

### 9.2 Contrast Ratios
| Element | Colors | Ratio (approx) |
|---------|--------|----------------|
| Primary text | `#f8fafc` on `#0a0a0a` | ~17:1 ✅ |
| Secondary text | `#94a3b8` on `#0a0a0a` | ~7:1 ✅ |
| Tertiary text | `#64748b` on `#0a0a0a` | ~4.5:1 ✅ |
| Blue on dark | `#60a5fa` on `#0a0a0a` | ~8:1 ✅ |
| White on blue gradient | `#ffffff` on `#2563eb` | ~5:1 ✅ |
| High contrast mode | Enabled via `KB.setContrast(true)` | Enhanced |

### 9.3 High Contrast Mode
`document.documentElement.classList.toggle('high-contrast', true)`. Stored in `localStorage.kb_contrast`.

### 9.4 Font Scaling
Three scales: `sm` / `md` (default) / `lg`. Applied via `data-fontscale` attribute on `<html>`. Stored in `localStorage.kb_fontscale`. Users access via floating ♿ panel.

### 9.5 Focus Visibility
- All inputs: `outline: none` + custom `box-shadow: 0 0 0 3px rgba(59,130,246,0.18)` on focus
- Buttons: inherit browser focus visible where not overridden
- Sidebar items: standard focus outline

### 9.6 ARIA Attributes
| Component | ARIA |
|-----------|------|
| Sidebar | `aria-label="Kenar menüsü"` |
| Main nav | `aria-label="Ana menü"` |
| Bottom nav | `aria-label="Alt menü"` |
| Hamburger | `aria-expanded`, `aria-label` |
| Account menu | `aria-haspopup`, `aria-expanded` |
| Footer nav | `aria-label="Alt menü"` / `aria-label="Yasal"` |
| Notification bell | `aria-label="Bildirimler"` |
| Pool star | `aria-label="Havuza ekle/Eklendi"` |

### 9.7 Reduced Motion
`@media (prefers-reduced-motion: reduce)` in both `mobile-design-system.css` and `mobile-motion.css`:
- All `animation-duration: 0.01ms !important`
- All `transition-duration: 0.01ms !important`
- Skeleton shimmer: `animation: none`, static background
- PTR: skipped entirely

`prefersReduced` flag checked in `motion.js` before initializing: page transitions, card tap, scroll reveal, PTR, sheet drag all skipped.

### 9.8 Semantic HTML
- Page structure: `<header>` / `<main>` / `<nav>` / `<footer>` / `<aside>`
- Buttons: `<button type="button">` (not divs)
- Links: `<a href>` for navigation
- Forms: `<form>` with `<label>` associations
- Lists: `<ul>`/`<li>` where appropriate

---

## SECTION 10 — MOTION DOCUMENTATION

### 10.1 Motion Hierarchy

| Priority | Duration | Usage |
|----------|----------|-------|
| 1 — Instant feedback | 80ms | Tap highlight, color change |
| 2 — Fast UI response | 150ms | Button active, border change, badge |
| 3 — Standard transition | 250ms | Bottom sheet, tab content, field errors |
| 4 — Page-level | 400ms | Page enter, card entrance, empty state |
| 5 — Emphasis | 600ms | Badge reveal, score fill |
| 6 — Reveal | 800ms | Progress bars, onboarding |

### 10.2 Stagger Patterns

**Conversation list (messages):** `nth-child(1-8)`, step 40ms, max 280ms
**Notification list:** `nth-child(1-6)`, step 50ms, max 250ms
**Search suggestions:** `nth-child(1-5)`, step 30ms, max 120ms
**Utility delays:** `.kb-delay-1` through `.kb-delay-8` (50ms–500ms)

### 10.3 Interaction Feedback Requirements

| Interaction | Required Feedback |
|-------------|------------------|
| Any tap on interactive element | Visual state change within 80ms |
| Form submission | Loading spinner on button |
| Success action | Success overlay or toast |
| Error action | Error toast or field error |
| New notification | In-app banner drop |
| Message sent | `kb-msg-mine` animation |
| Message received | `kb-msg-theirs` animation |
| Badge earned | `kb-badge-reveal` |
| Progress update | `kb-score-fill` |
| Tab change | `kb-tab-enter` on new content |

### 10.4 Performance Safeguards

- `will-change: transform` applied only to bottom sheet, PTR content, bottom nav
- Cleaned up via `.kb-anim-done` class after transition ends
- `IntersectionObserver` for scroll reveals (not scroll event listener)
- All touch listeners use `{ passive: true }` except PTR touchmove (needs `preventDefault`)

---

## SECTION 11 — DEVELOPER HANDOFF REVIEW

### 11.1 Missing Elements
**None identified.** All approved screens have HTML implementations, CSS styling, and JS behavior.

### 11.2 Consistency Issues
None of severity. Minor notes:

- `mesajlar.html` has inline `<style>` block with page-specific CSS rather than `mobile-screens.css`. **Not a bug** — intentional isolation for complex chat layout. Developers should not extract to shared CSS without testing.
- Legacy color tokens (`--ds-cyan`, `--ds-blue`, `--ds-violet`) are aliased to new Electric Blue system in `mobile-design-system.css`. Both token names remain valid.

### 11.3 Implementation Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| JS load order | High | Strict: i18n → Supabase CDN → supabase.js → data.js → components.js → app.js → motion.js |
| CSS cascade order | High | Strict: styles → talent → design-system → mobile-ux → mobile-design-system → mobile-screens → mobile-motion |
| `KB.ready()` race condition | Medium | Always `await KB.ready()` before Supabase calls in page scripts |
| Demo mode activation | Medium | If Supabase CDN fails, all data becomes mock. Test with network throttling. |
| Deep-link (Android) | Medium | `com.kuryemibul.app://callback` must be registered in AndroidManifest. `initNativeAuth()` handles token exchange. |
| `yayinda: false` profiles | Low | Profiles with `yayinda = false` excluded from pool queries. Handle in UI with appropriate empty state. |
| `profile_contacts` RLS | Low | Phone/email only accessible by profile owner or accepted-offer counterparty. Don't expose in public profile UI. |

### 11.4 Three-Role Consistency Verification ✅

All three roles share:
- Same design tokens
- Same component library
- Same interaction patterns
- Same CSS cascade
- Same motion system
- Same bottom navigation structure (only items differ)
- Same dashboard layout pattern (`mob-dash`)
- Same profile edit form (fields toggle by role)
- Same offer modal
- Same messaging system

Only content varies per role:
- Dashboard stats (4 chips, role-specific KPIs)
- Bottom nav tab destinations
- Dashboard section titles
- Profile field sets

---

## SECTION 12 — FINAL HANDOFF REPORT

### 12.1 Component Inventory Summary

| Category | Count | Status |
|----------|-------|--------|
| Navigation | 4 (BottomNav, Sidebar, MobileAppBar, DashboardAppBar) | ✅ Complete |
| Cards | 8 (Opportunity, Match, KPI, StatChip, Notification, Message, BaseV2, Pool) | ✅ Complete |
| Buttons | 5 variants (Primary, Secondary, Destructive, Small, Icon) | ✅ Complete |
| Badges | 4 (Level, Verified, Count, Status) | ✅ Complete |
| Avatars | 2 (Profile, Conversation) | ✅ Complete |
| Inputs | 4 (Text, Search, Compose, Select, Toggle) | ✅ Complete |
| Messages | 4 (BubbleOutgoing, BubbleIncoming, Timestamp, SendButton, TypingDots) | ✅ Complete |
| Bottom Sheet | 1 (with drag, overlay, back-button dismiss) | ✅ Complete |
| Loading | 3 (SkeletonCard, Spinner, PTR) | ✅ Complete |
| Empty States | 8 scenarios | ✅ Complete |
| Feedback | 4 (SuccessOverlay, ErrorToast, FieldError, InAppNotif) | ✅ Complete |
| Profile | 3 (Header, ScoreBar, StatCard) | ✅ Complete |
| Filters | 2 (ChipBar, BottomSheet) | ✅ Complete |
| Utility | 5 (CookieBar, A11yPanel, ScrollToTop, WhatsAppFloat, LevelBadge) | ✅ Complete |

**Total Components: 57 distinct components**

---

### 12.2 Screen Inventory Summary

| Role | Screens | Status |
|------|---------|--------|
| Courier | 10 | ✅ Complete |
| Business | 6 | ✅ Complete |
| Courier Company | 6 | ✅ Complete |
| Shared/Public | 20 | ✅ Complete |
| **Total** | **42** | **✅ Complete** |

---

### 12.3 Design Token Completeness

| Category | Tokens | Status |
|----------|--------|--------|
| Colors (brand) | 9 | ✅ |
| Colors (semantic) | 12 | ✅ |
| Colors (surface/dark) | 6 | ✅ |
| Colors (text) | 4 | ✅ |
| Colors (gradients) | 5 | ✅ |
| Colors (light theme) | 8 | ✅ |
| Spacing | 10 | ✅ |
| Border Radius | 7 | ✅ |
| Shadows | 6 | ✅ |
| Motion (duration) | 6 | ✅ |
| Motion (easing) | 5 | ✅ |
| Typography | 7 classes | ✅ |
| Touch Targets | 2 | ✅ |
| Mobile System | 3 | ✅ |

---

### 12.4 Accessibility Review

| Criterion | Status | Notes |
|-----------|--------|-------|
| Touch targets ≥ 44px | ✅ | `--kb-touch: 44px` enforced |
| Color contrast (dark) | ✅ | All major text pairs verified |
| High contrast mode | ✅ | Implemented via `high-contrast` class |
| Font scaling | ✅ | sm/md/lg via `data-fontscale` |
| Reduced motion | ✅ | `prefers-reduced-motion` honored |
| ARIA labels | ✅ | Nav, buttons, modals labeled |
| Focus management | ✅ | Custom focus rings, Escape key |
| Screen reader semantics | ✅ | Semantic HTML throughout |

---

### 12.5 Implementation Readiness Score

| Area | Score |
|------|-------|
| Design Token Completeness | 10/10 |
| Component Documentation | 10/10 |
| Screen Inventory | 10/10 |
| Interaction Specs | 9/10 |
| State Documentation | 10/10 |
| Accessibility | 9/10 |
| Motion Specs | 10/10 |
| Three-Role Consistency | 10/10 |
| **Overall** | **97/100** |

**-3 points:** Interaction long-press patterns (reserved but unspecified) and inline CSS in mesajlar.html not extracted to shared system.

---

### 12.6 Design System Compliance Score

| Area | Score |
|------|-------|
| Token usage (vs hardcoded values) | 9/10 |
| Component reuse (vs one-off elements) | 9/10 |
| Naming convention consistency | 9/10 |
| Motion system adherence | 10/10 |
| Responsive rules adherence | 10/10 |
| **Overall** | **94/100** |

**-6 points:** `mesajlar.html` inline styles, some hardcoded color values in older CSS sections, minor naming inconsistencies between `mob-` prefix (dashboard) and `kb-` prefix (design system v2).

---

### 12.7 Developer Quick Reference

**Adding a new page:**
1. Copy CSS link block from `panel-kurye.html` (lines 18–24)
2. Copy JS script block from `panel-kurye.html` (last 7 lines of body)
3. Add `<div id="app-header"></div>` at body start
4. Add `<div id="app-footer"></div>` at body end (unless panel page)
5. Call `KB.init("your-page.html")` in a `<script>` after the JS block

**Adding a new component state:**
- CSS: add modifier class to `mobile-screens.css` (last in cascade)
- Animation: add keyframe to `mobile-motion.css`, apply via CSS class
- Never add to `styles.css` or `design-system.css` (legacy files)

**All user-visible text must use** `KBI18N.t("key")` or `data-i18n="key"` attribute — never hardcode Turkish strings in JS (EN support required).

**Supabase data access pattern:**
```js
async function loadData() {
  if (window.KB && KB.ready) await KB.ready();
  if (online()) { try { return await SB.yourMethod(); } catch (e) {} }
  return KB_DATA.yourFallback; // offline/demo fallback always required
}
```

---

*This document is generated from the finalized KuryemiBul codebase as of 2026-06-17. All approved architecture, workflows, navigation, permissions, and database structure are documented as-implemented and must not be altered during frontend implementation.*
